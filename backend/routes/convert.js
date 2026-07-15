const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const { filename = 'video.mp4', format = 'mp4' } = req.body || {};

  res.json({
    message: 'Conversion request accepted',
    filename,
    format,
    status: 'queued'
  });
});

module.exports = router;
