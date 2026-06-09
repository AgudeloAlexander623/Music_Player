import express from "express";
import {
  configureSpotify,
  getSpotifyStatus,
} from "../services/spotify.services.js";

const router = express.Router();

router.get("/status", (_req, res) => {
  const status = getSpotifyStatus();
  res.json(status);
});

router.post("/configure", async (req, res) => {
  const { clientId, clientSecret } = req.body;

  if (!clientId || !clientSecret) {
    return res
      .status(400)
      .json({ success: false, error: "clientId and clientSecret are required" });
  }

  try {
    const result = await configureSpotify(clientId, clientSecret);
    if (result.success) {
      return res.json({ success: true });
    }
    return res.status(400).json(result);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});

export default router;




// Jamendo API Example
const response = await fetch('https://developer.jamendo.com/v3.0/docs', {
  method: 'GET',
  headers: {
      'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);