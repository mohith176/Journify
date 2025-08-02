import models from '../models/user.model.js';
import mongoose from 'mongoose';

export const analyzeScore = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(0); // Use epoch if no start date
    const end = endDate ? new Date(endDate) : new Date();        // Use current date if no end date
    
    // Set the end date to the end of the day
    end.setHours(23, 59, 59, 999);
    
    console.log(`Fetching sentiment data for user ${userId} from ${start.toISOString()} to ${end.toISOString()}`);
    
    // First get all journal entries for this user in the date range
    const journalEntries = await models.JournalEntry.find({
      user: userId,
      createdAt: {
        $gte: start,
        $lte: end
      }
    }).sort({ createdAt: 1 });
    
    console.log(`Found ${journalEntries.length} journal entries`);
    
    if (journalEntries.length === 0) {
      return res.json([]);
    }
    
    // Get the IDs of all journal entries
    const journalIds = journalEntries.map(entry => entry._id);
    
    // Find sentiment analyses for these journal entries
    const sentimentAnalyses = await models.SentimentAnalysis.find({
      journalEntry: { $in: journalIds }
    });
    
    console.log(`Found ${sentimentAnalyses.length} sentiment analyses`);
    
    // Create a map for quick lookup
    const analysisMap = {};
    sentimentAnalyses.forEach(analysis => {
      analysisMap[analysis.journalEntry.toString()] = analysis;
    });
    
    // Combine journal entries with their sentiment analyses
    const result = journalEntries.map(entry => {
      const analysis = analysisMap[entry._id.toString()];
      
      return {
        id: entry._id,
        title: entry.title,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        nltkScores: analysis ? analysis.nltkScores : {
          positive: 0.33,
          negative: 0.33,
          neutral: 0.34,
          compound: 0,
          sentiment: "neutral"
        }
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error("Error analyzing scores:", error);
    res.status(500).json({ error: "Failed to analyze scores", details: error.message });
  }
};