
import express from 'express';
import {analyzeScore} from '../controllers/analyze.controller.js';

const router = express.Router();

// Search mood score
router.post('/:userId', analyzeScore);

export default router;
