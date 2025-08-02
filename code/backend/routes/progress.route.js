import express from 'express';
import { 
  getUserProgress, getStreakHistory
} from '../controllers/progress.controller.js';
import { authenticateUser ,protect} from '../middleware/auth.middleware.js'; // Assuming you have auth middleware
import{
  getUserChallenges, 
  updateChallengeProgress,
  completeChallengeManually,
  refreshChallenges,
  getUserPoints,
  reviveStreak,
  completeChallenge
} from '../controllers/challenges.controller.js';
import { 
  getUserBadges,
  getRecentBadges,
  getBadgeDetails,
  createBadge
} from '../controllers/badges.controller.js';

const router = express.Router();
const debugRequest = (req, res, next) => {
    console.log('Progress API Request:');
    console.log('  URL:', req.url);
    console.log('  Method:', req.method);
    console.log('  Headers:', req.headers);
    next();
  };
  router.use(debugRequest);
// All routes require authentication
router.use(authenticateUser);

// Get user progress dashboard data
router.get('/', getUserProgress);


// Get detailed streak history for calendar heatmap
router.get('/streak-history', getStreakHistory);

router.post('/challenges/:challengeId/complete', completeChallenge);
router.get('/challenges',getUserChallenges);
router.put('/:challengeId/update',updateChallengeProgress);
router.post('/refresh', refreshChallenges);
router.get('/points', getUserPoints);
router.post('/revive-streak', reviveStreak);
// Badge endpoints
router.get('/badges', getUserBadges);
router.get('/badges/recent', getRecentBadges);
router.get('/badges/:badgeId', getBadgeDetails);

// Admin routes
router.post('/badges', createBadge); // Add admin middleware if it exists

export default router;