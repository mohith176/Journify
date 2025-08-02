import Models from '../models/user.model.js';
import mongoose from 'mongoose';
const { UserChallengePool, Challenge,UserChallenge, User } = Models;

// Get full progress/gamification data for a user
export const getUserProgress = async (req, res) => {
  try {
    if (!req.user) {
        return res.status(401).json({ 
          message: 'Not authenticated. Please log in again.' 
        });
      }
    const userId = req.user._id; // Assuming you have authentication middleware

    // Get user data including streak information
    const user = await Models.User.findById(userId).select('streakData');
    
    // Get journal entries for this user
    const entries = await Models.JournalEntry.find({ user: userId }).sort({ createdAt: 1 });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate active months
    const activeMonths = calculateActiveMonths(entries);
    
     // Get journal dates for calendar heatmap
     const journalDates = entries.map(entry => {
        return {
          date: entry.createdAt,
          id: entry._id,
          wordCount: entry.wordCount || 0, // Include word count
          content: entry.content // Include content for length calculation fallback
        };
      });

    // Prepare response object
    const progressData = {
      entriesCount: entries.length,
      currentStreak: user.streakData.currentStreak,
      longestStreak: user.streakData.longestStreak,
      activeMonths: activeMonths,
      journalDates: journalDates
    };

    res.status(200).json(progressData);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ message: 'Server error while fetching progress data' });
  }
};

// Update streak data when a new journal entry is created
export const updateStreakData = async (userId) => {
  try {
    const user = await Models.User.findById(userId);
    if (!user) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastEntryDate = user.streakData.lastEntryDate ? new Date(user.streakData.lastEntryDate) : null;
    if (lastEntryDate) {
      lastEntryDate.setHours(0, 0, 0, 0);
    }

    let currentStreak = user.streakData.currentStreak;
    
    // If this is the first entry ever
    if (!lastEntryDate) {
      currentStreak = 1;
    } 
    // If there's an entry today already, don't increment
    else if (lastEntryDate.getTime() === today.getTime()) {
      // Streak stays the same
    } 
    // If the last entry was yesterday, increment streak
    else if ((today - lastEntryDate) / (1000 * 60 * 60 * 24) === 1) {
      currentStreak += 1;
    } 
    // If more than one day has passed, reset streak to 1
    else {
      currentStreak = 1;
    }

    // Update user streak data
    const updatedUser = await Models.User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'streakData.lastEntryDate': today,
          'streakData.currentStreak': currentStreak
        },
        $max: {
          'streakData.longestStreak': currentStreak
        }
      },
      { new: true }
    );

    return updatedUser.streakData;
  } catch (error) {
    console.error('Error updating streak data:', error);
    return false;
  }
};

// Helper function to calculate active months
const calculateActiveMonths = (entries) => {
  if (!entries.length) return 0;
  
  // Create a set of unique month+year combinations
  const activeMonthsSet = new Set();
  
  entries.forEach(entry => {
    const date = new Date(entry.createdAt);
    const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
    activeMonthsSet.add(monthYear);
  });
  
  return activeMonthsSet.size;
};

// // Get data for a specific achievement/badge
// export const getUserBadges = async (req, res) => {
//   try {
//     const userId = req.user._id;
    
//     const user = await Models.User.findById(userId).select('badges');
    
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }
    
//     res.status(200).json(user.badges);
//   } catch (error) {
//     console.error('Error fetching user badges:', error);
//     res.status(500).json({ message: 'Server error while fetching badges' });
//   }
// };


// Generate detailed streak history
export const getStreakHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get journal entries sorted by date
    const entries = await Models.JournalEntry.find({ user: userId })
      .select('createdAt')
      .sort({ createdAt: 1 });
    
    if (!entries.length) {
      return res.status(200).json({ streakHistory: [] });
    }
    
    // Generate calendar dates with activity status
    const firstDate = new Date(entries[0].createdAt);
    const today = new Date();
    
    // Create a map of dates with journal entries
    const entryDatesMap = new Map();
    entries.forEach(entry => {
      const dateStr = new Date(entry.createdAt).toISOString().split('T')[0];
      entryDatesMap.set(dateStr, true);
    });
    
    // Generate streak history data
    const streakHistory = [];
    let currentDate = new Date(firstDate);
    currentDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      streakHistory.push({
        date: dateStr,
        hasEntry: entryDatesMap.has(dateStr)
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    res.status(200).json({ streakHistory });
  } catch (error) {
    console.error('Error fetching streak history:', error);
    res.status(500).json({ message: 'Server error while fetching streak history' });
  }
};

