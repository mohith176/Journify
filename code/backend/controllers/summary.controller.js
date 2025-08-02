import models from '../models/user.model.js';

// Get all summaries and insights for a user
export const getUserSummaries = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Find all journal entries for the user
    const journalEntries = await models.JournalEntry.find({ user: userId })
      .sort({ createdAt: -1 }) // Sort by newest first
      .lean();
    
    // Get the IDs of all journal entries
    const entryIds = journalEntries.map(entry => entry._id);
    
    // Find all sentiment analyses for these entries
    const sentimentAnalyses = await models.SentimentAnalysis.find({
      journalEntry: { $in: entryIds }
    }).lean();
    
    // Create a map of journal entry ID to sentiment analysis
    const analysisMap = {};
    sentimentAnalyses.forEach(analysis => {
      analysisMap[analysis.journalEntry.toString()] = analysis;
    });
    
    // Combine journal entries with their analyses
    const summaries = journalEntries.map(entry => {
      const analysis = analysisMap[entry._id.toString()] || {};
      return {
        id: entry._id,
        title: entry.title,
        date: entry.createdAt,
        content: entry.content,
        moods: entry.moods || [],
        summary: analysis.summary || "",
        emotions: analysis.emotions || [],
        insights: analysis.insights || [],
        themes: analysis.themes || []
      };
    });
    
    res.json({ summaries });
  } catch (error) {
    console.error("Error fetching summaries:", error);
    res.status(500).json({ error: "Failed to fetch summaries" });
  }
};

// Search summaries by text
export const searchSummaries = async (req, res) => {
  try {
    const { userId } = req.params;
    const { query, startDate, endDate } = req.query;
    
    console.log("Search params:", { userId, query, startDate, endDate });
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Make sure userId is a valid ObjectId string
    if (typeof userId !== 'string' || userId.length !== 24) {
      try {
        // If it's a JSON string, try to parse it and extract the _id
        const parsedUserId = JSON.parse(userId);
        userId = parsedUserId._id || userId;
      } catch (e) {
        console.log("Not a JSON string, using as is");
      }
    }
    
    // Build the search query for date filtering
    let dateFilter = {};
    if (startDate || endDate) {
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.$lte = new Date(endDate);
      }
    }
    
    console.log("Date filter:", dateFilter);
    
    // Find all journal entries for this user with date filter if provided
    let journalQuery = { user: userId };
    if (Object.keys(dateFilter).length > 0) {
      journalQuery.createdAt = dateFilter;
    }
    
    console.log("Journal query:", journalQuery);
    
    let journalEntries = await models.JournalEntry.find(journalQuery)
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Found ${journalEntries.length} journal entries`);
    
    // Get entry IDs
    const entryIds = journalEntries.map(entry => entry._id);
    
    // Find all sentiment analyses
    const sentimentAnalyses = await models.SentimentAnalysis.find({
      journalEntry: { $in: entryIds }
    }).lean();
    
    // Create a map for quicker lookups
    const analysisMap = {};
    sentimentAnalyses.forEach(analysis => {
      analysisMap[analysis.journalEntry.toString()] = analysis;
    });
    
    // Combine entries with their analyses
    const combinedEntries = journalEntries.map(entry => {
      const analysis = analysisMap[entry._id.toString()] || {};
      return {
        id: entry._id,
        title: entry.title || '',
        date: entry.createdAt,
        content: entry.content || '',
        moods: entry.moods || [],
        aiConversation: entry.aiConversation || [],
        summary: analysis.summary || '',
        emotions: analysis.emotions || [],
        insights: analysis.insights || [],
        themes: analysis.themes || []
      };
    });
    
    // If a search query is provided, filter the combined entries
    let filteredResults = combinedEntries;
    
    if (query && query.trim() !== '') {
      const searchRegex = new RegExp(query, 'i');
      
      filteredResults = combinedEntries.filter(entry => {
        // Check title and content (from journal entry)
        if (entry.title && searchRegex.test(entry.title)) return true;
        if (entry.content && searchRegex.test(entry.content)) return true;
        
        // Check AI conversation messages
        if (entry.aiConversation && entry.aiConversation.length > 0) {
          for (const message of entry.aiConversation) {
            if (message.content && searchRegex.test(message.content)) {
              return true;
            }
          }
        }
        
        // Check summary
        if (entry.summary && searchRegex.test(entry.summary)) return true;
        
        // Check insights (array of strings)
        if (entry.insights && entry.insights.length > 0) {
          for (const insight of entry.insights) {
            if (searchRegex.test(insight)) return true;
          }
        }
        
        // Check emotions (array of strings)
        if (entry.emotions && entry.emotions.length > 0) {
          for (const emotion of entry.emotions) {
            if (searchRegex.test(emotion)) return true;
          }
        }
        
        // Check themes (array of strings)
        if (entry.themes && entry.themes.length > 0) {
          for (const theme of entry.themes) {
            if (searchRegex.test(theme)) return true;
          }
        }
        
        // No match found in any field
        return false;
      });
    }
    
    // Format the results for the frontend
    const results = filteredResults.map(entry => ({
      id: entry.id,
      title: entry.title,
      date: entry.date,
      content: entry.content,
      moods: entry.moods,
      summary: entry.summary,
      emotions: entry.emotions,
      insights: entry.insights,
      themes: entry.themes
    }));
    
    console.log(`Returning ${results.length} results after filtering`);
    res.json({ results });
  } catch (error) {
    console.error("Error searching summaries:", error);
    res.status(500).json({ error: "Failed to search summaries" });
  }
};

export const getLatestUserInsights = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Find the latest journal entries for this user
    const journalEntries = await models.JournalEntry.find({ user: userId })
      .sort({ createdAt: -1 }) // Sort by newest first
      .lean();
    
    // Get the IDs of all journal entries
    const entryIds = journalEntries.map(entry => entry._id);
    
    // Find sentiment analyses that have insights for these entries
    const sentimentAnalyses = await models.SentimentAnalysis.find({
      journalEntry: { $in: entryIds },
      insights: { $exists: true, $ne: [] } // Only get analyses that have non-empty insights
    })
    .sort({ createdAt: -1 }) // Sort by newest first
    .lean();
    
    // Extract all insights with their dates
    let allInsights = [];
    
    sentimentAnalyses.forEach(analysis => {
      // Find the corresponding journal entry to get its date
      const journalEntry = journalEntries.find(
        entry => entry._id.toString() === analysis.journalEntry.toString()
      );
      
      if (journalEntry && analysis.insights && analysis.insights.length > 0) {
        analysis.insights.forEach(insight => {
          allInsights.push({
            insight,
            date: journalEntry.createdAt,
            entryId: journalEntry._id
          });
        });
      }
    });
    
    // Sort insights by date (newest first) and take the top 3 (or all if less than 3)
    allInsights.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestInsights = allInsights.slice(0, 3);
    
    res.json({ 
      insights: latestInsights,
      total: allInsights.length 
    });
    
  } catch (error) {
    console.error("Error fetching latest insights:", error);
    res.status(500).json({ error: "Failed to fetch latest insights" });
  }
};