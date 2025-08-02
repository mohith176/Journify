import express from 'express';
import { 
  getUserGoals, 
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  markDailyGoalCompletion,
  toggleGoalActiveStatus,
  getGoalsStats
} from '../controllers/goals.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Get goals and statistics
router.get('/', getUserGoals);
router.get('/stats', getGoalsStats);
router.get('/:goalId', getGoalById);

// Create new goal
router.post('/', createGoal);

// Update and delete goals
router.put('/:goalId', updateGoal);
router.delete('/:goalId', deleteGoal);

// Special actions for daily goals
router.post('/:goalId/complete', markDailyGoalCompletion);
router.put('/:goalId/active', toggleGoalActiveStatus);

export default router;