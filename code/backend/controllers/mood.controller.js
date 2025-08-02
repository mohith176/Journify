import models from '../models/user.model.js';

// Helper functions for mood intensity conversion
const getMoodIntensity = (mood) => {
  if (!mood) return 3; // Return neutral if mood is undefined
  
  switch (mood.toLowerCase()) {
    case 'horrible': return 1;
    case 'sad': return 2;
    case 'neutral': return 3;
    case 'happy': return 4;
    case 'great': return 5;
    default: return 3; // Default to neutral
  }
};
// Convert intensity back to mood category
const getMoodByIntensity = (intensity) => {
  if (intensity <= 1.5) return 'Horrible';
  if (intensity <= 2.5) return 'Sad';
  if (intensity <= 3.5) return 'Neutral';
  if (intensity <= 4.5) return 'Good';
  return 'Great'; // Default to neutral
};

// Track a new mood
export const trackMood = async (req, res) => {
  try {
    const { userId, mood, time, notes } = req.body;
    
    if (!userId || !mood) {
      return res.status(400).json({ error: "User ID and mood are required" });
    }

    // Get the date portion only (without time) to group by day
    const today = new Date(time || Date.now());
    today.setHours(0, 0, 0, 0);
    
    // Check if there's already an entry for today
    let moodEntry = await models.MoodTracking.findOne({
      user: userId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (moodEntry) {
      // Update existing entry
      moodEntry.moods.push({
        mood: mood,
        time: new Date(time || Date.now())
      });
      
      // If notes provided, update notes
      if (notes) {
        moodEntry.notes = moodEntry.notes 
          ? `${moodEntry.notes}\n${notes}` 
          : notes;
      }
      
      const avgIntensity = Math.round(
        moodEntry.moods.reduce((sum, m) => sum + getMoodIntensity(m.mood), 0) / moodEntry.moods.length
      );
      moodEntry.dailyAverage = {
        mood: getMoodByIntensity(avgIntensity),
        intensity: avgIntensity
      };
      //console.log("[DEBUG] Updated mood entry:", moodEntry);
      
      await moodEntry.save();
    } else {
      // Create new entry
      const moodIntensity = getMoodIntensity(mood);
      moodEntry = new models.MoodTracking({
        user: userId,
        date: today,
        moods: [{
          mood: mood,
          time: new Date(time || Date.now())
        }],
        dailyAverage: {
          mood: mood,
          intensity: moodIntensity
        },
        notes: notes || ''
      }); 
      
      await moodEntry.save();
    }
    
    res.json({ 
      success: true,
      message: "Mood tracked successfully",
      moodEntry
    });
  } catch (error) {
    console.error("Error tracking mood:", error);
    res.status(500).json({ error: "Failed to track mood" });
  }
};

// Get mood history for a user - modified to return daily averages for the last 30 days
export const getMoodHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Get moods from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Find mood entries and only select the dailyAverage and date fields
    const moodEntries = await models.MoodTracking.find({
      user: userId,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: -1 }).lean();
    
    
    // Transform the data to include just what's needed for a line chart
    const dailyAverages = moodEntries.map(entry => ({
      date: entry.date,
      intensity: entry.dailyAverage?.intensity || 0,
      mood: entry.dailyAverage?.mood || 'neutral'
    }));
    
    res.json(dailyAverages);
  } catch (error) {
    console.error("Error getting mood history:", error);
    res.status(500).json({ error: "Failed to get mood history" });
  }
};
// 
export const getMoodDistribution = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query; // Get date range from query parameters

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Use provided date range or default to last 30 days
    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      console.log(`Using date range: ${start.toISOString()} to ${end.toISOString()}`);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 30);
      end = new Date();
      console.log("No date range provided, using last 30 days");
    }

    if (!models || !models.MoodTracking) {
      return res.status(500).json({ error: "Database models not properly initialized" });
    }

    // Fetch mood entries within the date range
    const moodEntries = await models.MoodTracking.find({
      user: userId,
      date: { 
        $gte: start,
        $lte: end 
      }
    }).sort({ date: -1 }).lean();

    console.log(`Found ${moodEntries.length} mood entries in the selected period`);

    if (moodEntries.length === 0) {
      return res.json({ success: true, data: null, message: "No mood data available" });
    }

    const moodCounts = { Horrible: 0, Sad: 0, Neutral: 0, Good: 0, Great: 0 };
    let totalMoods = 0;

    moodEntries.forEach((entry) => {
      if (!entry.moods || !Array.isArray(entry.moods)) {
        return;
      }

      entry.moods.forEach(moodEntry => {
        if (moodEntry.mood && moodCounts.hasOwnProperty(moodEntry.mood)) {
          moodCounts[moodEntry.mood]++;
          totalMoods++;
        }
      });
    });

    if (totalMoods === 0) {
      return res.json({ success: true, data: null, message: "No mood data available" });
    }

    // Return actual counts instead of percentages
    console.log("Mood distribution counts:", moodCounts);
    
    res.json({ success: true, data: moodCounts });
  } catch (error) {
    console.error("Error getting mood distribution:", error);

    res.status(500).json({
      error: "Failed to get mood distribution",
      message: error.message
    });
  }
};
  