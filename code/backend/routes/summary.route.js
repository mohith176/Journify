
import express from 'express';
import { getUserSummaries, searchSummaries, getLatestUserInsights} from '../controllers/summary.controller.js';

const router = express.Router();

// Get all summaries for a user
router.get('/:userId', getUserSummaries);

// Search summaries
router.get('/search/:userId', searchSummaries);

// Get latest insights for a user
router.get('/insights/:userId', getLatestUserInsights);


export default router;
