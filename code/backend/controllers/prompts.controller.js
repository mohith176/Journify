import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import models from '../models/user.model.js';

// Initialize OpenAI chat model for generating prompts
const promptGenerator = new ChatOpenAI({
  model: "gpt-4.1-nano", 
  temperature: 0.8,
  openAIApiKey: process.env.OPENAI_API_KEY_LOCAL,
  maxTokens: 100
});

// Prompt template for generating journaling prompts based on previous entries
// Prompt template for generating journaling prompts based on previous entries
const promptGenerationTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a specialized journaling prompt generator. Your task is to analyze a journal entry and create a thought-provoking question that encourages self-reflection related to the themes in the entry.

Rules for generating prompts:
1. Create ONE single, focused question that relates to the themes, emotions, or situations described in the journal entry
2. Frame the question in first-person perspective (using "I", "my", "me")
3. Make the prompt open-ended to encourage reflection rather than yes/no answers
4. Keep the prompt concise (under 15 words when possible)
5. Avoid directly referencing specific details from the entry
6. Focus on emotions, patterns, personal growth, relationships, or values
7. The prompt should gently guide the user to explore their thoughts deeper

Examples:

Entry: "Work has been overwhelming lately. I have so many deadlines and my boss keeps adding more tasks. I'm feeling stressed and don't know how to manage it all."
Prompt: How might I create boundaries that protect my wellbeing during stressful periods?

Entry: "I had an argument with my friend yesterday. I feel like they don't understand my perspective, but maybe I wasn't clear. I hate conflict."
Prompt: When do I find it most difficult to express my needs in relationships?

Entry: "I'm excited about my upcoming vacation. It's been a long time since I've taken time off, and I really need this break."
Prompt: What does true rest look like for me?

Entry: "I've been procrastinating on my personal project again. I want to finish it but something holds me back every time I try to work on it."
Prompt: What fears might be hiding behind my procrastination?

Entry: "I keep comparing myself to others on social media and feeling inadequate. I know it's not healthy but I can't stop."
Prompt: How do external comparisons influence my sense of self-worth?

Entry: "I'm feeling proud of how I handled that difficult conversation with my partner. We actually listened to each other for once."
Prompt: What communication approaches bring me closer to authentic connection?

Entry: "I'm at a crossroads in my career. I could stay where I am and be comfortable, or take a risk on something new."
Prompt: When have my biggest risks led to meaningful growth?

Entry: "I've been feeling disconnected from my friends lately. Everyone's busy with their own lives and I feel lonely."
Prompt: How might I nurture meaningful connections during periods of isolation?

Entry: "I realized today how much my childhood experiences still affect how I react to criticism. I get defensive immediately."
Prompt: How do past wounds shape my present responses?

