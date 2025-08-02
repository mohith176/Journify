import express from 'express';
import { trackMood,getMoodHistory, getMoodDistribution } from '../controllers/mood.controller.js';

const router = express.Router();

// Track a new mood
router.post('/track', trackMood);

router.get('/:userId', getMoodHistory);

router.get('/track/:userId', getMoodDistribution);
// Get mood history for a user
// router.get('/:userId', getMoodHistory);

export default router;