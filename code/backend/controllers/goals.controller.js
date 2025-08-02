import Models from '../models/user.model.js';
import mongoose from 'mongoose';

// Get all goals for a user
export const getUserGoals = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Optional type filter
    const { type } = req.query;
    
    const query = { user: userId };
    
    // Apply type filter if provided
    if (type && ['daily', 'normal'].includes(type)) {
      query.type = type;
    }
    
    const goals = await Models.Goal.find(query).sort({ createdAt: -1 });
    
    res.status(200).json(goals);
  } catch (error) {
    console.error('Error fetching user goals:', error);
    res.status(500).json({ message: 'Error fetching goals', error: error.message });
  }
};

// Get a specific goal by id
export const getGoalById = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      return res.status(400).json({ message: 'Invalid goal ID format' });
    }
    
    const goal = await Models.Goal.findOne({ _id: goalId, user: userId });
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    res.status(200).json(goal);
  } catch (error) {
    console.error('Error fetching goal details:', error);
    res.status(500).json({ message: 'Error fetching goal details', error: error.message });
  }
};

// Create a new goal
export const createGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, type, emoji, priority, details, deadline, status } = req.body;
    
    // Validate required fields
    if (!title || !type) {
      return res.status(400).json({ message: 'Goal title and type are required' });
    }
    
    if (!['daily', 'normal'].includes(type)) {
      return res.status(400).json({ message: 'Goal type must be either "daily" or "normal"' });
    }
    
    // Create new goal
    const newGoal = new Models.Goal({
      user: userId,
      title,
      type,
      emoji: emoji || '🎯', // Default emoji if none provided
      priority: priority || 'medium',
      status: status || 'not-started', // Use the frontend format consistently
      details: details || '',
      deadline: deadline ? new Date(deadline) : null,
    });
    
    await newGoal.save();
    
    res.status(201).json(newGoal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ message: 'Error creating goal', error: error.message });
  }
};

// Update goal
export const updateGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;
    const updateData = req.body;
    
    // Remove fields that shouldn't be directly updated
    delete updateData._id;
    delete updateData.user;
    delete updateData.createdAt;
    
    // Add lastUpdated timestamp
    updateData.lastUpdated = new Date();
    
    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      return res.status(400).json({ message: 'Invalid goal ID format' });
    }
    
    // Find and update the goal
    const updatedGoal = await Models.Goal.findOneAndUpdate(
      { _id: goalId, user: userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedGoal) {
      return res.status(404).json({ message: 'Goal not found or you do not have permission to update it' });
    }
    
    res.status(200).json(updatedGoal);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ message: 'Error updating goal', error: error.message });
  }
};

// Delete goal
export const deleteGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      return res.status(400).json({ message: 'Invalid goal ID format' });
    }
    
    const deletedGoal = await Models.Goal.findOneAndDelete({ _id: goalId, user: userId });
    
    if (!deletedGoal) {
      return res.status(404).json({ message: 'Goal not found or you do not have permission to delete it' });
    }
    
    res.status(200).json({ message: 'Goal deleted successfully', goalId });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ message: 'Error deleting goal', error: error.message });
  }
};

// Mark daily goal as completed for today
// export const markDailyGoalCompletion = async (req, res) => {
//   try {
//     const { goalId } = req.params;
//     const userId = req.user._id;
//     const { completed } = req.body;
    
//     if (!mongoose.Types.ObjectId.isValid(goalId)) {
//       return res.status(400).json({ message: 'Invalid goal ID format' });
//     }
    
//     // Get the goal
//     const goal = await Models.Goal.findOne({ _id: goalId, user: userId, type: 'daily' });
    
//     if (!goal) {
//       return res.status(404).json({ message: 'Daily goal not found' });
//     }
    
//     // Get today's date (without time)
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
    
//     // Check if already marked for today
//     const todayEntry = goal.completionHistory.find(entry => {
//       const entryDate = new Date(entry.date);
//       entryDate.setHours(0, 0, 0, 0);
//       return entryDate.getTime() === today.getTime();
//     });
    
//     let updatedGoal;
    
//     if (todayEntry) {
//       // Update existing entry
//       updatedGoal = await Models.Goal.findOneAndUpdate(
//         { 
//           _id: goalId,
//           'completionHistory.date': { $gte: today, $lt: new Date(today.getTime() + 24*60*60*1000) }
//         },
//         { 
//           $set: { 'completionHistory.$.completed': !!completed }
//         },
//         { new: true }
//       );
//     } else {
//       // Add new entry for today
//       updatedGoal = await Models.Goal.findByIdAndUpdate(
//         goalId,
//         { 
//           $push: { 
//             completionHistory: {
//               date: today,
//               completed: !!completed
//             }
//           }
//         },
//         { new: true }
//       );
//     }
    
//     // Update streak if needed
//     if (completed) {
//       // Calculate streak
//       const sortedHistory = [...updatedGoal.completionHistory]
//         .sort((a, b) => new Date(b.date) - new Date(a.date));
      
//       let currentStreak = 0;
//       let previousDate = null;
      
//       for (const entry of sortedHistory) {
//         if (!entry.completed) break;
        
//         const entryDate = new Date(entry.date);
//         entryDate.setHours(0, 0, 0, 0);
        