Respond ONLY with the prompt question, nothing else.`
  ],
  ["user", "Journal entry:\n{entryContent}\n\nGenerate a reflective journaling prompt:"]
]);

// Minimum word count for an entry to generate a prompt from
const MIN_ENTRY_WORD_COUNT = 20;

/**
 * Generate journaling prompts based on a user's recent entries
 * @param {string} userId - The user's ID
 * @param {number} count - Number of prompts to generate (default: 3)
 * @returns {Array} - Array of generated prompts
 */
export const generatePromptsForUser = async (userId, count = 3) => {
  try {
    // First, check if we have enough unused existing prompts
    const unusedExistingPrompts = await models.JournalingPrompt.find({
      user: userId,
      used: false
    }).sort({ createdAt: -1 });
    
    if (unusedExistingPrompts.length >= count) {
      return {
        success: true,
        prompts: unusedExistingPrompts.slice(0, count),
        source: "unused_existing"
      };
    }
    
    // Get the 10 most recent journal entries to analyze
    const recentEntries = await models.JournalEntry.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    if (recentEntries.length === 0) {
      // No entries to base prompts on, generate fallback prompts
      const fallbackPrompts = await generateFallbackPrompts(userId, count);
      return {
        success: true,
        prompts: fallbackPrompts,
        source: "fallback_only"
      };
    }

    // Filter entries by minimum word count
    const eligibleEntries = recentEntries.filter(entry => {
      const wordCount = entry.content.split(/\s+/).length;
      return wordCount >= MIN_ENTRY_WORD_COUNT;
    });
    
    if (eligibleEntries.length === 0) {
      // No eligible entries, use fallback prompts plus any unused existing ones
      const neededFallbacks = count - unusedExistingPrompts.length;
      const fallbackPrompts = await generateFallbackPrompts(userId, neededFallbacks);
      
      return {
        success: true,
        prompts: [...unusedExistingPrompts, ...fallbackPrompts].slice(0, count),
        source: "fallback_with_existing"
      };
    }

    // Check if we've already generated prompts for these entries
    const existingPrompts = await models.JournalingPrompt.find({
      user: userId,
      basedOnEntryId: { $in: eligibleEntries.map(entry => entry._id) }
    });

    // Get entries we haven't generated prompts for yet
    const entriesWithoutPrompts = eligibleEntries.filter(entry => 
      !existingPrompts.some(prompt => 
        prompt.basedOnEntryId && prompt.basedOnEntryId.toString() === entry._id.toString()
      )
    );

    // Generate new prompts as needed
    const newPrompts = [];
    for (const entry of entriesWithoutPrompts) {
      if (newPrompts.length + unusedExistingPrompts.length >= count) break;

      try {
        // Generate a prompt based on this entry
        const promptResponse = await promptGenerator.invoke(
          await promptGenerationTemplate.invoke({ entryContent: entry.content })
        );

        const promptText = promptResponse.content.trim();
        
        // Create and save the new prompt
        const newPrompt = new models.JournalingPrompt({
          user: userId,
          prompt: promptText,
          basedOnEntryId: entry._id,
          relevantThemes: entry.moods || [],
          used: false
        });

        await newPrompt.save();
        newPrompts.push(newPrompt);
      } catch (genError) {
        console.error(`Error generating prompt for entry ${entry._id}:`, genError);
        // Continue to the next entry if one fails
      }
    }

    // If we still don't have enough prompts, consider used prompts
    let allPrompts = [...unusedExistingPrompts, ...newPrompts];
    
    if (allPrompts.length < count) {
      // Get used prompts as a last resort before fallbacks
      const usedPrompts = await models.JournalingPrompt.find({
        user: userId,
        used: true
      }).sort({ createdAt: -1 }).limit(count - allPrompts.length);
      
      allPrompts = [...allPrompts, ...usedPrompts];
    }
    
    // If we STILL don't have enough prompts, generate fallbacks
    if (allPrompts.length < count) {
      const neededFallbacks = count - allPrompts.length;
      const fallbackPrompts = await generateFallbackPrompts(userId, neededFallbacks);
      allPrompts = [...allPrompts, ...fallbackPrompts];
    }
    
    return {
      success: true,
      prompts: allPrompts.slice(0, count),
      source: newPrompts.length > 0 ? "mixed_sources" : "existing_only"
    };
  } catch (error) {
    console.error("Error generating journaling prompts:", error);
    return {
      success: false,
      message: "Failed to generate prompts",
      error: error.message
    };
  }
};

/**
 * Generate fallback prompts that aren't based on specific entries
 * @param {string} userId - The user's ID
 * @param {number} count - Number of prompts to generate
 * @returns {Array} - Array of generated prompt documents
 */
const generateFallbackPrompts = async (userId, count) => {
  // List of general reflection prompts when we can't use the user's history
  const fallbackPromptTemplates = [
    "What am I grateful for today that I often take for granted?",
    "What small win am I proud of this week?",
    "How do my current habits align with my future goals?",
    "What brings me a sense of peace during challenging moments?",
    "Which relationship in my life needs more attention right now?",
    "What boundaries do I need to establish or maintain?",
    "When did I last feel fully present, and what made that moment special?",
    "How do I typically respond to uncertainty, and is that serving me well?",
    "What worries me most about tomorrow, and how can I prepare for it?",
    "What am I learning about myself through recent challenges?",
    "How do my surroundings affect my mental state?",
    "What conversation am I avoiding, and why?",
    "What personal strengths helped me through past difficulties?",
    "How do I distinguish between intuition and fear?",
    "When do I feel most connected to my authentic self?",
    "What would I do differently if no one was watching or judging me?",
    "What memories bring me comfort when I'm feeling low?",
    "How have my priorities changed in the past year?",
    "What activity makes me lose track of time in a good way?",
    "What do I need to forgive myself for?"
  ];

  // Shuffle the array to get random prompts
  const shuffled = [...fallbackPromptTemplates]
    .sort(() => 0.5 - Math.random())
    .slice(0, count);
  
  // Create and save the prompts
  const savedPrompts = [];
  for (const promptText of shuffled) {
    const newPrompt = new models.JournalingPrompt({
      user: userId,
      prompt: promptText,
      relevantThemes: ["general", "reflection"],
      used: false
    });
    
    await newPrompt.save();
    savedPrompts.push(newPrompt);
  }
  
  return savedPrompts;
};

/**
 * API endpoint to get journaling prompts for a user
 */
export const getJournalingPrompts = async (req, res) => {
  try {
    const userId = req.params.userId;
    const count = parseInt(req.query.count) || 3;
    
    const result = await generatePromptsForUser(userId, count);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    // Return just the relevant prompt data to the frontend
    const promptData = result.prompts.map(prompt => ({
      id: prompt._id,
      text: prompt.prompt,
      themes: prompt.relevantThemes || [],
      isUsed: prompt.used
    }));
    
    res.json({
      success: true,
      prompts: promptData,
      source: result.source || "mixed"
    });
  } catch (error) {
    console.error("Error retrieving journaling prompts:", error);
    res.status(500).json({ 
      error: "Failed to retrieve journaling prompts", 
      message: error.message 
    });
  }
};

/**
 * Mark a prompt as used
 */
export const markPromptAsUsed = async (req, res) => {
  try {
    const { promptId } = req.params;
    
    const prompt = await models.JournalingPrompt.findById(promptId);
    
    if (!prompt) {
      return res.status(404).json({ error: "Prompt not found" });
    }
    
    // Mark as used
    prompt.used = true;
    await prompt.save();
    
    res.json({
      success: true,
      message: "Prompt marked as used"
    });
  } catch (error) {
    console.error("Error marking prompt as used:", error);
    res.status(500).json({ 
      error: "Failed to mark prompt as used", 
      message: error.message 
    });
  }
};

/**
 * Get all journaling prompts for a user (for admin/debugging)
 */
export const getAllUserPrompts = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const prompts = await models.JournalingPrompt.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('basedOnEntryId', 'title createdAt');
    
    res.json({
      success: true,
      count: prompts.length,
      prompts: prompts.map(p => ({
        id: p._id,
        text: p.prompt,
        used: p.used,
        basedOn: p.basedOnEntryId ? {
          id: p.basedOnEntryId._id,
          title: p.basedOnEntryId.title,
          date: p.basedOnEntryId.createdAt
        } : null,
        themes: p.relevantThemes,
        createdAt: p.createdAt
      }))
    });
  } catch (error) {
    console.error("Error retrieving all journaling prompts:", error);
    res.status(500).json({ 
      error: "Failed to retrieve all journaling prompts", 
      message: error.message 
    });
  }
};