const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

app.post("/api/convert", (req, res) => {
  const { url, format } = req.body || {};

  if (!url) {
    return res.status(400).json({ message: "Please provide a valid media URL." });
  }

  const platform = detectPlatform(url);
  const outputFormat = format === "mp3" ? "mp3" : "mp4";

  return res.json({
    message: `Download request received for ${platform}.`,
    platform,
    format: outputFormat,
    downloadUrl: `https://example.com/download?url=${encodeURIComponent(url)}&format=${outputFormat}`,
  });
});

function detectPlatform(url) {
  if (/youtube\.com|youtu\.be/i.test(url)) return "YouTube";
  if (/facebook\.com|fb\.watch/i.test(url)) return "Facebook";
  if (/instagram\.com/i.test(url)) return "Instagram";
  if (/tiktok\.com/i.test(url)) return "TikTok";
  return "Unknown platform";
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
