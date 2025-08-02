import Models from '../models/user.model.js';
import mongoose from 'mongoose';

// Get all badges for a user
export const getUserBadges = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all available badges to show both earned and locked badges
    const allBadges = await Models.Badge.find();
    
    // Find user's earned badges through UserBadge model - with null checks
    const userBadges = await Models.UserBadge.find({ user: userId }).populate('badge');
    
    // Format badge data for frontend - with safety checks
    const formattedBadges = userBadges
      .filter(userBadge => userBadge && userBadge.badge) // Filter out null badges
      .map(userBadge => ({
        id: userBadge.badge._id,
        name: userBadge.badge.name,
        description: userBadge.badge.description,
        icon: userBadge.badge.icon || '⭐', // Default icon if missing
        rarity: userBadge.badge.rarity || 'common', // Default rarity if missing
        achieved: true,
        achievedOn: userBadge.achievedOn || new Date(),
        progress: 100
      }));
    
    // Add locked badges (not yet achieved) - with safety checks
    const userBadgeIds = formattedBadges.map(badge => badge.id?.toString());
    
    const lockedBadges = await Promise.all(allBadges
      .filter(badge => badge && badge._id) // Filter out invalid badges
      .filter(badge => !userBadgeIds.includes(badge._id.toString()))
      .map(async badge => {
        // Get progress with a fallback to 0
        let progress = 0;
        try {
          progress = await calculateBadgeProgress(badge, userId) || 0;
        } catch (err) {
          console.error(`Error calculating progress for badge ${badge._id}:`, err);
        }
        
        return {
          id: badge._id,
          name: badge.name || 'Unknown Badge',
          description: badge.description || 'Mystery badge',
          icon: badge.icon || '❓',
          rarity: badge.rarity || 'common',
          achieved: false,
          progress: progress
        };
      }));
    
    const allUserBadges = [...formattedBadges, ...lockedBadges];
    
    res.status(200).json(allUserBadges);
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({ 
      message: 'Server error while fetching badges', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Calculate progress toward earning a badge
const calculateBadgeProgress = async (badge, userId) => {
  try {
    // Safety check for null badge
    if (!badge || !badge.criteria || !badge.criteria.type) {
      return 0;
    }
    
    const user = await Models.User.findById(userId);
    if (!user) return 0;
    
    const entries = await Models.JournalEntry.find({ user: userId });
    
    switch (badge.criteria.type) {
      case 'streak':
        // Current streak progress toward badge threshold
        return Math.min(100, Math.round((((user.streakData || {}).currentStreak || 0) / (badge.criteria.value || 1)) * 100)) || 0;
        
      case 'entryCount':
        // Entry count progress
        return Math.min(100, Math.round((entries.length / (badge.criteria.value || 1)) * 100)) || 0;
        
      case 'wordCount':
        // Total word count progress
        const totalWords = entries.reduce((sum, entry) => sum + (entry.wordCount || 0), 0);
        return Math.min(100, Math.round((totalWords / (badge.criteria.value || 1)) * 100)) || 0;
      
      case 'moodImprovement':
        // Complex calculation for mood improvement badges
        // Simplified placeholder implementation
        return 0; // Default to 0% progress instead of 30% for consistency
        
      case 'special':
        if (!badge.criteria.specialCondition) return 0;
        
        if (badge.criteria.specialCondition === 'firstEntry') {
          return entries.length > 0 ? 100 : 0;
        } else if (badge.criteria.specialCondition === 'nightOwl') {
          // Check if user has written entries late at night
          const nightEntries = entries.filter(entry => {
            const entryHour = new Date(entry.createdAt).getHours();
            return entryHour >= 22 || entryHour <= 4;
          });
          return Math.min(100, Math.round((nightEntries.length / 5) * 100)) || 0;
        } else if (badge.criteria.specialCondition === 'weeklyConsistency') {
          // Simplified implementation - default to 0 instead of 25
          return 0; 
        } else if (badge.criteria.specialCondition === 'earlyBird') {
          const earlyEntries = entries.filter(entry => {
            const entryHour = new Date(entry.createdAt).getHours();
            return entryHour >= 5 && entryHour <= 8;
          });
          return Math.min(100, Math.round((earlyEntries.length / 5) * 100)) || 0;
        } else if (badge.criteria.specialCondition === 'lunchBreak') {
          const lunchEntries = entries.filter(entry => {
            const entryHour = new Date(entry.createdAt).getHours();
            return entryHour >= 11 && entryHour <= 14;
          });
          return Math.min(100, Math.round((lunchEntries.length / 10) * 100)) || 0;
        } else if (badge.criteria.specialCondition === 'moodStreak') {
          // Would require checking mood entries for consecutive days
          return 0; // Changed from 20 to 0
        } else if (badge.criteria.specialCondition === 'emotionVariety') {
          // Would require analyzing emotion data
          return 0; // Changed from 40 to 0
        } else if (badge.criteria.specialCondition === 'longEntry') {
          const longEntries = entries.filter(entry => 
            (entry.wordCount || 0) >= (badge.criteria.value || 500)
          );
          return longEntries.length > 0 ? 100 : 0; // Changed from 50 to 0
        } else if (badge.criteria.specialCondition === 'weekendStreak') {
          // Would require checking weekend entries
          return 0; // Changed from 15 to 0
        } else if (badge.criteria.specialCondition === 'holidayWriter') {
          // Would require date checking against holidays
          return 0; // Changed from 10 to 0
        } else if (badge.criteria.specialCondition === 'newYearEntry') {
          const newYearEntries = entries.filter(entry => {
            if (!entry.createdAt) return false;
            const date = new Date(entry.createdAt);
            const month = date.getMonth();
            const day = date.getDate();
            return (month === 11 && day === 31) || (month === 0 && day === 1);
          });
          return newYearEntries.length > 0 ? 100 : 0;
        } else if (badge.criteria.specialCondition === 'accountAge') {
          if (!user.createdAt) return 0;
          const daysSinceCreation = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
          return Math.min(100, Math.round((daysSinceCreation / (badge.criteria.value || 30)) * 100)) || 0;
        }
        return 0;
      
      default:
        return 0;
    }
  } catch (error) {
    console.error('Error calculating badge progress:', error);
    return 0;
  }
};

// Check for new badges a user might have earned
export const checkAndAwardBadges = async (userId) => {
  try {
    const user = await Models.User.findById(userId);
    if (!user) return [];
    
    // Get all available badges
    const allBadges = await Models.Badge.find();
    if (!allBadges || allBadges.length === 0) {
      console.log('No badges found in database. Run seed script first.');
      return [];
    }
    
    // Get user's current badges from UserBadge model
    const userBadges = await Models.UserBadge.find({ user: userId }).populate('badge');
    const userBadgeIds = userBadges
      .filter(ub => ub && ub.badge && ub.badge._id)  // Safety check
      .map(ub => ub.badge._id.toString());
    
    // Get all journal entries for this user
    const entries = await Models.JournalEntry.find({ user: userId });
    
    // For each badge the user doesn't have yet, check if they qualify
    const newlyEarnedBadges = [];
    
    for (const badge of allBadges) {
      // Skip if badge is invalid or user already has this badge
      if (!badge || !badge._id) continue;
      if (userBadgeIds.includes(badge._id.toString())) continue;
      
      let isEarned = false;
      
      // Skip if criteria is missing
      if (!badge.criteria || !badge.criteria.type) continue;
      
      // Check different badge criteria
      switch (badge.criteria.type) {
        case 'streak':
          // Check if user's streak meets or exceeds the required value
          isEarned = ((user.streakData || {}).currentStreak || 0) >= (badge.criteria.value || 1);
          break;
          
        case 'entryCount':
          // Check if user has enough journal entries
          isEarned = entries.length >= (badge.criteria.value || 1);
          break;
          
        case 'wordCount':
          // Check if user's total word count meets the threshold
          const totalWords = entries.reduce((sum, entry) => sum + (entry.wordCount || 0), 0);
          isEarned = totalWords >= (badge.criteria.value || 1);
          break;
          
        case 'moodImprovement':
          // Complex calculation for mood improvement - default to false
          isEarned = false;
          break;
          
        case 'special':
          // Special badges with custom conditions
          if (!badge.criteria.specialCondition) continue;
          
          if (badge.criteria.specialCondition === 'firstEntry' && entries.length > 0) {
            isEarned = true;
          } else if (badge.criteria.specialCondition === 'nightOwl') {
            // Check if user has written entries late at night
            const nightEntries = entries.filter(entry => {
              if (!entry.createdAt) return false;
              const entryHour = new Date(entry.createdAt).getHours();
              return entryHour >= 22 || entryHour <= 4;
            });
            isEarned = nightEntries.length >= 5;
          } else if (badge.criteria.specialCondition === 'earlyBird') {
            const earlyEntries = entries.filter(entry => {
              if (!entry.createdAt) return false;
              const entryHour = new Date(entry.createdAt).getHours();
              return entryHour >= 5 && entryHour <= 8;
            });
            isEarned = earlyEntries.length >= 5;
          } else if (badge.criteria.specialCondition === 'lunchBreak') {
            const lunchEntries = entries.filter(entry => {
              if (!entry.createdAt) return false;
              const entryHour = new Date(entry.createdAt).getHours();
              return entryHour >= 11 && entryHour <= 14;
            });
            isEarned = lunchEntries.length >= 10;
          } else if (badge.criteria.specialCondition === 'moodStreak') {
            // Not implemented - default to false
            isEarned = false;
          } else if (badge.criteria.specialCondition === 'emotionVariety') {
            // Not implemented - default to false
            isEarned = false;
          } else if (badge.criteria.specialCondition === 'longEntry') {
            const longEntries = entries.filter(entry => 
              (entry.wordCount || 0) >= (badge.criteria.value || 500)
            );
            isEarned = longEntries.length > 0;
          } else if (badge.criteria.specialCondition === 'weekendStreak') {
            // Not implemented - default to false
            isEarned = false;
          } else if (badge.criteria.specialCondition === 'holidayWriter') {
            // Not implemented - default to false
            isEarned = false;
          } else if (badge.criteria.specialCondition === 'newYearEntry') {
            const newYearEntries = entries.filter(entry => {
              if (!entry.createdAt) return false;
              const date = new Date(entry.createdAt);
              const month = date.getMonth();
              const day = date.getDate();
              return (month === 11 && day === 31) || (month === 0 && day === 1);
            });
            isEarned = newYearEntries.length > 0;
          } else if (badge.criteria.specialCondition === 'accountAge') {
            if (!user.createdAt) {
              isEarned = false;
              continue;
            }
            const daysSinceCreation = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
            isEarned = daysSinceCreation >= (badge.criteria.value || 30);
          } else {
            isEarned = false;
          }
          break;
          
        default:
          isEarned = false;
      }
      
      // If user earned the badge, add it to their profile using UserBadge model
      if (isEarned) {
        try {
          // Create new UserBadge record
          const newUserBadge = new Models.UserBadge({
            user: userId,
            badge: badge._id,
            achievedOn: new Date(),
            progress: 100
          });
          
          await newUserBadge.save();
          
          // Add badge ID to user's badges array if it's not already there
          if (!user.badges) user.badges = [];
          if (!user.badges.some(b => b && b.equals && b.equals(newUserBadge._id))) {
            user.badges.push(newUserBadge._id);
          }
          
          // Add to newly earned badges list
          newlyEarnedBadges.push({
            _id: badge._id,
            name: badge.name || 'Unknown Badge',
            description: badge.description || '',
            icon: badge.icon || '⭐',
            rarity: badge.rarity || 'common'
          });
        } catch (error) {
          console.error('Error while saving new badge:', error);
          // Continue with the next badge
        }
      }
    }
    
    // Save user if any badges were earned
    if (newlyEarnedBadges.length > 0) {
      await user.save();
    }
    
    return newlyEarnedBadges;
  } catch (error) {
    console.error('Error checking and awarding badges:', error);
    return [];
  }
};

// Get badge details by ID
export const getBadgeDetails = async (req, res) => {
  try {
    const { badgeId } = req.params;
    
    const badge = await Models.Badge.findById(badgeId);
    
    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }
    
    res.status(200).json(badge);
  } catch (error) {
    console.error('Error fetching badge details:', error);
    res.status(500).json({ message: 'Server error while fetching badge details' });
  }
};

// Get recently earned badges
export const getRecentBadges = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get badges earned in the last 30 days using the UserBadge model
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUserBadges = await Models.UserBadge.find({
      user: userId,
      achievedOn: { $gte: thirtyDaysAgo }
    }).populate('badge');
    
    // Add null checks
    const recentBadges = recentUserBadges
      .filter(userBadge => userBadge && userBadge.badge)
      .map(userBadge => ({
        id: userBadge.badge._id,
        name: userBadge.badge.name || 'Unknown Badge',
        description: userBadge.badge.description || '',
        icon: userBadge.badge.icon || '⭐',
        rarity: userBadge.badge.rarity || 'common',
        achievedOn: userBadge.achievedOn || new Date()
      }));
    
    res.status(200).json(recentBadges);
  } catch (error) {
    console.error('Error fetching recent badges:', error);
    res.status(500).json({ message: 'Server error while fetching recent badges' });
  }
};

