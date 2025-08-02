// NEW FILE
import Models from '../models/user.model.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected for seeding badges'))
  .catch(err => console.error('MongoDB connection error:', err));

const badges = [
  // Existing badges
  {
    name: "Newcomer",
    description: "Created your first journal entry",
    icon: "🌱",
    criteria: {
      type: "special",
      specialCondition: "firstEntry"
    },
    rarity: "common"
  },
  {
    name: "5-Day Streak",
    description: "Maintained a journaling streak for 5 consecutive days",
    icon: "🔥",
    criteria: {
      type: "streak",
      value: 5
    },
    rarity: "common"
  },
  {
    name: "10-Day Streak",
    description: "Maintained a journaling streak for 10 consecutive days",
    icon: "🔥",
    criteria: {
      type: "streak",
      value: 10
    },
    rarity: "uncommon"
  },
  {
    name: "30-Day Streak",
    description: "Maintained a journaling streak for 30 consecutive days",
    icon: "🔥",
    criteria: {
      type: "streak",
      value: 30
    },
    rarity: "rare"
  },
  {
    name: "100-Day Streak",
    description: "Maintained a journaling streak for 100 consecutive days",
    icon: "🔥",
    criteria: {
      type: "streak",
      value: 100
    },
    rarity: "legendary"
  },
  {
    name: "Prolific Writer",
    description: "Wrote 10 journal entries",
    icon: "📝",
    criteria: {
      type: "entryCount",
      value: 10
    },
    rarity: "common"
  },
  {
    name: "Dedicated Diarist",
    description: "Wrote 50 journal entries",
    icon: "📚",
    criteria: {
      type: "entryCount",
      value: 50
    },
    rarity: "rare"
  },
  {
    name: "Word Smith",
    description: "Wrote a total of 10,000 words across all entries",
    icon: "🖋️",
    criteria: {
      type: "wordCount",
      value: 10000
    },
    rarity: "epic"
  },
  {
    name: "Night Owl",
    description: "Wrote 5 journal entries between 10 PM and 4 AM",
    icon: "🦉",
    criteria: {
      type: "special",
      specialCondition: "nightOwl"
    },
    rarity: "uncommon"
  },
  {
    name: "Positive Thinker",
    description: "Showed consistent improvement in mood over 10 entries",
    icon: "😊",
    criteria: {
      type: "moodImprovement",
      value: 10
    },
    rarity: "rare"
  },
  {
    name: "Consistency Master",
    description: "Wrote at least one entry every week for 8 consecutive weeks",
    icon: "📅",
    criteria: {
      type: "special",
      specialCondition: "weeklyConsistency",
      value: 8
    },
    rarity: "epic"
  },
  
  // New badges (20 additional badges)
  // 1. Streak badges
  {
    name: "200-Day Streak",
    description: "Maintained a journaling streak for 200 consecutive days",
    icon: "🌋",
    criteria: {
      type: "streak",
      value: 200
    },
    rarity: "legendary"
  },
  {
    name: "365-Day Streak",
    description: "Maintained a journaling streak for a full year",
    icon: "🏆",
    criteria: {
      type: "streak",
      value: 365
    },
    rarity: "legendary"
  },
  
  // 2. Entry count badges
  {
    name: "Journal Enthusiast",
    description: "Wrote 100 journal entries",
    icon: "📔",
    criteria: {
      type: "entryCount",
      value: 100
    },
    rarity: "epic"
  },
  {
    name: "Journal Virtuoso",
    description: "Wrote 365 journal entries",
    icon: "🏅",
    criteria: {
      type: "entryCount",
      value: 365
    },
    rarity: "legendary"
  },
  
  // 3. Word count badges
  {
    name: "Budding Writer",
    description: "Wrote a total of 1,000 words across all entries",
    icon: "✏️",
    criteria: {
      type: "wordCount",
      value: 1000
    },
    rarity: "common"
  },
  {
    name: "Eloquent Journalist",
    description: "Wrote a total of 5,000 words across all entries",
    icon: "📰",
    criteria: {
      type: "wordCount",
      value: 5000
    },
    rarity: "uncommon"
  },
  {
    name: "Essay Master",
    description: "Wrote a total of 25,000 words across all entries",
    icon: "📜",
    criteria: {
      type: "wordCount",
      value: 25000
    },
    rarity: "rare"
  },
  {
    name: "Novelist",
    description: "Wrote a total of 50,000 words across all entries (novel length!)",
    icon: "📕",
    criteria: {
      type: "wordCount",
      value: 50000
    },
    rarity: "legendary"
  },
  
  // 4. Time of day badges
  {
    name: "Early Bird",
    description: "Wrote 5 journal entries between 5 AM and 8 AM",
    icon: "🐦",
    criteria: {
      type: "special",
      specialCondition: "earlyBird"
    },
    rarity: "uncommon"
  },
  {
    name: "Lunch Break Journalist",
    description: "Wrote 10 journal entries between 11 AM and 2 PM",
    icon: "🍽️",
    criteria: {
      type: "special",
      specialCondition: "lunchBreak"
    },
    rarity: "uncommon"
  },
  
  // 5. Mood-related badges
  {
    name: "Mood Tracker",
    description: "Tracked your mood for 14 consecutive days",
    icon: "📊",
    criteria: {
      type: "special",
      specialCondition: "moodStreak",
      value: 14
    },
    rarity: "uncommon"
  },
  {
    name: "Mood Master",
    description: "Tracked your mood for 30 consecutive days",
    icon: "🧠",
    criteria: {
      type: "special",
      specialCondition: "moodStreak",
      value: 30
    },
    rarity: "rare"
  },
  {
    name: "Emotional Intelligence",
    description: "Identified 10 different emotions in your journal entries",
    icon: "🧘",
    criteria: {
      type: "special",
      specialCondition: "emotionVariety",
      value: 10
    },
    rarity: "rare"
  },
  
  // 6. Content quality badges
  {
    name: "Deep Thinker",
    description: "Wrote a journal entry that's at least 500 words long",
    icon: "💭",
    criteria: {
      type: "special",
      specialCondition: "longEntry",
      value: 500
    },
    rarity: "uncommon"
  },
  {
    name: "Philosopher",
    description: "Wrote a journal entry that's at least 1,000 words long",
    icon: "🔍",
    criteria: {
      type: "special",
      specialCondition: "longEntry",
      value: 1000
    },
    rarity: "rare"
  },
  
  // 7. Special time badges
  {
    name: "Weekend Warrior",
    description: "Wrote journal entries on 8 consecutive weekends",
    icon: "🏄",
    criteria: {
      type: "special",
      specialCondition: "weekendStreak",
      value: 8
    },
    rarity: "rare"
  },
  {
    name: "Holiday Spirit",
    description: "Journaled on five different holidays",
    icon: "🎁",
    criteria: {
      type: "special", 
      specialCondition: "holidayWriter",
      value: 5
    },
    rarity: "uncommon"
  },
  {
    name: "New Year Reflector",
    description: "Wrote a journal entry on December 31st or January 1st",
    icon: "🎆",
    criteria: {
      type: "special",
      specialCondition: "newYearEntry"
    },
    rarity: "uncommon"
  },
  
  // 8. Milestone badges
  {
    name: "First Month Journey",
    description: "Has been using Journify for one month",
    icon: "🌟",
    criteria: {
      type: "special",
      specialCondition: "accountAge",
      value: 30
    },
    rarity: "common"
  },
  {
    name: "Journify Veteran",
    description: "Has been using Journify for a full year",
    icon: "👑",
    criteria: {
      type: "special",
      specialCondition: "accountAge",
      value: 365
    },
    rarity: "epic"
  }
];

const seedBadges = async () => {
  try {
    // Delete existing badges
    await Models.Badge.deleteMany({});
    console.log('Cleared existing badges');
    
    // Insert new badges
    const insertedBadges = await Models.Badge.insertMany(badges);
    console.log(`Seeded ${insertedBadges.length} badges successfully`);
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding badges:', error);
    mongoose.connection.close();
  }
};

seedBadges();