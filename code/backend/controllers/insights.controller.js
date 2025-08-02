import models from '../models/user.model.js';
import natural from 'natural';
import stopwords from 'stopword';

/**
 * Get word cloud data from a user's journal entries
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const getWordCloudData = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { timeRange = 'all', limit = 50 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Set date range based on timeRange parameter
    let dateFilter = {};
    const now = new Date();
    
    if (timeRange === 'week') {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      dateFilter = { createdAt: { $gte: oneWeekAgo } };
    } else if (timeRange === 'month') {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      dateFilter = { createdAt: { $gte: oneMonthAgo } };
    } else if (timeRange === 'year') {
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      dateFilter = { createdAt: { $gte: oneYearAgo } };
    }
    
    // Find journal entries
    const entries = await models.JournalEntry.find({
      user: userId,
      ...dateFilter
    }).sort({ createdAt: -1 });
    
    if (entries.length === 0) {
      return res.status(404).json({
        message: "No journal entries found for the specified time range",
        wordCloud: []
      });
    }
    
    // Combine all entry content
    const allText = entries.map(entry => entry.content).join(' ');
    
    // Tokenize the text
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(allText.toLowerCase());
    
    // Remove stopwords (common words like "the", "and", etc.)
    const filteredTokens = stopwords.removeStopwords(tokens);
    
    // Count word frequencies
    const wordFrequency = {};
    filteredTokens.forEach(word => {
      // Only count words with 3 or more characters
      if (word.length >= 3) {
        if (wordFrequency[word]) {
          wordFrequency[word]++;
        } else {
          wordFrequency[word] = 1;
        }
      }
    });
    
    // Convert to array and sort by frequency
    const wordCloudData = Object.keys(wordFrequency).map(word => ({
      text: word,
      value: wordFrequency[word]
    })).sort((a, b) => b.value - a.value).slice(0, limit);
    
    res.json({
      timeRange,
      totalEntries: entries.length,
      wordCount: wordCloudData.reduce((sum, item) => sum + item.value, 0),
      wordCloud: wordCloudData
    });
  } catch (error) {
    console.error("Error generating word cloud data:", error);
    res.status(500).json({ error: "Failed to generate word cloud data", message: error.message });
  }
};