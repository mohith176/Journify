import mongoose from "mongoose";
const Schema = mongoose.Schema;

// User Schema
const userSchema = new Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  facebookId: {  // Add this field
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: false
  },
  name: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  preferences: {
    theme: {
      type: String,
      default: 'light'
    },
    reminderFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'none'],
      default: 'none'
    },
    reminderTime: String
  },
  streakData: {
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    lastEntryDate: Date
  },
  badges: [{
    type: Schema.Types.ObjectId,
    ref: 'UserBadge'
  }],
});

// Journal Entry Schema
const journalEntrySchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: function() {
      return new Date().toLocaleDateString();
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  wordCount: {
    type: Number, 
    default: 0
  },
  moods: {  
      type: [String],
      required: true
    
  },
  aiConversation: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: String,
    timestamp: Date
  }]
});

// Sentiment Analysis Schema
const sentimentAnalysisSchema = new Schema({
  journalEntry: {
    type: Schema.Types.ObjectId,
    ref: 'JournalEntry',
    required: true
  },
  emotions: [String],
  keywords: [String],
  themes: [String],
  summary: String,
  insights: [String],
  nltkScores: {
    positive: { type: Number, default: 0.5 },
    negative: { type: Number, default: 0.5 },
    neutral: { type: Number, default: 0.5 },
    compound: { type: Number, default: 0.5 },
    sentiment: { type: String, default: 'neutral' } // Assuming sentiment is a string
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Mood Tracking Schema
const moodTrackingSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  moods: [{
    mood: String,
    time: Date
  }],
  dailyAverage: {
    mood: String,
    intensity: {
      type: Number,
      default: 3
    },
  },
  notes: String
});

// Insights Schema
const insightSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['weekly', 'monthly', 'custom', 'pattern'],
    required: true
  },
  title: String,
  description: String,
  startDate: Date,
  endDate: Date,
  moodTrends: {
    dominant: String,
    trend: String, // improving, declining, stable
    data: Schema.Types.Mixed // For storing chart data
  },
  wordFrequency: [{
    word: String,
    count: Number
  }],
  themes: [{
    theme: String,
    relevance: Number,
    entries: [{
      type: Schema.Types.ObjectId,
      ref: 'JournalEntry'
    }]
  }],
  recommendations: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Gamification Schema
const gamificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  streak: {
    current: Number,
    longest: Number,
    history: [{
      date: Date,
      wasActive: Boolean
    }]
  },
  badges: [{
    type: Schema.Types.ObjectId,
    ref: 'Badge'
  }],
  level: {
    current: {
      type: Number,
      default: 1
    },
    experience: {
      type: Number,
      default: 0
    },
    nextLevelExperience: {
      type: Number,
      default: 100
    }
  },
  challenges: [{
    name: String,
    description: String,
    progress: Number,
    target: Number,
    completed: Boolean,
    completedOn: Date,
    reward: {
      type: String,
      enum: ['badge', 'experience', 'theme', 'feature']
    },
    rewardValue: Schema.Types.Mixed
  }]
});

// Badge Schema
const badgeSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  icon: String,
  criteria: {
    type: {
      type: String,
      enum: ['streak', 'entryCount', 'moodImprovement', 'wordCount', 'special'],
      required: true
    },
    value: Number, // The threshold to earn the badge
    specialCondition: String // For badges with special conditions
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  }
});

// Prompt Template Schema
const promptTemplateSchema = new Schema({
  category: {
    type: String,
    enum: ['general', 'gratitude', 'self-reflection', 'goals', 'stress', 'happiness', 'custom'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  tags: [String],
  usageCount: {
    type: Number,
    default: 0
  },
  createdFor: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isSystem: {
    type: Boolean,
    default: false
  }
});

// Auth Token Schema
const tokenSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['refresh', 'reset', 'verification'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Notification Schema
const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['reminder', 'insight', 'streak', 'achievement', 'system'],
    required: true
  },
  title: String,
  message: String,
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  link: String
});

const ChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['consistency', 'depth', 'gratitude', 'timing', 'content', 'reflection']
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  requirements: {
    type: {
      type: String,
      required: true,
      enum: ['streak', 'wordCount', 'entryCount', 'timeOfDay', 'keywords', 'custom']
    },
    target: {
      type: Number,
      required: true
    },
    criteria: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  reward: {
    type: {
      type: String,
      required: true,
      enum: ['points'], // Changed from ['badge', 'points', 'both'] to only 'points'
    },
    points: {
      type: Number,
      required: true
    }
  },
  // Added variations array for dynamic challenges
  variations: [{
    title: String,
    description: String,
    target: Number,
    criteria: mongoose.Schema.Types.Mixed
  }],
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const UserChallengePoolSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  assignedChallenges: [{
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true
    },
    // Added fields to store which variation was assigned
    variationIndex: {
      type: Number,
      default: -1 // -1 means using base challenge, >=0 is an index in the variations array
    },
    // Store the dynamic version of the challenge
    dynamicVersion: {
      title: String,
      description: String,
      requirements: {
        target: Number,
        criteria: mongoose.Schema.Types.Mixed
      }
    },
    assignedDate: {
      type: Date,
      default: Date.now
    }
  }],
  lastRefreshed: {
    type: Date,
    default: Date.now
  }
});

const UserChallengeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  // Add variation tracking
  variationIndex: {
    type: Number,
    default: -1 // -1 means using base challenge
  },
  // Store dynamic version data
  dynamicVersion: {
    title: String,
    description: String,
    requirements: {
      target: Number,
      criteria: mongoose.Schema.Types.Mixed
    }
  },
  current: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedDate: {
    type: Date
  }
}, { timestamps: true });

const dailySummarySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  entryCount: {
    type: Number,
    required: true
  },
  overview: {
    type: String,
    required: true
  },
  mood: [{
    type: String
  }],
  highlights: [{
    type: String
  }],
  concerns: [{
    type: String
  }],
  patterns: String,
  reflection: String,
  rawSummary: String,
  generatedAt: {
    type: Date,
    default: Date.now
  }
});


const userBadgeSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  badge: {
    type: Schema.Types.ObjectId, 
    ref: 'Badge',
    required: true
  },
  achievedOn: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 0 // For badges in progress
  }
});

// Goal Schema
const goalSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['daily', 'normal'],
    required: true
  },
  emoji: {
    type: String,
    default: '🎯'
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  details: {
    type: String,
    trim: true
  },
  deadline: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // For daily goals (habits)
  streak: {
    current: {
      type: Number,
      default: 0
    },
    best: {
      type: Number,
      default: 0
    }
  },
  completionHistory: [{
    date: {
      type: Date,
      required: true
    },
    completed: {
      type: Boolean,
      default: true
    }
  }],
  active: {
    type: Boolean,
    default: true
  }
});
const journalingPromptSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  basedOnEntryId: {
    type: Schema.Types.ObjectId,
    ref: 'JournalEntry'
  },
  relevantThemes: [String],
  used: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});


// Create models from schemas
const User = mongoose.model('User', userSchema);
const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);
const SentimentAnalysis = mongoose.model('SentimentAnalysis', sentimentAnalysisSchema);
const MoodTracking = mongoose.model('MoodTracking', moodTrackingSchema);
const Insight = mongoose.model('Insight', insightSchema);
const Gamification = mongoose.model('Gamification', gamificationSchema);
const Badge = mongoose.model('Badge', badgeSchema);
const PromptTemplate = mongoose.model('PromptTemplate', promptTemplateSchema);
const Token = mongoose.model('Token', tokenSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Challenge = mongoose.model('Challenge', ChallengeSchema);
const UserChallenge = mongoose.model('UserChallenge', UserChallengeSchema);
const UserChallengePool = mongoose.model('UserChallengePool', UserChallengePoolSchema);
const UserBadge = mongoose.model('UserBadge', userBadgeSchema);
const Goal = mongoose.model('Goal', goalSchema);
const JournalingPrompt = mongoose.model('JournalingPrompt', journalingPromptSchema);

// Create a compound index on user and date for faster queries
dailySummarySchema.index({ user: 1, date: 1 }, { unique: true });

// Add index for faster user-based queries
goalSchema.index({ user: 1, type: 1 });

const DailySummary = mongoose.model('DailySummary', dailySummarySchema);

// At the end of the file, replace the module.exports with:
export default {
    User,
    JournalEntry,
    SentimentAnalysis,
    MoodTracking,
    UserBadge,
    Insight,
    Gamification,
    Badge,
    PromptTemplate,
    Token,
    Notification,
    DailySummary,
    Goal,
    Challenge,
    UserChallenge,
    UserChallengePool,
    JournalingPrompt
  };