// Admin function to create a new badge
export const createBadge = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
    }
    
    const { name, description, icon, criteria, rarity } = req.body;
    
    const newBadge = new Models.Badge({
      name,
      description,
      icon,
      criteria,
      rarity: rarity || 'common'
    });
    
    await newBadge.save();
    
    res.status(201).json(newBadge);
  } catch (error) {
    console.error('Error creating badge:', error);
    res.status(500).json({ message: 'Server error while creating badge' });
  }
};

// Get user's badge progress
export const getBadgeProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { badgeId } = req.params;
    
    // Find the badge
    const badge = await Models.Badge.findById(badgeId);
    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }
    
    // Calculate progress with a fallback to 0
    let progress = 0;
    try {
      progress = await calculateBadgeProgress(badge, userId) || 0;
    } catch (err) {
      console.error(`Error calculating progress for badge ${badgeId}:`, err);
    }
    
    res.status(200).json({
      badgeId,
      progress
    });
  } catch (error) {
    console.error('Error getting badge progress:', error);
    res.status(500).json({ message: 'Server error while getting badge progress' });
  }
};

// Get badges by category
export const getBadgesByCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.params;
    
    // Get all available badges of this category
    const badges = await Models.Badge.find({ 'criteria.type': category });
    
    // Get user's earned badges
    const userBadges = await Models.UserBadge.find({ user: userId }).populate('badge');
    
    // Add null checks
    const userBadgeIds = userBadges
      .filter(ub => ub && ub.badge && ub.badge._id)
      .map(ub => ub.badge._id.toString());
    
    // Format the response
    const formattedBadges = await Promise.all(badges
      .filter(badge => badge && badge._id) // Filter out invalid badges
      .map(async badge => {
        const isAchieved = userBadgeIds.includes(badge._id.toString());
        const userBadge = userBadges.find(ub => 
          ub && ub.badge && ub.badge._id && 
          ub.badge._id.toString() === badge._id.toString()
        );
        
        // Calculate progress with a fallback to 0
        let progress = 0;
        if (!isAchieved) {
          try {
            progress = await calculateBadgeProgress(badge, userId) || 0;
          } catch (err) {
            console.error(`Error calculating progress for badge ${badge._id}:`, err);
          }
        }
        
        return {
          id: badge._id,
          name: badge.name || 'Unknown Badge',
          description: badge.description || 'Mystery badge',
          icon: badge.icon || '❓',
          rarity: badge.rarity || 'common',
          achieved: isAchieved,
          achievedOn: userBadge?.achievedOn || null,
          progress: isAchieved ? 100 : progress
        };
      }));
    
    res.status(200).json(formattedBadges);
  } catch (error) {
    console.error('Error fetching category badges:', error);
    res.status(500).json({ message: 'Server error while fetching category badges' });
  }
};