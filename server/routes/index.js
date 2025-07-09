const express = require('express');
const router = express.Router();

// Ping endpoint for health checks
router.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// API status endpoint
router.get("/api/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
