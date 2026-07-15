const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); 

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: 'uploads/' });

// Global variables to track progress for the frontend
let currentProgress = 0;
let currentStatus = '';

// Progress streaming endpoint
app.get('/api/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ progress: currentProgress, status: currentStatus })}\n\n`);
  }, 500);

  req.on('close', () => clearInterval(interval));
});

const applyQuality = (command, quality, isAudio) => {
  if (isAudio) return command; 
  switch (quality) {
    case 'low': return command.videoFilters('scale=-2:480');
    case 'medium': return command.videoFilters('scale=-2:720');
    case 'high': default: return command;
  }
};

app.post('/api/convert', upload.single('file'), async (req, res) => {
  const { format = 'mp4', quality = 'high', videoUrl } = req.body;
  
  let inputSource;
  let originalName = 'video';
  let isLink = false;
  const isAudio = format === 'mp3';

  currentProgress = 5;
  currentStatus = 'Initializing request...';

  try {
    if (req.file) {
      inputSource = req.file.path;
      originalName = req.file.originalname.split('.')[0];
      currentProgress = 20;
    } else if (videoUrl) {
      isLink = true;
      currentStatus = 'Extracting video from link (supporting all platforms)...';
      currentProgress = 15;
      
      originalName = `web_video_${Date.now()}`;
      inputSource = path.join(uploadDir, `temp_dl_${Date.now()}.mp4`);
      
      // Let yt-dlp handle ANY link (TikTok, X, YouTube, Reddit, etc.)
      await youtubedl(videoUrl, {
        output: inputSource,
        format: 'best',
      });
      
      currentProgress = 40;
    } else {
      return res.status(400).send('No file or link provided.');
    }

    currentStatus = 'Converting format & applying quality settings...';
    const outputFileName = `${originalName}_${quality}.${format}`;
    const outputFilePath = path.join(uploadDir, outputFileName);

    let conversion = ffmpeg(inputSource).toFormat(format);
    conversion = applyQuality(conversion, quality, isAudio);

    if (isAudio) {
      conversion.audioBitrate(quality === 'high' ? '320k' : quality === 'medium' ? '192k' : '128k');
    }

    // Track FFmpeg progress
    conversion.on('progress', (progress) => {
      if (progress.percent) {
        // Map FFmpeg's 0-100% to our 40-95% remaining progress bar
        currentProgress = 40 + (progress.percent * 0.55); 
      }
    });

    conversion
      .on('end', () => {
        currentProgress = 100;
        currentStatus = 'Finalizing file...';
        
        res.download(outputFilePath, outputFileName, (err) => {
          if (err) console.error("Download error:", err);
          if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          if (isLink && fs.existsSync(inputSource)) fs.unlinkSync(inputSource);
          if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
        });
      })
      .on('error', (err) => {
        console.error('FFmpeg Conversion Error:', err);
        currentStatus = 'Error during conversion!';
        if (!res.headersSent) res.status(500).send('Error processing conversion.');
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        if (isLink && fs.existsSync(inputSource)) fs.unlinkSync(inputSource);
        if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
      })
      .save(outputFilePath);

  } catch (err) {
    console.error('Extraction Error:', err);
    currentStatus = 'Failed to extract video from link.';
    if (!res.headersSent) res.status(500).send('An error occurred while fetching the video.');
    if (isLink && inputSource && fs.existsSync(inputSource)) fs.unlinkSync(inputSource);
  }
});

app.listen(port, () => {
  console.log(`Backend processing nodes on http://localhost:${port}`);
});