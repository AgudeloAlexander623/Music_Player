import express from 'express';
import {search} from '../controllers/search.controller.js';

const router = express.Router();

router.get("/", searchController);

export default router;