import React, { useState } from "react";
import "./App.css";

function App() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState("mp4");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("http://localhost:5000/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, format }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to start the download.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Smart media downloader</span>
          <h1 className="hero-title">Download videos and audio from your favorite social platforms.</h1>
          <p>
            Paste a link from YouTube, Facebook, Instagram, TikTok, and get a ready-to-download MP4 or MP3 file.
          </p>

          <div className="platform-pills">
            <span className="platform-pill">YouTube</span>
            <span className="platform-pill">Facebook</span>
            <span className="platform-pill">Instagram</span>
            <span className="platform-pill">TikTok</span>
          </div>
        </div>

        <form className="download-form" onSubmit={handleSubmit}>
          <input
            className="input"
            type="text"
            placeholder="Paste your link here"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />

          <select className="select" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="mp4">MP4 Video</option>
            <option value="mp3">MP3 Audio</option>
          </select>

          <button className="button" type="submit" disabled={loading}>
            {loading ? "Preparing download..." : "Download now"}
          </button>
        </form>
      </div>

      {result && (
        <div className="result-card">
          <h3>Download queued successfully</h3>
          <p>{result.message}</p>
          <p>Platform: {result.platform}</p>
          <p>Format: {result.format}</p>
          <a className="result-link" href={result.downloadUrl} target="_blank" rel="noreferrer">
            Open download link
          </a>
        </div>
      )}

      {error && (
        <div className="result-card">
          <h3>We could not start the download</h3>
          <p className="error">{error}</p>
        </div>
      )}
    </div>
  );
}

export default App;
