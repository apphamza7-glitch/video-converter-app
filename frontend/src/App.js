import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const isSupportedVideoUrl = (value) => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return false;

  try {
    const parsedUrl = new URL(trimmedValue);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return false;

    const hostname = parsedUrl.hostname.toLowerCase();
    const supportedHosts = ['youtube', 'youtu.be', 'twitter', 'x.com', 'tiktok', 'instagram', 'facebook', 'fb.watch', 'pinterest', 'pin.it'];

    return supportedHosts.some((host) => hostname.includes(host));
  } catch (error) {
    return false;
  }
};

function App() {
  const [sourceType, setSourceType] = useState('file');
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('high');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  
  const fileInputRef = useRef(null);
  const eventSourceRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('');
      setProgress(0);
    }
  };

  const listenToProgress = () => {
    // Open a connection to listen to backend progress broadcasts
    eventSourceRef.current = new EventSource('http://localhost:5000/api/progress');
    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.progress);
      if (data.status) setStatus(data.status);
    };
  };

  const handleConvert = async () => {
    if (sourceType === 'file' && !file) return setStatus('Please select a file.');
    if (sourceType === 'link' && !videoUrl.trim()) return setStatus('Please enter a link.');
    if (sourceType === 'link' && !isSupportedVideoUrl(videoUrl)) {
      return setStatus('Please enter a valid supported video link (YouTube, TikTok, X, Pinterest, etc.).');
    }

    setIsConverting(true);
    setProgress(0);
    setStatus('Connecting to server...');

    const formData = new FormData();
    formData.append('format', format);
    formData.append('quality', quality);

    if (sourceType === 'file') {
      formData.append('file', file);
    } else {
      formData.append('videoUrl', videoUrl.trim());
    }

    listenToProgress();

    try {
      const response = await fetch('http://localhost:5000/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Conversion failed');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const defaultName = sourceType === 'file' ? file.name.split('.')[0] : 'download';
      link.download = `${defaultName}_converted.${format}`;
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setProgress(100);
      setStatus('Complete! Check your downloads.');
    } catch (error) {
      console.error(error);
      setStatus('An error occurred during processing.');
    } finally {
      setIsConverting(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    }
  };

  // Cleanup EventSource when component unmounts
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  return (
    <div className="App">
      <h1>OmniConverter</h1>

      <div className="tabs">
        <button 
          className={`tab-btn ${sourceType === 'file' ? 'active' : ''}`}
          onClick={() => { setSourceType('file'); setStatus(''); setProgress(0); }}
          disabled={isConverting}
        >
          Local File
        </button>
        <button 
          className={`tab-btn ${sourceType === 'link' ? 'active' : ''}`}
          onClick={() => { setSourceType('link'); setStatus(''); setProgress(0); }}
          disabled={isConverting}
        >
          Web Link
        </button>
      </div>
      
      {sourceType === 'file' ? (
        <div className={`upload-area ${file ? 'has-file' : ''}`} onClick={() => !isConverting && fileInputRef.current.click()}>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" style={{ display: 'none' }} />
          {file ? <p>Ready: <strong>{file.name}</strong></p> : <p>Click to browse local files</p>}
        </div>
      ) : (
        <div className="url-input-container">
          <input 
            type="text" className="url-input"
            placeholder="Paste a link (TikTok, X, YouTube, Pinterest...)"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            disabled={isConverting}
          />
          <div className="platform-hints" aria-label="Supported platforms">
            <span>📌 Pinterest</span>
            <span>▶ YouTube</span>
            <span>▶ TikTok</span>
            <span>▶ X</span>
          </div>
        </div>
      )}

      <div className="row-controls">
        <select value={format} onChange={(e) => setFormat(e.target.value)} disabled={isConverting}>
          <option value="mp4">Format: MP4</option>
          <option value="mp3">Format: MP3</option>
          <option value="mkv">Format: MKV</option>
          <option value="avi">Format: AVI</option>
        </select>

        <select value={quality} onChange={(e) => setQuality(e.target.value)} disabled={isConverting}>
          <option value="high">Quality: High</option>
          <option value="medium">Quality: Medium</option>
          <option value="low">Quality: Low</option>
        </select>
      </div>

      <button className="convert-btn" onClick={handleConvert} disabled={isConverting || (sourceType === 'file' ? !file : !videoUrl.trim())}>
        {isConverting ? 'Processing...' : 'Start Conversion'}
      </button>

      {/* Real-time Progress Bar */}
      {(isConverting || progress > 0) && (
        <>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="status-text">{status} {Math.round(progress)}%</div>
        </>
      )}
    </div>
  );
}

export default App;