import express from 'express';
import { getWordCloudData } from '../controllers/insights.controller.js';

const router = express.Router();

// Get word cloud data for a user
router.get('/wordcloud/:userId', getWordCloudData);

export default router;