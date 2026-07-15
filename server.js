const express = require("express");
const app = express();

app.use(express.json());

// Simple test route
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Example API route
app.post("/api/convert", (req, res) => {
  const { url, format } = req.body;
  res.json({ message: `Received ${url} for conversion to ${format}` });
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
