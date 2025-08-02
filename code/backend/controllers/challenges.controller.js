import Models from '../models/user.model.js';
import mongoose from 'mongoose';
const { UserChallengePool, Challenge,UserChallenge, User } = Models;


export const getUserChallenges = async (req, res) => {
  try {
    console.log('Fetching user challenges...');
    const userId = req.user.id;
    
    // Check if user has assigned challenges
    let userPool = await UserChallengePool.findOne({ userId });
    
    // If no assigned challenges or it's time to refresh, assign new challenges
    if (!userPool || userPool.assignedChallenges.length < 5) {
      userPool = await assignRandomChallenges(userId);
      console.log('Assigned new challenges:', userPool.assignedChallenges);
    } else {
      // Check if challenges should be refreshed (e.g., after 1 days)
      const refreshInterval = 60 * 60 * 1000; // 1 day in milliseconds
      const lastRefreshed = new Date(userPool.lastRefreshed).getTime();
      const now = new Date().getTime();
      
      if (now - lastRefreshed > refreshInterval) {
        userPool = await assignRandomChallenges(userId);
      }
    }
    
    // Get the assigned challenge IDs
    const challengeIds = userPool.assignedChallenges.map(c => c.challengeId);
    
    // Find the full challenge details
    const challenges = await Challenge.find({
      _id: { $in: challengeIds }
    });
    
    // Find user progress for these challenges
    const userChallenges = await UserChallenge.find({
      userId,
      challengeId: { $in: challengeIds }
    });
    
    // Map user progress to challenges
    const challengesWithProgress = challenges.map(challenge => {
      const userProgress = userChallenges.find(
        uc => uc.challengeId.toString() === challenge._id.toString()
      ) || { current: 0, completed: false };
      
      return {
        id: challenge._id,
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        difficulty: challenge.difficulty,
        requirements: challenge.requirements,
        reward: challenge.reward,
        userProgress: {
          current: userProgress.current || 0,
          completed: userProgress.completed || false,
          completedDate: userProgress.completedDate
        }
      };
    });
    
    res.json(challengesWithProgress);
  } catch (error) {
    console.error('Error fetching user challenges:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add this function to your progress.controller.js
// export const resetChallenges = async (req, res) => {
//   try {
    
//     // Delete all existing challenges
//     await Models.Challenge.deleteMany({});
//     console.log("Deleted all existing challenges");
    
//     // Delete all user challenge progress references
//     await Models.UserChallenge.deleteMany({});
//     console.log("Deleted all user challenge progress");
    
//     // Delete all challenge pool assignments
//     await Models.UserChallengePool.deleteMany({});
//     console.log("Deleted all challenge pool assignments");
    
//     // Re-seed the challenges
//     await seedInitialChallenges();
    
//     res.json({
//       success: true,
//       message: 'All challenges have been reset and re-seeded with the new format'
//     });
//   } catch (error) {
//     console.error('Error resetting challenges:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error while resetting challenges'
//     });
//   }
// };
export const refreshChallenges = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user has a challenge pool
    const userPool = await UserChallengePool.findOne({ userId });
    
    if (!userPool) {
      // If no pool exists, create one with random challenges
      await assignRandomChallenges(userId);
      return res.json({ 
        success: true,
        message: 'New challenges assigned successfully' 
      });
    }
    
    // Check if an hour has passed since the last refresh
    const refreshInterval = 1000; // 1 hour in milliseconds
    const lastRefreshed = new Date(userPool.lastRefreshed).getTime();
    const now = new Date().getTime();
    const timeElapsed = now - lastRefreshed;
    
    if (timeElapsed > refreshInterval) {
      // Enough time has passed, refresh challenges
      await assignRandomChallenges(userId);
      return res.json({
        success: true,
        message: 'Challenges refreshed successfully'
      });
    } else {
      // Not enough time has passed
      const timeRemaining = refreshInterval - timeElapsed;
      const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
      
      return res.status(400).json({
        success: false,
        message: `You can only refresh after one hour from previous refresh. Please wait ${minutesRemaining} minute(s).`,
        timeRemaining: timeRemaining
      });
    }
  } catch (error) {
    console.error('Error refreshing challenges:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
// Example of how to use the variations
const selectDynamicChallenge = (challenge) => {
  // If the challenge has variations, randomly decide whether to use base or a variation
  if (challenge.variations && challenge.variations.length > 0 && Math.random() > 0.5) {
    // Select a random variation
    const variation = challenge.variations[Math.floor(Math.random() * challenge.variations.length)];
    
    // Create a new challenge object with the variation applied
    return {
      ...challenge,
      title: variation.title || challenge.title,
      description: variation.description || challenge.description,
      requirements: {
        ...challenge.requirements,
        target: variation.target || challenge.requirements.target,
        criteria: {
          ...challenge.requirements.criteria,
          ...(variation.criteria || {})
        }
      }
    };
  }
  
  // Return the base challenge unchanged
  return challenge;
};

// Fix the assignRandomChallenges helper function
const assignRandomChallenges = async (userId) => {
  try {
    // Get all active challenges
    let allChallenges = await Models.Challenge.find({ active: true });
    
    // If no challenges found in the database, seed the initial challenges
    if (!allChallenges || allChallenges.length === 0) {
      console.log('No challenges found in database, seeding initial challenges...');
      await seedInitialChallenges();
      allChallenges = await Models.Challenge.find({ active: true });
    }
    
    if (!allChallenges || allChallenges.length === 0) {
      console.error('Failed to seed or find challenges');
      return null;
    }
    
    // Get completed challenges for this user
    const completedChallenges = await Models.UserChallenge.find({
      userId,
      completed: true
    });
    
    const completedChallengeIds = completedChallenges.map(c => c.challengeId.toString());
    
    // Filter out completed challenges
    const availableChallenges = allChallenges.filter(
      challenge => !completedChallengeIds.includes(challenge._id.toString())
    );
    
    // If less than 5 available challenges, include some completed ones
    let candidateChallenges = availableChallenges.length >= 5 
      ? availableChallenges 
      : allChallenges;
    
    // Group challenges by difficulty
    const challengesByDifficulty = {
      easy: candidateChallenges.filter(c => c.difficulty === 'easy'),
      medium: candidateChallenges.filter(c => c.difficulty === 'medium'),
      hard: candidateChallenges.filter(c => c.difficulty === 'hard')
    };
    
    console.log('Challenge counts by difficulty:', {
      easy: challengesByDifficulty.easy.length,
      medium: challengesByDifficulty.medium.length,
      hard: challengesByDifficulty.hard.length
    });
    
    // Select challenges with a good distribution of difficulty
    let selectedChallenges = [];
    
    // Try to get 2 easy, 2 medium, 1 hard
    if (challengesByDifficulty.easy.length > 0) {
      selectedChallenges = selectedChallenges.concat(
        getRandomElements(challengesByDifficulty.easy, Math.min(2, challengesByDifficulty.easy.length))      );
    }
    
    if (challengesByDifficulty.medium.length > 0) {
      selectedChallenges = selectedChallenges.concat(
        getRandomElements(challengesByDifficulty.medium, Math.min(2, challengesByDifficulty.medium.length))      );
    }
    
    if (challengesByDifficulty.hard.length > 0) {
      selectedChallenges = selectedChallenges.concat(
        getRandomElements(challengesByDifficulty.hard, Math.min(1, challengesByDifficulty.hard.length))      );
    }
    
     // Fill up to 5 challenges with random ones if we don't have enough
     if (selectedChallenges.length < 5) {
      console.log(`Only selected ${selectedChallenges.length} challenges by difficulty, filling up to 5...`);
      
      // Get IDs of already selected challenges
      const selectedIds = selectedChallenges.map(c => c._id.toString());
      
      // Get remaining challenges that haven't been selected yet
      const remainingChallenges = candidateChallenges.filter(
        c => !selectedIds.includes(c._id.toString())
      );
      
      if (remainingChallenges.length > 0) {
        // Add remaining challenges up to 5 total
        selectedChallenges = selectedChallenges.concat(
          getRandomElements(remainingChallenges, Math.min(5 - selectedChallenges.length, remainingChallenges.length))
        );
      }
      
      // If we still don't have 5, allow duplicates from the full candidate pool
      while (selectedChallenges.length < 5 && candidateChallenges.length > 0) {
        const randomChallenge = candidateChallenges[Math.floor(Math.random() * candidateChallenges.length)];
        selectedChallenges.push(randomChallenge);
      }
    } else if (selectedChallenges.length > 5) {
      // If we have more than 5, trim down to exactly 5
      selectedChallenges = selectedChallenges.slice(0, 5);
    }
    
    console.log(`Selected ${selectedChallenges.length} challenges`);
    
    if (selectedChallenges.length === 0) {
      console.error('Failed to select any challenges');
      return null;
    }
    
    selectedChallenges = selectedChallenges.map(challenge => selectDynamicChallenge(challenge));

    // Then convert to the format needed for userPool
    const assignedChallenges = selectedChallenges.map(challenge => ({
      challengeId: challenge._id,
      variationIndex: challenge.variationIndex || -1,
      dynamicVersion: challenge.dynamicVersion || null,
      assignedDate: new Date()
    }));
    // Update or create the user's challenge pool
    try {
      const userPool = await Models.UserChallengePool.findOneAndUpdate(
        { userId },
        { 
          assignedChallenges,
          lastRefreshed: new Date()
        },
        { upsert: true, new: true }
      );
      
      return userPool;
    } catch (error) {
      console.error('Error updating user challenge pool:', error);
      return null;
    }
  } catch (error) {
    console.error('Error in assignRandomChallenges:', error);
    return null;
  }
};

// Add a function to seed initial challenges from your pool
const seedInitialChallenges = async () => {
  try {
    console.log('Seeding initial challenges...');
    
    // Check if we already have challenges
    const existingCount = await Models.Challenge.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing challenges, skipping seed`);
      return;
    }
    
    // Add active flag to all challenges
    const challengesWithActive = challengePool.map(challenge => ({
      ...challenge,
      active: true,
      reward: {
        type: 'points',
        points: challenge.reward.points || 
               (challenge.difficulty === 'easy' ? 10 : 
                challenge.difficulty === 'medium' ? 25 : 40)
      },
      variations: challenge.variations || []
    }));
    
    // Insert challenges in batches to avoid issues
    const result = await Models.Challenge.insertMany(challengesWithActive);
    console.log(`Successfully added ${result.length} challenges to the database`);
    
    return result;
  } catch (error) {
    console.error('Error seeding initial challenges:', error);
    throw error;
  }
};

// // Helper function to assign random challenges
// const assignRandomChallenges = async (userId) => {
//   // Get all active challenges
//   const allChallenges = await Challenge.find({ active: true });
  
//   // Get completed challenges for this user
//   const completedChallengeIds = await UserChallengePool.find({
//     userId,
//     completed: true
//   }).distinct('challengeId');
  
//   // Filter out completed challenges
//   const availableChallenges = allChallenges.filter(
//     challenge => !completedChallengeIds.includes(challenge._id.toString())
//   );
  
//   // If less than 5 available challenges, include some completed ones
//   let candidateChallenges = availableChallenges;
//   if (availableChallenges.length < 5) {
//     candidateChallenges = allChallenges;
//   }
  
//   // Group challenges by difficulty
//   const challengesByDifficulty = {
//     easy: candidateChallenges.filter(c => c.difficulty === 'easy'),
//     medium: candidateChallenges.filter(c => c.difficulty === 'medium'),
//     hard: candidateChallenges.filter(c => c.difficulty === 'hard')
//   };
  
//   // Select challenges with a good distribution of difficulty
//   // 2 easy, 2 medium, 1 hard
//   const selectedChallenges = [
//     ...getRandomElements(challengesByDifficulty.easy, 2),
//     ...getRandomElements(challengesByDifficulty.medium, 2),
//     ...getRandomElements(challengesByDifficulty.hard, 1)
//   ];
  
//   // If we don't have enough challenges for the distribution, just get random ones
//   if (selectedChallenges.length < 5) {
//     selectedChallenges.push(
//       ...getRandomElements(
//         candidateChallenges.filter(c => !selectedChallenges.includes(c)),
//         5 - selectedChallenges.length
//       )
//     );
//   }
//   console.log('Selected challenges:', selectedChallenges);
//   // Update or create the user's challenge pool
//   const assignedChallenges = selectedChallenges.map(challenge => ({
//     challengeId: challenge._id,
//     assignedDate: new Date()
//   }));
  
//   // Update or create the user's challenge pool
//   const userPool = await UserChallengePool.findOneAndUpdate(
//     { userId },
//     { 
//       assignedChallenges,
//       lastRefreshed: new Date()
//     },
//     { upsert: true, new: true }
//   );
  
//   return userPool;
// };

// Fix the getRandomElements function to always return the requested number
const getRandomElements = (array, count) => {
  if (array.length === 0) return [];
  
  let extendedArray = [...array];
  while (extendedArray.length < count) {
    extendedArray = extendedArray.concat(array);
  }
  
  const shuffled = extendedArray.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Add this function - it can be called directly by other controllers
export const processJournalEntryForChallenges = async (userId, journalEntry) => {
  try {
    // Get user's assigned challenges
    const userPool = await Models.UserChallengePool.findOne({ userId });
    if (!userPool || !userPool.assignedChallenges || userPool.assignedChallenges.length === 0) {
      console.log('No assigned challenges for user', userId);
      return;
    }
    
    // Get all challenges assigned to the user
    const challengeIds = userPool.assignedChallenges.map(c => c.challengeId);
    const challenges = await Models.Challenge.find({ _id: { $in: challengeIds } });
    
    console.log(`Processing ${challenges.length} challenges for journal entry`);
    
    // For each challenge, check if this entry helps progress
    for (const challenge of challenges) {
      await processChallenge(userId, challenge, journalEntry);
    }
    
    return true;
  } catch (error) {
    console.error('Error processing journal entry for challenges:', error);
    return false;
  }
};

// Helper function to process a single challenge for a journal entry
const processChallenge = async (userId, challenge, journalEntry) => {
  try {
    // Get existing progress
    let userChallenge = await Models.UserChallenge.findOne({ 
      userId, 
      challengeId: challenge._id 
    });
    
    // Skip if already completed
    if (userChallenge && userChallenge.completed) {
      return;
    }
    
    // Create new progress record if needed
    if (!userChallenge) {
      userChallenge = new Models.UserChallenge({
        userId,
        challengeId: challenge._id,
        current: 0,
        completed: false
      });
    }
    
    // Calculate progress based on challenge type
    let progressMade = false;
    let newProgress = userChallenge.current;
    
    switch (challenge.requirements.type) {
      case 'entryCount':
        // Just increment for each entry
        newProgress += 1;
        progressMade = true;
        break;
        
      case 'wordCount':
        // Check if entry meets word count and keyword criteria
        const wordCount = journalEntry.wordCount || 
          journalEntry.content.split(/\s+/).filter(Boolean).length;
        
        if (wordCount >= challenge.requirements.criteria.minWords) {
          // If keywords are required, check for them
          if (challenge.requirements.criteria.keywords && 
              challenge.requirements.criteria.keywords.length > 0) {
            
            // Check if content contains any of the keywords
            const hasKeywords = challenge.requirements.criteria.keywords.some(
              keyword => journalEntry.content.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (hasKeywords) {
              newProgress = 1; // This type of challenge is binary
              progressMade = true;
            }
          } else {
            // No keywords required, just word count
            newProgress = 1;
            progressMade = true;
          }
        }
        break;
        
      case 'streak':
        // This is handled by streak updates, but we can check current streak
        // (No need to update here as it's done in updateStreakData)
        break;
        
      case 'timeOfDay':
        // Check if entry was created during specified hours
        const entryHour = new Date(journalEntry.createdAt).getHours();
        const { startHour, endHour } = challenge.requirements.criteria;
        
        if (startHour < endHour) {
          // Normal time range (e.g., 9am-5pm)
          if (entryHour >= startHour && entryHour < endHour) {
            newProgress = 1;
            progressMade = true;
          }
        } else {
          // Overnight range (e.g., 10pm-5am)
          if (entryHour >= startHour || entryHour < endHour) {
            newProgress = 1;
            progressMade = true;
          }
        }
        break;
        
      case 'keywords':
        // Check for specific keywords
        if (challenge.requirements.criteria.keywords && 
            challenge.requirements.criteria.keywords.length > 0) {
          
          const hasKeywords = challenge.requirements.criteria.keywords.some(
            keyword => journalEntry.content.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (hasKeywords) {
            newProgress += 1;
            progressMade = true;
          }
        }
        break;
        
      case 'custom':
        // Handle day of week criteria
        if (challenge.requirements.criteria.dayOfWeek) {
          const entryDay = new Date(journalEntry.createdAt).getDay();
          if (challenge.requirements.criteria.dayOfWeek.includes(entryDay)) {
            newProgress = 1;
            progressMade = true;
          }
        }
        break;
    }
    
    if (progressMade) {
      // Update progress
      userChallenge.current = newProgress;
      
      // Check if challenge is completed
      if (newProgress >= challenge.requirements.target && !userChallenge.completed) {
        userChallenge.completed = true;
        userChallenge.completedDate = new Date();
        
        console.log(`User ${userId} completed challenge: ${challenge.title}`);
        
        // Award user with points or badges
        if (challenge.reward.type === 'points' || challenge.reward.type === 'both') {
          await Models.User.findByIdAndUpdate(userId, {
            $inc: { points: challenge.reward.points }
          });
        }
        
        if (challenge.reward.type === 'badge' || challenge.reward.type === 'both') {
          await Models.User.findByIdAndUpdate(userId, {
            $push: { 
              badges: {
                name: challenge.reward.badgeName,
                icon: challenge.reward.badgeIcon,
                achievedOn: new Date()
              } 
            }
          });
        }
      }
      
      await userChallenge.save();
    }
  } catch (error) {
    console.error(`Error processing challenge ${challenge.title}:`, error);
  }
};

// Add this function to your existing controller
export const getUserPoints = async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      
      // Get user data with points
      const user = await Models.User.findById(userId).select('points');
      console.log('User points:', user.points);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get data about streak revival - you may need to adjust this based on your schema
      const revivedToday = user.streakData && user.streakData.lastRevival && 
        new Date(user.streakData.lastRevival).setHours(0,0,0,0) === new Date().setHours(0,0,0,0);
      
      // Calculate the next revive cost
      const baseReviveCost = 100;
      const nextReviveCost = revivedToday ? baseReviveCost * 2 : baseReviveCost;
      
      res.status(200).json({
        points: user.points || 0,
        revivedToday: revivedToday || false,
        nextReviveCost
      });
    } catch (error) {
      console.error('Error fetching user points:', error);
      res.status(500).json({ message: 'Server error while fetching points data' });
    }
  };

// Keep your existing updateChallengeProgress function for API requests
export const updateChallengeProgress = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user.id || req.user._id;
    const { progress } = req.body;
    
    let userChallenge = await Models.UserChallenge.findOne({ 
      userId, 
      challengeId 
    });
    
    if (!userChallenge) {
      userChallenge = new Models.UserChallenge({
        userId,
        challengeId,
        current: 0,
        completed: false
      });
    }
    
    // Update progress
    userChallenge.current = progress;
    
    // Check if challenge is completed
    const challenge = await Models.Challenge.findById(challengeId);
    if (progress >= challenge.requirements.target && !userChallenge.completed) {
      userChallenge.completed = true;
      userChallenge.completedDate = new Date();
      
      // Award user with points or badges
      if (challenge.reward.type === 'points' || challenge.reward.type === 'both') {
        await Models.User.findByIdAndUpdate(userId, {
          $inc: { points: challenge.reward.points }
        });
      }
      
      if (challenge.reward.type === 'badge' || challenge.reward.type === 'both') {
        await Models.User.findByIdAndUpdate(userId, {
          $push: { 
            badges: {
              name: challenge.reward.badgeName,
              icon: challenge.reward.badgeIcon,
              achievedOn: new Date()
            } 
          }
        });
      }
    }
    
    await userChallenge.save();
    res.json(userChallenge);
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Manual completion for challenges that need verification
export const completeChallengeManually = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user.id;
    
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    let userChallenge = await UserChallengePool.findOne({ userId, challengeId });
    if (!userChallenge) {
      userChallenge = new UserChallengePool({
        userId,
        challengeId,
        current: challenge.requirements.target,
        completed: true,
        completedDate: new Date()
      });
    } else {
      userChallenge.current = challenge.requirements.target;
      userChallenge.completed = true;
      userChallenge.completedDate = new Date();
    }
    
    await userChallenge.save();
    
    // Award user with points or badges
    if (challenge.reward.type === 'points' || challenge.reward.type === 'both') {
      await User.findByIdAndUpdate(userId, {
        $inc: { points: challenge.reward.points }
      });
    }
    
    if (challenge.reward.type === 'badge' || challenge.reward.type === 'both') {
      await User.findByIdAndUpdate(userId, {
        $push: { 
          badges: {
            name: challenge.reward.badgeName,
            icon: challenge.reward.badgeIcon,
            achievedOn: new Date()
          } 
        }
      });
    }
    
    res.json({ message: 'Challenge completed successfully' });
  } catch (error) {
    console.error('Error completing challenge:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const challengePool = [
  // EASY CHALLENGES - 5-15 points
  {
    title: "First Steps",
    description: "Write your first journal entry today",
    category: "consistency",
    difficulty: "easy",
    requirements: {
      type: "entryCount",
      target: 1,
      criteria: {}
    },
    reward: {
      type: "points",
      points: 5
    },
    // Dynamic properties
    variations: []
  },
  {
    title: "Weekend Journaling",
    description: "Write a journal entry on Saturday or Sunday",
    category: "timing",
    difficulty: "easy",
    requirements: {
      type: "custom",
      target: 1,
      criteria: {
        dayOfWeek: [0, 6] // Sunday (0) or Saturday (6)
      }
    },
    reward: {
      type: "points",
      points: 10
    },
    // Dynamic properties for variation
    variations: [
      {
        title: "Midweek Reflection",
        description: "Write a journal entry on Tuesday or Wednesday",
        criteria: { dayOfWeek: [2, 3] }
      },
      {
        title: "Bookend Journaling",
        description: "Write a journal entry on Monday or Friday",
        criteria: { dayOfWeek: [1, 5] }
      },
      {
        title: "Thursday Thoughts",
        description: "Write a journal entry on Thursday",
        criteria: { dayOfWeek: [4] }
      }
    ]
  },
  {
    title: "Gratitude Starter",
    description: "Write an entry expressing gratitude for something",
    category: "gratitude",
    difficulty: "easy",
    requirements: {
      type: "keywords",
      target: 1,
      criteria: {
        keywords: ["grateful", "thankful", "appreciate", "thanks"]
      }
    },
    reward: {
      type: "points",
      points: 15
    },
    // Dynamic properties
    variations: [
      {
        title: "Positive Reflections",
        description: "Write an entry focusing on positive aspects of your day",
        criteria: { keywords: ["positive", "happy", "joy", "good", "wonderful"] }
      },
      {
        title: "Blessing Counter",
        description: "Note the blessings in your life in an entry",
        criteria: { keywords: ["blessing", "fortunate", "lucky", "privileged"] }
      }
    ]
  },
  {
    title: "Morning Pages",
    description: "Write an entry before 10am",
    category: "timing",
    difficulty: "easy",
    requirements: {
      type: "timeOfDay",
      target: 1,
      criteria: {
        startHour: 5, // 5 AM
        endHour: 10 // 10 AM
      }
    },
    reward: {
      type: "points",
      points: 10
    },
    // Dynamic properties
    variations: [
      {
        title: "Dawn Writer",
        description: "Write an entry before 7am",
        criteria: { startHour: 4, endHour: 7 }
      },
      {
        title: "Breakfast Journaling",
        description: "Write an entry between 7am and 9am",
        criteria: { startHour: 7, endHour: 9 }
      }
    ]
  },
  {
    title: "Midnight Thoughts",
    description: "Record your thoughts after 10pm",
    category: "timing",
    difficulty: "easy",
    requirements: {
      type: "timeOfDay",
      target: 1,
      criteria: {
        startHour: 22, // 10 PM
        endHour: 5 // 5 AM
      }
    },
    reward: {
      type: "points",
      points: 10
    },
    // Dynamic properties
    variations: [
      {
        title: "Late Night Reflections",
        description: "Record your thoughts after midnight",
        criteria: { startHour: 0, endHour: 4 }
      },
      {
        title: "Evening Wind Down",
        description: "Journal between 8pm and 10pm",
        criteria: { startHour: 20, endHour: 22 }
      }
    ]
  },
  {
    title: "Expressive Writing",
    description: "Write a 200+ word entry about your feelings",
    category: "depth",
    difficulty: "easy",
    requirements: {
      type: "wordCount",
      target: 1,
      criteria: {
        minWords: 200,
        keywords: ["feel", "feeling", "emotion"]
      }
    },
    reward: {
      type: "points",
      points: 15
    },
    // Dynamic properties
    variations: [
      {
        title: "Detailed Day",
        description: "Write a 200+ word entry about your daily activities",
        criteria: { minWords: 200, keywords: ["today", "did", "activity", "event"] }
      },
      {
        title: "Future Planning",
        description: "Write a 200+ word entry about your goals or plans",
        criteria: { minWords: 200, keywords: ["future", "plan", "goal", "hope"] }
      }
    ]
  },
  
  // MEDIUM CHALLENGES - 20-30 points
  {
    title: "Mood Tracker",
    description: "Record your mood for 5 consecutive days",
    category: "consistency",
    difficulty: "medium",
    requirements: {
      type: "streak",
      target: 5,
      criteria: {
        requireMood: true
      }
    },
    reward: {
      type: "points",
      points: 25
    },
    // Dynamic properties
    variations: [
      {
        title: "Emotion Journal",
        description: "Record your emotions for 4 consecutive days",
        criteria: { requireMood: true },
        target: 4
      },
      {
        title: "Weekly Mood Monitor",
        description: "Record your mood for 7 consecutive days",
        criteria: { requireMood: true },
        target: 7
      }
    ]
  },
  {
    title: "Gratitude Journal",
    description: "List three things you're grateful for in 3 different entries",
    category: "gratitude",
    difficulty: "medium",
    requirements: {
      type: "entryCount",
      target: 3,
      criteria: {
        keywords: ["grateful", "thankful", "appreciate", "thanks"]
      }
    },
    reward: {
      type: "points",
      points: 25
    },
    // Dynamic properties
    variations: [
      {
        title: "Appreciation Log",
        description: "Express appreciation for someone in 3 different entries",
        criteria: { keywords: ["appreciate", "value", "admire", "respect"] }
      },
      {
        title: "Joy Finder",
        description: "Write about joyful moments in 3 different entries",
        criteria: { keywords: ["joy", "happy", "delight", "pleasure", "enjoy"] }
      }
    ]
  },
  {
    title: "Deep Dive",
    description: "Write a 400+ word entry reflecting on a personal challenge",
    category: "depth",
    difficulty: "medium",
    requirements: {
      type: "wordCount",
      target: 1,
      criteria: {
        minWords: 400,
        keywords: ["challenge", "overcome", "learn", "grow"]
      }
    },
    reward: {
      type: "points",
      points: 20
    },
    // Dynamic properties
    variations: [
      {
        title: "Learning Reflection",
        description: "Write a 400+ word entry about something you learned recently",
        criteria: { minWords: 400, keywords: ["learn", "discover", "understand", "knowledge"] }
      },
      {
        title: "Relationship Analysis",
        description: "Write a 400+ word entry about an important relationship",
        criteria: { minWords: 400, keywords: ["relationship", "connection", "bond", "friend", "family"] }
      }
    ]
  },
  {
    title: "Weekly Reflector",
    description: "Complete at least one entry every week for 3 weeks",
    category: "consistency",
    difficulty: "medium",
    requirements: {
      type: "custom",
      target: 3,
      criteria: {
        timespan: "weekly",
        minimumEntries: 1,
        consecutiveWeeks: 3
      }
    },
    reward: {
      type: "points",
      points: 30
    },
    // Dynamic properties
    variations: [
      {
        title: "Bi-Weekly Check-in",
        description: "Complete at least two entries every week for 2 weeks",
        criteria: { timespan: "weekly", minimumEntries: 2, consecutiveWeeks: 2 },
        target: 2
      },
      {
        title: "Monthly Milestone",
        description: "Complete at least one entry each week for a full month",
        criteria: { timespan: "weekly", minimumEntries: 1, consecutiveWeeks: 4 },
        target: 4
      }
    ]
  },
  {
    title: "Self-Care Tracker",
    description: "Write about self-care activities in 3 separate entries",
    category: "reflection",
    difficulty: "medium",
    requirements: {
      type: "entryCount",
      target: 3,
      criteria: {
        keywords: ["self-care", "relax", "recharge", "wellness", "rest"]
      }
    },
    reward: {
      type: "points",
      points: 25
    },
    // Dynamic properties
    variations: [
      {
        title: "Wellness Journal",
        description: "Write about your physical wellness in 3 separate entries",
        criteria: { keywords: ["exercise", "nutrition", "sleep", "health", "fitness"] }
      },
      {
        title: "Mental Health Notes",
        description: "Write about your mental wellbeing in 3 separate entries",
        criteria: { keywords: ["mental health", "stress", "mindfulness", "anxiety", "peace"] }
      }
    ]
  },
  {
    title: "Goal Setting",
    description: "Set and describe 2 personal goals in your journal",
    category: "reflection",
    difficulty: "medium",
    requirements: {
      type: "keywords",
      target: 2,
      criteria: {
        keywords: ["goal", "objective", "aim", "target", "plan"],
        uniqueEntries: true
      }
    },
    reward: {
      type: "points",
      points: 20
    },
    // Dynamic properties
    variations: [
      {
        title: "Dream Documenter",
        description: "Write about 2 dreams or aspirations you have",
        criteria: { keywords: ["dream", "aspire", "hope", "wish", "future"], uniqueEntries: true }
      },
      {
        title: "Personal Projects",
        description: "Document 2 projects you're working on or planning",
        criteria: { keywords: ["project", "work", "create", "build", "develop"], uniqueEntries: true }
      }
    ]
  },
  
  // HARD CHALLENGES - 35-75 points
  {
    title: "Consistency Champion",
    description: "Write a journal entry every day for 7 consecutive days",
    category: "consistency",
    difficulty: "hard",
    requirements: {
      type: "streak",
      target: 7,
      criteria: {}
    },
    reward: {
      type: "points",
      points: 50
    },
    // Dynamic properties
    variations: [
      {
        title: "Daily Dedication",
        description: "Write a journal entry every day for 5 consecutive days",
        target: 5
      },
      {
        title: "Journaling Marathon",
        description: "Write a journal entry every day for 10 consecutive days",
        target: 10
      }
    ]
  },
  {
    title: "Deep Reflection",
    description: "Write a 600+ word entry analyzing a significant life event",
    category: "depth",
    difficulty: "hard",
    requirements: {
      type: "wordCount",
      target: 1,
      criteria: {
        minWords: 600,
        keywords: ["reflect", "analyze", "impact", "changed", "significant"]
      }
    },
    reward: {
      type: "points",
      points: 40
    },
    // Dynamic properties
    variations: [
      {
        title: "Life Philosophy",
        description: "Write a 600+ word entry about your personal beliefs or philosophy",
        criteria: { minWords: 600, keywords: ["believe", "value", "philosophy", "principle", "important"] }
      },
      {
        title: "Identity Exploration",
        description: "Write a 600+ word entry exploring aspects of your identity",
        criteria: { minWords: 600, keywords: ["identity", "self", "who I am", "personality", "character"] }
      }
    ]
  },
  {
    title: "Emotional Explorer",
    description: "Reflect on 5 different emotions in separate entries",
    category: "depth",
    difficulty: "hard",
    requirements: {
      type: "keywords",
      target: 5,
      criteria: {
        keywordCategories: ["happy", "sad", "angry", "afraid", "surprised", "disgusted", "content"],
        uniqueCategories: true,
        uniqueEntries: true
      }
    },
    reward: {
      type: "points",
      points: 45
    },
    // Dynamic properties
    variations: [
      {
        title: "Feeling Finder",
        description: "Reflect on 4 different emotions in separate entries",
        criteria: { 
          keywordCategories: ["excited", "nervous", "peaceful", "frustrated", "proud", "curious", "grateful"],
          uniqueCategories: true, 
          uniqueEntries: true 
        },
        target: 4
      },
      {
        title: "Emotion Dictionary",
        description: "Explore 6 different emotional states in separate entries",
        criteria: { 
          keywordCategories: ["joyful", "melancholy", "anxious", "confident", "hopeful", "disappointed"],
          uniqueCategories: true, 
          uniqueEntries: true 
        },
        target: 6
      }
    ]
  },
  {
    title: "Full Month Journaler",
    description: "Write at least 20 journal entries in 30 days",
    category: "consistency",
    difficulty: "hard",
    requirements: {
      type: "entryCount",
      target: 20,
      criteria: {
        timeframe: 30 // days
      }
    },
    reward: {
      type: "points",
      points: 75
    },
    // Dynamic properties
    variations: [
      {
        title: "Fortnight Focus",
        description: "Write at least 10 journal entries in 14 days",
        criteria: { timeframe: 14 },
        target: 10
      },
      {
        title: "Three-Week Trial",
        description: "Write at least 15 journal entries in 21 days",
        criteria: { timeframe: 21 },
        target: 15
      }
    ]
  },
  {
    title: "Morning Routine",
    description: "Write entries before 9am for 5 days in a row",
    category: "timing",
    difficulty: "hard",
    requirements: {
      type: "custom",
      target: 5,
      criteria: {
        timeOfDay: {
          startHour: 5,
          endHour: 9
        },
        consecutive: true
      }
    },
    reward: {
      type: "points",
      points: 35
    },
    // Dynamic properties
    variations: [
      {
        title: "Lunchtime Logger",
        description: "Write entries between 11am and 2pm for 5 days in a row",
        criteria: { timeOfDay: { startHour: 11, endHour: 14 }, consecutive: true }
      },
      {
        title: "Evening Chronicler",
        description: "Write entries between 5pm and 8pm for 5 days in a row",
        criteria: { timeOfDay: { startHour: 17, endHour: 20 }, consecutive: true }
      }
    ]
  },
  {
    title: "Gratitude Master",
    description: "Write about gratitude every day for 5 consecutive days",
    category: "gratitude",
    difficulty: "hard",
    requirements: {
      type: "streak",
      target: 5,
      criteria: {
        keywords: ["grateful", "thankful", "appreciate", "blessing", "thanks"],
        requireKeywords: true
      }
    },
    reward: {
      type: "points",
      points: 45
    },
    // Dynamic properties
    variations: [
      {
        title: "Positivity Streak",
        description: "Write about positive experiences every day for 5 consecutive days",
        criteria: { keywords: ["positive", "good", "wonderful", "excellent", "great"], requireKeywords: true }
      },
      {
        title: "Achievement Tracker",
        description: "Document accomplishments every day for 5 consecutive days",
        criteria: { keywords: ["accomplish", "achieve", "complete", "success", "proud"], requireKeywords: true }
      }
    ]
  }
];

// Add this function to your existing controller
export const reviveStreak = async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const { cost } = req.body;
      
      // Get user data
      const user = await Models.User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user has enough points
      if (!user.points || user.points < cost) {
        return res.status(400).json({ 
          message: 'Not enough points to revive streak' 
        });
      }
      
      // Update user's points and streak data
      const updatedUser = await Models.User.findByIdAndUpdate(
        userId,
        {
          $inc: { points: -cost },
          $set: { 
            'streakData.lastRevival': new Date(),
            'streakData.currentStreak': user.streakData.currentStreak + 1
          },
          $max: { 
            'streakData.longestStreak': user.streakData.currentStreak + 1 
          }
        },
        { new: true }
      );
      
      // Calculate next revive cost (increases after each use)
      const nextReviveCost = Math.round(cost * 1.5);
      
      res.status(200).json({
        success: true,
        points: updatedUser.points,
        currentStreak: updatedUser.streakData.currentStreak,
        nextReviveCost
      });
    } catch (error) {
      console.error('Error reviving streak:', error);
      res.status(500).json({ message: 'Server error while reviving streak' });
    }
  };

  export const completeChallenge = async (req, res) => {
    try {
      const challengeId = req.params.challengeId;
      const userId = req.user._id || req.user.id;
      
      // Find the challenge
      const challenge = await Models.Challenge.findById(challengeId);
      if (!challenge) {
        return res.status(404).json({ message: 'Challenge not found' });
      }
      
      // Find user progress for this challenge
      let userChallenge = await Models.UserChallenge.findOne({
        userId,
        challengeId
      });
      
      // If already completed, return early with current points
      if (userChallenge && userChallenge.completed) {
        const user = await Models.User.findById(userId).select('points');
        return res.status(200).json({
          success: true,
          message: 'Challenge was already completed',
          points: points,
          totalPoints: user?.points || 0,
          badge: null
        });
      }
      
      // If no progress record exists, create one
      if (!userChallenge) {
        userChallenge = new Models.UserChallenge({
          userId,
          challengeId,
          current: challenge.requirements.target,
          completed: true,
          completedDate: new Date()
        });
      } else {
        // Update existing record
        userChallenge.current = challenge.requirements.target;
        userChallenge.completed = true;
        userChallenge.completedDate = new Date();
      }
      
      await userChallenge.save();
      
      let awardedBadge = null;
      let pointsAwarded = 0;
      
      // Award points if applicable
      if (challenge.reward && (challenge.reward.type === 'points' || challenge.reward.type === 'both')) {
        pointsAwarded = challenge.reward.points || 0;
        
        await Models.User.findByIdAndUpdate(userId, {
          $inc: { points: pointsAwarded }
        });
      }
      
      // Award badge if applicable
      if (challenge.reward && (challenge.reward.type === 'badge' || challenge.reward.type === 'both')) {
        if (challenge.reward.badgeName) {
          awardedBadge = {
            name: challenge.reward.badgeName,
            icon: challenge.reward.badgeIcon
          };
          
          await Models.User.findByIdAndUpdate(userId, {
            $push: { 
              badges: {
                name: challenge.reward.badgeName,
                icon: challenge.reward.badgeIcon,
                achievedOn: new Date()
              } 
            }
          });
        }
      }
      
      // Get updated total points
      const user = await Models.User.findById(userId).select('points');
      const totalPoints = user?.points || 0;
      
      res.status(200).json({
        success: true,
        message: 'Challenge completed successfully',
        points: pointsAwarded,
        totalPoints,
        badge: awardedBadge
      });
    } catch (error) {
      let errorMessage = 'Server error';
      if (error.name === 'ValidationError') {
        errorMessage = 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ');
      } else if (error.name === 'CastError') {
        errorMessage = `Invalid ${error.path}: ${error.value}`;
      }
      
      res.status(500).json({ message: errorMessage });
    }
  };

  export const getUserTotalPoints = async (userId) => {
    try {
      const user = await Models.User.findById(userId).select('points');
      return user?.points || 0;
    } catch (error) {
      console.error('Error fetching user total points:', error);
      return 0;
    }
  };