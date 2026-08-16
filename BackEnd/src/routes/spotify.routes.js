import express from "express";
import {
  configureSpotify,
  getSpotifyStatus,
} from "../services/spotify.services.js";
import { validate, configureSpotifySchema } from "../utils/validation.js";

const router = express.Router();

router.get("/status", (_req, res) => {
  const status = getSpotifyStatus();
  res.json(status);
});

router.post("/configure", async (req, res) => {
  try {
    const { clientId, clientSecret } = validate(configureSpotifySchema, req.body);

    const result = await configureSpotify(clientId, clientSecret);
    if (result.success) {
      return res.json({ success: true });
    }
    return res.status(400).json(result);
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, error: error.message || "Invalid request" });
  }
});

export default router;