//         if (previousDate === null) {
//           // First completed entry
//           currentStreak = 1;
//           previousDate = entryDate;
//         } else {
//           // Check if this entry is the day before previous
//           const expectedPrevDate = new Date(entryDate);
//           expectedPrevDate.setDate(expectedPrevDate.getDate() + 1);
          
//           if (expectedPrevDate.getTime() === previousDate.getTime()) {
//             currentStreak++;
//             previousDate = entryDate;
//           } else {
//             break;
//           }
//         }
//       }
      
//       // Update the streak
//       updatedGoal = await Models.Goal.findByIdAndUpdate(
//         goalId,
//         { 
//           $set: { 'streak.current': currentStreak },
//           $max: { 'streak.best': currentStreak }
//         },
//         { new: true }
//       );
//     } else if (todayEntry && todayEntry.completed && !completed) {
//       // Marking as incomplete, reset current streak
//       updatedGoal = await Models.Goal.findByIdAndUpdate(
//         goalId,
//         { $set: { 'streak.current': 0 } },
//         { new: true }
//       );
//     }
    
//     res.status(200).json(updatedGoal);
//   } catch (error) {
//     console.error('Error marking daily goal completion:', error);
//     res.status(500).json({ message: 'Error updating goal completion', error: error.message });
//   }
// };
// Mark daily goal as completed for today
export const markDailyGoalCompletion = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;
    const { completed } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      return res.status(400).json({ message: 'Invalid goal ID format' });
    }
    
    // Get the goal
    const goal = await Models.Goal.findOne({ _id: goalId, user: userId, type: 'daily' });
    
    if (!goal) {
      return res.status(404).json({ message: 'Daily goal not found' });
    }
    
    // Get today's date (without time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if already marked for today
    const todayEntryIndex = goal.completionHistory.findIndex(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });
    
    let updatedGoal;
    
    if (todayEntryIndex !== -1) {
      // Update existing entry
      goal.completionHistory[todayEntryIndex].completed = !!completed;
      goal.markModified('completionHistory'); // Explicitly mark as modified
    } else {
      // Add new entry for today
      goal.completionHistory.push({
        date: today,
        completed: !!completed
      });
    }
    
    // Update streak if needed
    if (completed) {
      // Calculate streak
      const sortedHistory = [...goal.completionHistory]
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      let currentStreak = 0;
      let previousDate = null;
      
      for (const entry of sortedHistory) {
        if (!entry.completed) break;
        
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        
        if (previousDate === null) {
          // First completed entry
          currentStreak = 1;
          previousDate = entryDate;
        } else {
          // Check if this entry is the day before previous
          const expectedPrevDate = new Date(entryDate);
          expectedPrevDate.setDate(expectedPrevDate.getDate() + 1);
          
          if (expectedPrevDate.getTime() === previousDate.getTime()) {
            currentStreak++;
            previousDate = entryDate;
          } else {
            break;
          }
        }
      }
      
      // Update the streak
      goal.streak.current = currentStreak;
      if (currentStreak > goal.streak.best) {
        goal.streak.best = currentStreak;
      }
    } else if (todayEntryIndex !== -1 && goal.completionHistory[todayEntryIndex].completed && !completed) {
      // Marking as incomplete, reset current streak
      goal.streak.current = 0;
    }
    
    // Save the updated goal
    await goal.save();
    
    res.status(200).json(goal);
  } catch (error) {
    console.error('Error marking daily goal completion:', error);
    res.status(500).json({ message: 'Error updating goal completion', error: error.message });
  }
};

// Toggle active status for daily goals
export const toggleGoalActiveStatus = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user._id;
    const { active } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      return res.status(400).json({ message: 'Invalid goal ID format' });
    }
    
    // Find and update the goal
    const updatedGoal = await Models.Goal.findOneAndUpdate(
      { _id: goalId, user: userId },
      { $set: { active: !!active } },
      { new: true }
    );
    
    if (!updatedGoal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    res.status(200).json(updatedGoal);
  } catch (error) {
    console.error('Error toggling goal active status:', error);
    res.status(500).json({ message: 'Error updating goal status', error: error.message });
  }
};

// Get goals stats
export const getGoalsStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Count goals by type and status
    const stats = {
      total: await Models.Goal.countDocuments({ user: userId }),
      daily: {
        total: await Models.Goal.countDocuments({ user: userId, type: 'daily' }),
        active: await Models.Goal.countDocuments({ user: userId, type: 'daily', active: true }),
        completed: await Models.Goal.countDocuments({ 
          user: userId, 
          type: 'daily',
          status: 'completed'
        })
      },
      normal: {
        total: await Models.Goal.countDocuments({ user: userId, type: 'normal' }),
        not_started: await Models.Goal.countDocuments({ 
          user: userId, 
          type: 'normal', 
          status: 'not-started' 
        }),
        in_progress: await Models.Goal.countDocuments({ 
          user: userId, 
          type: 'normal', 
          status: 'in-progress' 
        }),
        completed: await Models.Goal.countDocuments({ 
          user: userId, 
          type: 'normal', 
          status: 'completed' 
        })
      }
    };
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting goals stats:', error);
    res.status(500).json({ message: 'Error fetching goals statistics', error: error.message });
  }
};