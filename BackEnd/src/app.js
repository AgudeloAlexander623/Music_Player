import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import searchRoutes from "./routes/search.routes.js";

dotenv.config();

// Validar variables de entorno críticas
if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
  console.error("Error: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required in .env");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/search", searchRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});