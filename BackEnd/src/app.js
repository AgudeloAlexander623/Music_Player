import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import searRoutes from "./routes/searchRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("api/search", searchRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
});