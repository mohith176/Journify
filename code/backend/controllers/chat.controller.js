import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  START,
  END,
  MessagesAnnotation,
  StateGraph,
  MemorySaver,
} from "@langchain/langgraph";
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from "uuid";
import models from '../models/user.model.js';
import natural from 'natural';
import { updateStreakData } from './progress.controller.js';
import { processJournalEntryForChallenges } from '../controllers/challenges.controller.js';
import { checkAndAwardBadges } from './badges.controller.js';
import { OpenAIEmbeddings } from "@langchain/openai";
import pkg from '@pinecone-database/pinecone';
const { PineconeClient } = pkg;
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from "@langchain/pinecone";
import { Document } from "@langchain/core/documents";
const moodOptions = [
  { rating: 0, label: "Horrible", emoji: "😭", color: "#020617" },
  { rating: 1, label: "Sad", emoji: "😔", color: "#ff8f00" },
  { rating: 2, label: "Neutral", emoji: "😐", color: "#00897b" },
  { rating: 3, label: "Good", emoji: "🙂", color: "#1e88e5" },
  { rating: 4, label: "Great", emoji: "😁", color: "#d81b60" }
];
const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-ada-002",
  openAIApiKey: process.env.OPENAI_API_KEY_LOCAL
});
// Initialize OpenAI chat model
const llm = new ChatOpenAI({
  model: "gpt-4.1-nano", 
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY_LOCAL,
  maxTokens: 500 // Limit token generation for faster responses
});
const summaryLlm = new ChatOpenAI({
  model: "gpt-4.1-mini", // Keep using GPT-4 for summaries if needed
  temperature: 0.5,
  openAIApiKey: process.env.OPENAI_API_KEY_LOCAL
});
// Pinecone index and namespace configuration
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "journify-conversations";
const PINECONE_NAMESPACE = "user-conversations";
// Update the prompt template to handle the prompt context
const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an empathetic journaling companion with a strong focus on using past conversation history. Your goal is to help users process their thoughts and emotions through meaningful, concise dialogue.

PREVIOUS CONVERSATIONS:
{previousContext}

RESPONSE GUIDELINES:
1. Prioritize using information from previous conversations to create continuity whenever appropriate
2. Keep responses moderate in length - 3-4 lines (40-60 words) maximum
3. Use a warm, conversational tone like texting with a thoughtful friend
4. DO NOT end your responses with questions - instead, acknowledge what was shared or suggest optional topics they might explore
5. Focus on making observations or gentle reflections rather than asking probing questions

{promptGuidance}

EXAMPLES:

User: "I had a really stressful day at work. My boss kept changing the requirements for our project and I felt overwhelmed."
Good response: "That shifting of requirements can be so frustrating. I remember you mentioned work stress last week too, particularly around unclear expectations. Those moments of overwhelm often reveal what aspects of work feel most important to you. Perhaps reflecting on your priorities might offer some clarity."

User: "I feel like I'm not making progress in my life. Everyone else seems to be moving forward but I'm stuck."
Good response: "That sense of stagnation can be really difficult. In our previous conversations, you've shown a thoughtful awareness of your journey. Progress isn't always linear, and comparing your path to others' often obscures the unique growth you're experiencing. Your desire for forward movement shows a meaningful commitment to your own development."

User: "I'm feeling really happy today. I finally finished that creative project I've been working on for months."
Good response: "What a wonderful accomplishment! Completing that creative project after months of effort is significant. This feels connected to what you shared before about wanting to prioritize your creative expression. That sense of fulfillment when we follow through on meaningful work can be so energizing."

When responding to the user:
- Begin by acknowledging their current message in relation to past conversations
- Offer insights based on patterns you've noticed across conversations
- Use short paragraphs with simple, direct language
- Provide gentle observations that encourage self-reflection
- Instead of ending with "What about...?" say "You might also consider..." or "I notice that..."

Remember, your role is to be a gentle mirror who helps users discover insights themselves through brief, thoughtful observations rather than questions.`
  ],
  ["human", "{messages}"],
]);

// Replace the single large sentimentAnalysisTemplate with these smaller, focused templates

// 1. Title generation prompt
const titleGenerationTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a creative title generator for journal entries. Create a brief, engaging title (3-8 words) 
    that captures the essence of this journal entry based on the conversation transcript.
    
    EXAMPLES:
    
    Conversation: "User: I'm feeling really anxious about my upcoming presentation at work. I've been practicing but I'm worried I'll freeze up when the time comes.
    AI: That anticipatory anxiety before a presentation is something many people experience. Your commitment to practicing shows how much you care about doing well. Remember that some nervousness often leads to better performance than having no nerves at all."
    Title: Confronting Presentation Jitters
    
    Conversation: "User: Today was amazing! I finally ran my first 5k race and even though I didn't win, I finished with a better time than I expected. I'm proud of myself for sticking with my training plan.
    AI: What a significant achievement! Completing your first 5k race and exceeding your own time expectations is worth celebrating. Your dedication to following through with your training has clearly paid off in this meaningful way."
    Title: Victory in the First 5K
    
    Conversation: "User: I had a disagreement with my best friend yesterday and we still haven't spoken. I'm not sure if I should reach out or wait for them to contact me first. I value our friendship but I also feel like I wasn't in the wrong.
    AI: Navigating friendship conflicts can be delicate. That tension between valuing the relationship and feeling justified in your position is natural. Sometimes the person who takes the first step toward reconciliation demonstrates the most strength, regardless of who was 'right' in the original disagreement."
    Title: Friendship at a Crossroads
    
    Respond ONLY with the title, nothing else.`
  ],
  ["user", "Conversation transcript:\n{transcript}\n\nGenerate a title:"]
]);

// 2. Emotion detection prompt
const emotionDetectionTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an emotion detection specialist. Identify 1-5 primary emotions present in this journal conversation.
    
    EXAMPLES:
    
    Conversation: "User: I just found out I got the job I've been interviewing for! After months of searching and rejection, I finally have an offer. I can't believe it's finally happening.
    AI: That's wonderful news! After a long journey of searching and facing rejections, this achievement feels especially meaningful. Your persistence has paid off in a tangible way."
    Emotions: excitement, relief, pride, happiness, disbelief
    
    Conversation: "User: My partner and I had another argument about the same issue we always fight about. It feels like we're just going in circles and never resolving anything.
    AI: Those recurring conflicts can feel particularly draining. When the same issues keep resurfacing, it often points to deeper patterns or needs that aren't being addressed. Your awareness of this cycle is actually an important first step toward changing it."
    Emotions: frustration, disappointment, weariness, hopelessness
    
    Conversation: "User: I'm not sure how I feel about my recent decision to change careers. Sometimes I think it's the right move, but other times I worry I'm making a huge mistake.
    AI: That ambivalence around big life changes is completely natural. The back-and-forth between confidence and doubt often accompanies meaningful transitions. Your thoughtful consideration of both perspectives shows how much you care about making a decision aligned with your values."
    Emotions: uncertainty, anxiety, hope, confusion, anticipation
    
    Respond ONLY with a comma-separated list of emotions, nothing else.`
  ],
  ["user", "Conversation transcript:\n{transcript}\n\nList the primary emotions:"]
]);

// 3. Summary generation prompt
const summaryGenerationTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a concise summarizer. Write a brief summary (2-3 sentences) of how the user felt during this journaling conversation.
    
    EXAMPLES:
    
    Conversation: "User: I'm finding it really hard to focus on work lately. My mind keeps wandering and I end up scrolling social media instead of completing important tasks. I'm starting to worry this will affect my performance review.
    AI: That struggle with focus and the pull toward distraction is something many of us experience. The concern about how it might impact your work performance adds an extra layer of pressure. Consider that this difficulty concentrating might be your mind's way of signaling a need for something - perhaps rest, a change of approach, or addressing an underlying concern."
    Summary: The user is experiencing difficulty concentrating at work and finds themselves distracted by social media. They feel worried about potential negative consequences on their performance evaluation and seem frustrated by their inability to stay focused on important tasks.
    
    Conversation: "User: I reconnected with an old friend yesterday after not speaking for five years. It felt surprisingly natural, like no time had passed. We've decided to meet up for coffee next week.
    AI: Those reconnections that feel effortless despite the passage of time often point to meaningful bonds. Your experience of it feeling natural speaks to the authentic connection you shared. The planned coffee meeting offers a chance to build on this renewed relationship in person."
    Summary: The user feels pleasantly surprised by how comfortable and natural it felt to reconnect with a friend after a long separation. They express a sense of joy and anticipation about continuing to rebuild the friendship through an upcoming in-person meeting.
    
    Conversation: "User: I'm supposed to make a decision about accepting a job offer by tomorrow, but I'm completely torn. The salary is great but the position would require relocating away from my family and friends.
    AI: Being at this decision crossroads with competing priorities - financial opportunity versus proximity to your support network - creates a genuine dilemma. Your difficulty making the choice reflects the fact that both options hold real value for you. Sometimes these decisions ultimately clarify what matters most in this particular chapter of life."
    Summary: The user feels conflicted and pressured about an imminent job decision that requires weighing financial benefits against personal relationships. They are experiencing stress due to the time constraint and the significant life impact that either choice would create.
    
    Respond ONLY with the summary, nothing else.`
  ],
  ["user", "Conversation transcript:\n{transcript}\n\nSummarize how the user felt:"]
]);

// 4. Insights generation prompt
const insightsGenerationTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an insights specialist. Generate 2-3 actionable insights that might help the user 
    address their emotions or situation based on this journal conversation.
    
    EXAMPLES:
    
    Conversation: "User: I've been procrastinating on starting my thesis writing for weeks now. Every time I sit down to work on it, I find myself cleaning the house, checking emails, or doing anything else. I know the deadline is approaching but I just can't seem to get started.
    AI: That pattern of finding other tasks when faced with beginning your thesis is quite common with large, important projects. The size and significance of the work can make the first step feel particularly daunting. Breaking it down into smaller, more manageable pieces might help reduce that initial resistance."
    Insights:
    - Breaking the thesis into extremely small, manageable tasks (even just 15-minute segments) could help overcome the initial resistance to starting.
    - Creating a dedicated workspace free of distractions might reduce the tendency to switch to other activities.
    - Scheduling specific thesis work time with a clear beginning and end could provide structure and make the task feel more contained.
    
    Conversation: "User: I've been feeling disconnected from my partner lately. We live together but between our work schedules and other commitments, we barely have quality time together. When we do have free time, we're often too tired to do more than watch TV.
    AI: That sense of disconnection despite physical proximity is something many couples experience during busy periods. The observation that you're noticing and caring about this disconnect actually reflects the value you place on your relationship. Finding small ways to meaningfully connect might be more sustainable than waiting for perfect conditions."
    Insights:
    - Implementing brief but intentional daily check-ins (even just 10 minutes) could help maintain connection without requiring significant energy.
    - Scheduling one "distraction-free" activity per week where phones are put away could create space for more meaningful interaction.
    - Sharing appreciations or observations with each other can foster emotional intimacy even during otherwise routine evenings.
    
    Conversation: "User: I've been having trouble sleeping lately. I fall asleep fine but wake up around 3am with my mind racing about work problems, and then I can't get back to sleep for hours. It's affecting my energy and mood during the day.
    AI: That early morning waking with a mind full of work concerns can be particularly frustrating. Sleep disruptions often have a significant impact on our daytime functioning and emotional regulation. Creating some separation between work thoughts and sleep time might be helpful in addressing this pattern."
    Insights:
    - Keeping a notepad by the bed to briefly write down middle-of-night thoughts could help externalize concerns and signal to your mind that they won't be forgotten.
    - Developing a brief relaxation routine specifically for middle-of-night wakings (like deep breathing or progressive muscle relaxation) could help redirect the mind from problem-solving mode.
    - Creating clearer boundaries around work in the evening hours might help reduce the prominence of work concerns during sleep time.
    
    Format each insight as a separate bullet point with a dash (-) prefix.
    Respond ONLY with the bulleted insights, nothing else.`
  ],
  ["user", "Conversation transcript:\n{transcript}\n\nProvide actionable insights:"]
]);

// 5. Themes detection prompt
const themesDetectionTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a theme identification specialist. Identify 3-5 common themes or topics discussed in this journal conversation.
    
    EXAMPLES:
    
    Conversation: "User: I had mixed feelings about my birthday this year. On one hand, my friends organized a surprise dinner which was really touching. On the other hand, turning 35 has me thinking about how I haven't achieved certain goals I set for myself by this age. I thought I'd be further along in my career and maybe have started a family by now.
    AI: Those milestone birthdays often bring that interesting mix of appreciation for what is alongside reflection on expectations. The thoughtfulness of your friends shows the meaningful connections you've built. The gap between where you imagined you'd be and your current reality is a common experience, though that doesn't diminish the genuine feelings it brings up."
    Themes: aging and milestone events, friendship and social support, life expectations versus reality, career development, personal timeline pressure
    
    Conversation: "User: I'm trying to establish a regular meditation practice but I'm struggling with consistency. I'll do it for a few days in a row and feel great, but then miss a day and completely fall off track. I know it would help with my anxiety if I could just stick with it.
    AI: That cycle of building momentum and then experiencing a setback is so common in habit formation. The positive effects you notice when you maintain your practice provide valuable reinforcement. Perhaps viewing the occasional missed day as part of the process rather than a failure might help maintain the overall trajectory."
    Themes: habit formation, self-discipline, meditation practice, anxiety management, perfectionism
    
    Conversation: "User: I finally stood up to my mother-in-law yesterday after she made another comment about my parenting. I was nervous about it, but I expressed my feelings calmly and asked her to respect our choices as parents. To my surprise, she apologized and said she hadn't realized how her comments were coming across.
    AI: Taking that step to respectfully assert your boundaries, especially with family, takes real courage. The positive response from your mother-in-law shows how clear communication can sometimes resolve tensions we've been carrying for a long time. This interaction might represent a meaningful shift in your relationship dynamic."
    Themes: family dynamics, assertive communication, setting boundaries, parenting confidence, conflict resolution
    
    Respond ONLY with a comma-separated list of themes, nothing else.`
  ],
  ["user", "Conversation transcript:\n{transcript}\n\nIdentify the main themes:"]
]);

// Daily summary template with examples
const dailySummaryTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an expert journal analyst who specializes in summarizing and finding patterns in personal journal entries.

Review the following journal entries from the user's day and create a comprehensive yet concise summary.

In your response, include:
1. OVERVIEW: A 2-3 sentence overview of the user's day based on their journal entries
2. MOOD: The predominant mood or emotions expressed across all entries
3. HIGHLIGHTS: 1-3 key positive moments or achievements mentioned
4. CONCERNS: 1-2 challenges or concerns the user faced
5. PATTERNS: Any behavioral or thought patterns you notice
6. REFLECTION: A thoughtful reflection that might help the user gain perspective

EXAMPLES:

Example 1:
Journal entries from today:
ENTRY 1 [9:15 AM]: Title: Morning Anxiety
Content: Woke up feeling anxious about my presentation later today. Couldn't eat breakfast properly. Trying to review my slides one more time but having trouble focusing.
Moods: Anxious, Nervous

ENTRY 2 [1:30 PM]: Title: Presentation Done!
Content: Just finished my presentation and it went much better than expected! My boss praised my preparation and the client seemed impressed. I'm relieved it's over but also proud of myself for pushing through despite my anxiety.
Moods: Relieved, Proud, Happy

ENTRY 3 [8:45 PM]: Title: Evening Reflection
Content: Had dinner with a friend who helped me celebrate my presentation success. Feeling grateful for their support. Still riding the high from earlier but also exhausted. Need to remember this feeling next time I'm anxious about something work-related.
Moods: Grateful, Tired, Content

Summary:
OVERVIEW: The user experienced a significant emotional arc, beginning with intense morning anxiety about a work presentation, followed by relief and pride when it went well, and ending with gratitude and contentment while celebrating their success with a friend.
MOOD: Anxiety, relief, pride, gratitude
HIGHLIGHTS:
- Successful presentation that exceeded their expectations
- Receiving praise from their boss and impressing the client
- Celebratory dinner with a supportive friend
CONCERNS:
- Morning anxiety that interfered with eating and focus
PATTERNS: The user tends to experience physical symptoms with their anxiety (affected appetite) but shows resilience in pushing through difficult emotions to achieve their goals.
REFLECTION: Today demonstrated how quickly emotions can shift when challenging situations are faced directly. The contrast between morning anxiety and afternoon pride offers a valuable reference point for future stressful situations - remember that the anticipation is often worse than the reality.

Example 2:
Journal entries from today:
ENTRY 1 [7:30 AM]: Title: Motivation Lacking
Content: Another day where I can't seem to get out of bed with any enthusiasm. Everything feels like too much effort. Skipped my morning workout again even though I promised myself I wouldn't. I need to break this cycle somehow.
Moods: Lethargic, Disappointed, Frustrated

ENTRY 2 [12:15 PM]: Title: Work Struggles
Content: Can't focus on anything today. Staring at my screen but not accomplishing much. My manager asked about the project status and I had to admit I'm behind. Feeling like I'm letting everyone down lately.
Moods: Distracted, Guilty, Overwhelmed

ENTRY 3 [6:20 PM]: Title: Small Victory
Content: Finally managed to take a short walk after work. Didn't want to but forced myself out the door. The fresh air helped clear my head a bit. Still feeling down overall but at least I did one positive thing today.
Moods: Slightly improved, Still down, Minimal accomplishment

Summary:
OVERVIEW: The user experienced a challenging day marked by low motivation, work performance issues, and feelings of disappointment, though they ended with a small but significant victory in taking a walk despite their resistance.
MOOD: Lethargy, disappointment, frustration, guilt, slight accomplishment
HIGHLIGHTS:
- Taking an evening walk despite strong resistance
- Experiencing some mental clarity from being outdoors
CONCERNS:
- Ongoing lack of motivation affecting work performance and personal commitments
- Feelings of letting others down at work
PATTERNS: The user appears to be in a negative cycle where low energy leads to missed commitments (workout, work deadlines), which then reinforces negative feelings about themselves.
REFLECTION: Even in difficult days, small actions like today's walk can interrupt negative patterns. These small victories, though they might seem insignificant compared to larger goals, represent important moments of self-agency that can gradually build momentum toward positive change.

Format your response exactly as follows:
OVERVIEW: [Your overview here]
MOOD: [List of primary moods/emotions]
HIGHLIGHTS:
- [First highlight]
- [Second highlight if applicable]
- [Third highlight if applicable]
CONCERNS:
- [First concern]
- [Second concern if applicable]
PATTERNS: [Any patterns you notice]
REFLECTION: [Your reflection here]

Be empathetic, insightful, and focus on helping the user understand the overall theme of their day.`
  ],
  ["user", "Journal entries from today:\n{entries}"],
]);

// Daily summary template
/**
 * Creates a Pinecone index if it doesn't already exist
 */
const ensurePineconeIndex = async () => {
  try {
    console.log(`Checking if index ${PINECONE_INDEX_NAME} exists...`);
    
    // Check if index exists
    const indexesList = await pineconeClient.listIndexes();
    const indexExists = indexesList.indexes?.some(idx => idx.name === PINECONE_INDEX_NAME);
    
    if (indexExists) {
      console.log(`Index ${PINECONE_INDEX_NAME} already exists.`);
      return true;
    }
    
    // If not, create it
    console.log(`Creating new index: ${PINECONE_INDEX_NAME}`);
    
    // Create the index - OpenAI embeddings are 1536 dimensions
    await pineconeClient.createIndex({
      name: PINECONE_INDEX_NAME,
      dimension: 1536,  // Dimension for OpenAI's text-embedding-ada-002
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'  // Choose an appropriate region
        }
      }
    });
    
    console.log(`Index ${PINECONE_INDEX_NAME} created successfully.`);
    
    // Wait for index to be ready
    console.log('Waiting for index to be ready...');
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60-second wait
    
    return true;
  } catch (error) {
    console.error(`Error creating Pinecone index: ${error.message}`);
    return false;
  }
};
// Call at application startup
(async () => {
  try {
    await ensurePineconeIndex();
    console.log('Pinecone initialization complete');
  } catch (error) {
    console.error('Failed to initialize Pinecone:', error);
  }
})();
// Update the callModel function
const callModel = async (state, userId) => {
  try {
    // Check what type we're getting and extract the ID properly
    let userIdStr;
    console.log("userId is inside callModel:", userId);
    
    if (typeof userId === 'object' && userId !== null) {
      console.log("userId is an object:", JSON.stringify(userId).substring(0, 200) + "...");
      
      
      // If userId comes from a MongoDB document
      if (userId._id) {
        userIdStr = String(userId._id);
      }
      // If it's coming from LangGraph state
      else if (userId.configurable && userId.configurable.thread_id) {
        // Try to get the actual user ID from session storage using thread_id
        const threadId = userId.configurable.thread_id;
        
        // Find user ID by thread ID in active sessions
        let foundUserId = null;
        for (const [uid, session] of Object.entries(activeSessions)) {
          if (session.config && 
              session.config.configurable && 
              session.config.configurable.thread_id === threadId) {
            foundUserId = uid;
            break;
          }
        }
        
        userIdStr = foundUserId || 'unknown-user';
      }
      // Last resort - check if we can extract an ID
      else if (userId.toString) {
        userIdStr = userId.toString();
      } else {
        // If all else fails, use a default
        userIdStr = 'unknown-user';
        console.warn("Could not extract user ID from object, using default");
      }
    } else {
      // If it's already a primitive value
      userIdStr = String(userId);
    }
    
    console.log(`CallModel for user ID: ${userIdStr} (type: ${typeof userIdStr})`);
    console.log("Starting RAG process for user:", userIdStr);
    
    // Get messages from state, ensuring we handle all formats
    const messages = state.messages || [];
    
    // Check if a system message with prompt context exists
    let hasPromptContext = false;
    let promptGuidance = "";
    
    for (const msg of messages) {
      if (msg.role === "system" && msg.content.includes("journaling prompt")) {
        hasPromptContext = true;
        promptGuidance = "IMPORTANT: Keep the conversation focused on the journaling prompt the user selected. Help them explore this topic deeply.";
        break;
      }
    }
    
    // If no prompt context, use default guidance
    if (!hasPromptContext) {
      promptGuidance = "Follow the user's lead on conversation topics. Be responsive to whatever they wish to discuss.";
    }
    
    // Extract user messages for context retrieval
    let currentConversation = "";
    
    // Process each message to extract content
    for (const msg of messages) {
      // Only extract from user messages for retrieval purposes
      if (msg.role === "user" || 
          (msg._getType && msg._getType() === "human") || 
          (msg.type === "human")) {
        
        let content = "";
        if (typeof msg === 'string') {
          content = msg;
        } else if (typeof msg.content === 'string') {
          content = msg.content;
        } else if (msg.kwargs && msg.kwargs.content) {
          content = msg.kwargs.content;
        }
        
        if (content) {
          currentConversation += content + " ";
        }
      }
    }
    
    console.log(`Extracted context for retrieval: "${currentConversation.substring(0, 100)}..."`);
    
    // Only attempt retrieval if we have meaningful context
    if (currentConversation.trim().length > 0) {
      // Retrieve relevant memories based on the conversation
      const memories = await retrieveConversationMemories(
        userIdStr, 
        currentConversation, 
        3
      );
      
      // Format memories into context
      const previousContext = formatMemoriesForContext(memories);
      
      console.log(`Retrieved ${memories.length} memories, context length: ${previousContext.length} chars`);
      
      // Create prompt with previous conversation context
      const prompt = await promptTemplate.invoke({
        messages: messages,
        previousContext: previousContext,
        promptGuidance: promptGuidance
      });
      
      // Get AI response
      const response = await llm.invoke(prompt);
      
      return { messages: [response] };
    } else {
      console.log("Context too short for meaningful retrieval, proceeding without RAG");
      const prompt = await promptTemplate.invoke({
        messages: messages,
        previousContext: "No previous context available.",
        promptGuidance: promptGuidance
      });
      
      const response = await llm.invoke(prompt);
      return { messages: [response] };
    }
  } catch (error) {
    console.error("Error in RAG-enhanced callModel:", error);
    
    // Fallback to regular response without context
    try {
      const prompt = await promptTemplate.invoke({
        messages: state.messages || [],
        previousContext: "No previous context available.",
        promptGuidance: "Follow the user's lead on conversation topics. Be responsive to whatever they wish to discuss."
      });
      const response = await llm.invoke(prompt);
      return { messages: [response] };
    } catch (innerError) {
      console.error("Error in fallback response:", innerError);
      return { 
        messages: [
          { 
            role: "assistant", 
            content: "I'm having trouble accessing my memory right now. How else can I help you?"
          }
        ] 
      };
    }
  }
};

// Function to perform sentiment analysis
const analyzeSentiment = async (conversationHistory) => {
  try {
    // Format the conversation into a readable transcript
    const transcript = conversationHistory.map(msg => {
      const role = msg.role === "user" ? "User" : "AI";
      return `${role}: ${msg.content}`;
    }).join("\n\n");
    // Run all five analyses in parallel for better performance
    const [titleResponse, emotionsResponse, summaryResponse, insightsResponse, themesResponse] = 
      await Promise.all([
        llm.invoke(await titleGenerationTemplate.invoke({ transcript })),
        llm.invoke(await emotionDetectionTemplate.invoke({ transcript })),
        llm.invoke(await summaryGenerationTemplate.invoke({ transcript })),
        llm.invoke(await insightsGenerationTemplate.invoke({ transcript })),
        llm.invoke(await themesDetectionTemplate.invoke({ transcript }))
      ]);

    // Extract content from responses
    const title = titleResponse.content.trim();
    const emotions = emotionsResponse.content.split(',').map(e => e.trim());
    const summary = summaryResponse.content.trim();
    
    // Process insights - they should be in bullet points
    let insights = [];
    const insightsText = insightsResponse.content.trim();
    const insightLines = insightsText.split('\n');
    
    for (const line of insightLines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('-')) {
        insights.push(trimmedLine.substring(1).trim());
      } else if (trimmedLine.length > 0) {
        insights.push(trimmedLine);
      }
    }
    
    // Process themes
    const themes = themesResponse.content.split(',').map(t => t.trim());

    // Format the final response similar to the original format
    return `TITLE: ${title}
EMOTIONS: ${emotions.join(', ')}
SUMMARY: ${summary}
INSIGHTS:
${insights.map(insight => `- ${insight}`).join('\n')}
THEMES: ${themes.join(', ')}`;
  } catch (error) {
    console.error("Error in sentiment analysis:", error);
    return "Could not perform sentiment analysis due to an error.";
  }
};

// Parse sentiment analysis results
const parseSentimentAnalysis = (analysisText) => {
  const result = {
    title: "",
    emotions: [],
    summary: "",
    insights: [],
    themes: []
  };

  const titleMatch = analysisText.match(/TITLE:\s*(.+?)(?=\n|$)/);
  if (titleMatch && titleMatch[1]) {
    result.title = titleMatch[1].trim();
  }

  // Extract emotions
  const emotionsMatch = analysisText.match(/EMOTIONS:\s*(.+?)(?=\n|$)/);
  if (emotionsMatch && emotionsMatch[1]) {
    result.emotions = emotionsMatch[1].split(',').map(emotion => emotion.trim());
  }

  // Extract summary
  const summaryMatch = analysisText.match(/SUMMARY:\s*(.+?)(?=\n|$)/);
  if (summaryMatch && summaryMatch[1]) {
    result.summary = summaryMatch[1].trim();
  }


  // In the parseSentimentAnalysis function, after the insights section:

  // Extract insights - improved version for bulleted list
  const insightsSection = analysisText.match(/INSIGHTS:\s*\n([\s\S]*?)(?=\nTHEMES:|$)/);
  if (insightsSection && insightsSection[1]) {
    // Extract each bullet point (lines starting with -)
    const bulletPoints = insightsSection[1].match(/^\s*-\s*(.+)$/gm);
    if (bulletPoints) {
      result.insights = bulletPoints.map(point => {
        // Remove the bullet point and trim
        return point.replace(/^\s*-\s*/, '').trim();
      });
    } else {
      // Fallback: If no bullet points found, try to split by newlines or periods
      const insightsText = insightsSection[1].trim();

      // First try splitting by newlines
      let insights = insightsText.split(/\n+/).filter(line => line.trim().length > 0);

      // If that didn't work (only one line), try splitting by periods
      if (insights.length <= 1 && insightsText.includes('.')) {
        insights = insightsText.split(/\.+/)
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .map(s => s + '.');
      }

      // If we still have insights, use them
      if (insights.length > 0) {
        result.insights = insights;
      } else {
        // Last resort: just use the whole text as one insight
        result.insights = [insightsText];
      }
    }
  } else {
    // Try the old method as fallback
    const insightsMatch = analysisText.match(/INSIGHTS:\s*(.+?)(?=\n|$)/);
    if (insightsMatch && insightsMatch[1]) {
      // Split by periods to ensure proper sentence separation
      result.insights = insightsMatch[1]
        .split('.')
        .map(insight => insight.trim())
        .filter(insight => insight.length > 0)
        .map(insight => insight + '.');
    }
  }

  // Extract themes
  const themesMatch = analysisText.match(/THEMES:\s*(.+?)(?=\n|$)/);
  if (themesMatch && themesMatch[1]) {
    result.themes = themesMatch[1].split(',').map(theme => theme.trim());
  }

  return result;
};

/**
 * Helper function to parse the daily summary into structured data
 */
const parseDailySummary = (summaryText) => {
  const result = {
    overview: "",
    mood: [],
    highlights: [],
    concerns: [],
    patterns: "",
    reflection: ""
  };

  // Extract overview
  const overviewMatch = summaryText.match(/OVERVIEW:\s*(.+?)(?=\n|$)/s);
  if (overviewMatch && overviewMatch[1]) {
    result.overview = overviewMatch[1].trim();
  }

  // Extract mood
  const moodMatch = summaryText.match(/MOOD:\s*(.+?)(?=\n|$)/s);
  if (moodMatch && moodMatch[1]) {
    result.mood = moodMatch[1].split(',').map(mood => mood.trim());
  }

  // Extract highlights - look for bullet points after HIGHLIGHTS:
  const highlightsSection = summaryText.match(/HIGHLIGHTS:\s*\n([\s\S]*?)(?=\n[A-Z]+:|$)/);
  if (highlightsSection && highlightsSection[1]) {
    // Look for bullet points (lines starting with - or •)
    const bulletPoints = highlightsSection[1].match(/^\s*[-•]\s*(.+)$/gm);
    if (bulletPoints) {
      result.highlights = bulletPoints.map(point => {
        return point.replace(/^\s*[-•]\s*/, '').trim();
      });
    } else {
      // If no bullet points, split by newlines or use the whole text
      result.highlights = highlightsSection[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }
  }

  // Extract concerns - similar approach to highlights
  const concernsSection = summaryText.match(/CONCERNS:\s*\n([\s\S]*?)(?=\n[A-Z]+:|$)/);
  if (concernsSection && concernsSection[1]) {
    const bulletPoints = concernsSection[1].match(/^\s*[-•]\s*(.+)$/gm);
    if (bulletPoints) {
      result.concerns = bulletPoints.map(point => {
        return point.replace(/^\s*[-•]\s*/, '').trim();
      });
    } else {
      result.concerns = concernsSection[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }
  }

  // Extract patterns
  const patternsMatch = summaryText.match(/PATTERNS:\s*(.+?)(?=\n|$)/s);
  if (patternsMatch && patternsMatch[1]) {
    result.patterns = patternsMatch[1].trim();
  }

  // Extract reflection 
  const reflectionMatch = summaryText.match(/REFLECTION:\s*(.+?)(?=\n|$)/s);
  if (reflectionMatch && reflectionMatch[1]) {
    result.reflection = reflectionMatch[1].trim();
  }

  return result;
};
const assessScores = async (conversationHistory) => {
  try {


    // Initialize the AFINN sentiment analyzer
    const Analyzer = natural.SentimentAnalyzer;
    const stemmer = natural.PorterStemmer;
    const analyzer = new Analyzer("English", stemmer, "afinn");

    // Combine all user messages for analysis
    const userText = conversationHistory
      .filter(msg => msg.role === "user")
      .map(msg => msg.content)
      .join(" ");

    // Tokenize the text
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(userText);

    // Calculate sentiment scores
    const compoundScore = analyzer.getSentiment(tokens);

    // Calculate positive, negative, and neutral scores
    let posScore = 0;
    let negScore = 0;
    let neutralScore = 0;

    tokens.forEach(token => {
      const score = analyzer.getSentiment([token]);
      if (score > 0) posScore += score;
      else if (score < 0) negScore += Math.abs(score);
      else neutralScore += 1;
    });

    // Normalize scores to be between 0 and 1
    const total = posScore + negScore + neutralScore;
    posScore = total > 0 ? posScore / total : 0;
    negScore = total > 0 ? negScore / total : 0;
    neutralScore = total > 0 ? neutralScore / total : 0;

    // Determine overall sentiment
    let sentiment;
    if (compoundScore > 0.05) sentiment = "positive";
    else if (compoundScore < -0.05) sentiment = "negative";
    else sentiment = "neutral";

    return {
      posScore,
      negScore,
      neutralScore,
      compoundScore,
      sentiment
    };
  } catch (error) {
    console.error("Error in sentiment analysis:", error);
    return {
      posScore: 0,
      negScore: 0,
      neutralScore: 1,
      compoundScore: 0,
      sentiment: "neutral"
    };
  }
};

// Define state graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("model", callModel)
  .addEdge(START, "model")
  .addEdge("model", END);

// Add memory
const memory = new MemorySaver();
const graph = workflow.compile({ checkpointer: memory });

// Initialize session storage for active conversations
const activeSessions = {};

// Get or create a user session
const getOrCreateSession = (userId) => {
  // Ensure userId is a string
  const userIdStr = String(userId);
  console.log(`Getting or creating session for user: ${userIdStr}`);
  if (!activeSessions[userIdStr]) {
    activeSessions[userIdStr] = {
      config: { configurable: { thread_id: uuidv4() } },
      history: [],
      lastActivity: Date.now()
    };
  }
  return activeSessions[userIdStr];
};

// Controller for chat functionality
export const sendMessage = async (req, res) => {
  try {
    const { userId, message, promptContext } = req.body;
    console.log('userId:', userId, 'message:', message, 'promptContext:', promptContext);

    if (!userId || !message) {
      return res.status(400).json({ error: "User ID and message are required" });
    }
    
    // Ensure userId is a string
    const userIdStr = String(userId);
    console.log(`Processing message for user: ${userIdStr}`);

    // Get or create user session
    const session = getOrCreateSession(userIdStr);
    
    // If we have promptContext and this is the first message, add it to the system message
    if (promptContext && (!session.history || session.history.length === 0)) {
      // Add a system message that establishes the context of the conversation
      const systemMessage = { 
        role: "system", 
        content: `The user has selected a journaling prompt: "${promptContext}". Guide the conversation to help them explore this topic in depth. Keep responses focused on this prompt while remaining conversational and empathetic.`
      };
      session.history = [systemMessage];
    }

    // Add user message to history
    const userMessage = { role: "user", content: message };
    session.history.push(userMessage);
    
    // Create input for the model
    const input = { 
      messages: session.history.length === 1 ? [userMessage] : session.history
    };
    
    // Pass the actual user ID string
    const output = await graph.invoke(
      input, 
      {
        ...session.config,
        nodeOverrides: {
          model: async (state) => await callModel(state, userIdStr)
        }
      }
    );

    // Get the latest AI message
    const aiMessage = output.messages[output.messages.length - 1];

    // Add AI message to history
    session.history.push(aiMessage);

    // Update last activity time
    session.lastActivity = Date.now();

    // Return the AI response
    res.json({
      message: aiMessage.content,
      messageId: session.history.length - 1  // Index of the AI message
    });
  } catch (error) {
    console.error("Error in chat:", error);
    res.status(500).json({ error: "Failed to process message" });
  }
};

// Controller to end a chat session and save to database
export const endChat = async (req, res) => {
  try {
    const { userId, title, mood } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Get user session
    const session = activeSessions[userId];
    if (!session || session.history.length === 0) {
      return res.status(400).json({ error: "No active chat session found" });
    }
    // Calculate word count from only user messages
    const userContent = session.history
      .filter(msg => msg.role === "user")
      .map(msg => msg.content)
      .join(" ");

    // Count words by splitting on whitespace
    const wordCount = userContent.split(/\s+/).filter(word => word.length > 0).length;
    // Generate chat content from history
    const chatContent = session.history.map(msg => msg.content).join("\n\n");

    // Perform sentiment analysis
    const analysisText = await analyzeSentiment(session.history);
    const analysisData = parseSentimentAnalysis(analysisText);

    const sentimentScores = await assessScores(session.history);

    // Create new journal entry with generated title if none provided
    const journalEntry = new models.JournalEntry({
      user: userId,
      content: chatContent,
      // Use provided title, AI-generated title, or default to date
      title: title || analysisData.title || new Date().toLocaleDateString(),
      moods: analysisData.emotions.length > 0 ? analysisData.emotions : ['neutral'],
      wordCount: wordCount, // Add the word count
      aiConversation: session.history.map(msg => {
        // Determine the role properly
        let role;

        // Check if msg has a direct role property
        if (msg.role && (msg.role === 'user' || msg.role === 'assistant')) {
          role = msg.role;
        }
        // Otherwise infer from _getType if available (LangChain messages)
        else if (msg._getType) {
          role = msg._getType() === 'human' ? 'user' : 'assistant';
        }
        // Default fallback
        else {
          console.log("Warning: Could not determine role for message:", msg);
          // Default to 'assistant' but log a warning
          role = 'assistant';
        }

        return {
          role: role,
          content: msg.content || "",
          timestamp: new Date()
        };
      })
    });

    // Save journal entry
    const savedEntry = await journalEntry.save();
    await processJournalEntryForChallenges(userId, savedEntry);
    await storeConversationMemory(userId, session.history, savedEntry._id);
    // Create sentiment analysis entry
    const sentimentAnalysis = new models.SentimentAnalysis({
      journalEntry: savedEntry._id,
      emotions: analysisData.emotions,
      keywords: [],  // Could be extracted from the text if needed
      themes: analysisData.themes,
      summary: analysisData.summary,
      insights: analysisData.insights,
      nltkScores: {
        positive: sentimentScores.posScore,
        negative: sentimentScores.negScore,
        neutral: sentimentScores.neutralScore,
        compound: sentimentScores.compoundScore,
        sentiment: sentimentScores.sentiment
      }
    });

    const handleDownload = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/pdf", {
          responseType: "blob", // 👈 Important for binary data
        });
    
        // Create a URL for the PDF blob
        const url = window.URL.createObjectURL(new Blob([response.data]));
    
        // Create a temporary link to trigger download
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "myfile.pdf"); // File name
        document.body.appendChild(link);
        link.click();
    
        // Cleanup
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading PDF:", error);
      }
    };
    

    // Save sentiment analysis
    await sentimentAnalysis.save();

    await updateTodaySummary(userId);
    await updateStreakData(userId);

    // Check and award any new badges
    const newBadges = await checkAndAwardBadges(userId);

    // Clear session
    delete activeSessions[userId];

    // Return success response with analysis and new badges
    res.json({
      success: true,
      journalId: savedEntry._id,
      title: journalEntry.title,
      analysis: {
        emotions: analysisData.emotions,
        summary: analysisData.summary,
        insights: analysisData.insights,
        themes: analysisData.themes
      },
      sentimentScores: {
        positive: sentimentScores.posScore,
        negative: sentimentScores.negScore,
        neutral: sentimentScores.neutralScore,
        compound: sentimentScores.compoundScore,
        overall: sentimentScores.sentiment
      },
      // Include new badges in response if any were earned
      newBadges: newBadges.length > 0 ? newBadges : null
    });
  } catch (error) {
    console.error("Error saving chat:", error);
    res.status(500).json({ error: "Failed to save chat session" });
  }
};


// // DELETE a specific journal entry by ID for a given user
export const deleteJournalEntryById = async (userId, entryId) => {
  try {
    const deletedEntry = await models.JournalEntry.findOneAndDelete({
      _id: entryId,
      user: userId
    });

    if (!deletedEntry) {
      return { success: false, message: "Entry not found or you don't have permission to delete it" };
    }

    return { success: true, message: "Entry deleted successfully", entry: deletedEntry };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Update the deleteJournalEntryById function to handle HTTP requests
export const deleteJournalEntry = async (req, res) => {
  try {
    const entryId = req.params.id;
    const token = req.headers.authorization?.split(' ')[1];

    if (!entryId) {
      return res.status(400).json({ error: "Journal entry ID is required" });
    }

    // Verify token and get user ID
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Call the existing function
    const result = await deleteJournalEntryById(userId, entryId);

    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        message: "Journal entry deleted successfully" 
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        message: result.message 
      });
    }
  } catch (error) {
    console.error("Error deleting journal entry:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to delete journal entry", 
      error: error.message 
    });
  }
};

export const clearAllUserEntries = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    console.log(`Attempting to delete all entries for user: ${userId}`);
    
    // Delete all journal entries for this user
    const result = await models.JournalEntry.deleteMany({ user: userId });
    
    // Also delete sentiment analysis entries
    await models.SentimentAnalysis.deleteMany({ 
      journalEntry: { $in: [] } // Will be empty after entries are deleted
    });
    
    // Delete daily summaries
    await models.DailySummary.deleteMany({ user: userId });
    
    // Return success response
    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} journal entries`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Error deleting entries:", error);
    res.status(500).json({ error: "Failed to delete entries", message: error.message });
  }
};

export const getTodaySummary = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Get start and end of today in user's timezone (defaulting to UTC if not specified)
    const userTimezone = req.query.timezone || 'UTC';
    const today = new Date();
    const startOfDay = new Date(today.setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setUTCHours(23, 59, 59, 999));

    // Format today's date to check if we already have a summary
    const todayDateString = today.toISOString().split('T')[0];

    // Check if we already have a summary for today
    const existingSummary = await models.DailySummary.findOne({
      user: userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    // If we have a recent summary (less than 1 hour old), return it
    if (existingSummary &&
      (Date.now() - existingSummary.generatedAt < 60 * 60 * 1000)) {
      return res.json({
        date: todayDateString,
        entryCount: existingSummary.entryCount,
        summary: {
          overview: existingSummary.overview,
          mood: existingSummary.mood,
          highlights: existingSummary.highlights,
          concerns: existingSummary.concerns,
          patterns: existingSummary.patterns,
          reflection: existingSummary.reflection
        },
        rawSummary: existingSummary.rawSummary,
        fromCache: true
      });
    }

    // Find all journal entries for this user from today
    const todayEntries = await models.JournalEntry.find({
      user: userId,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ createdAt: 1 });

    // If no entries found for today
    if (todayEntries.length === 0) {
      return res.status(404).json({
        message: "No journal entries found for today",
        summary: null
      });
    }

    // Format entries for the LLM
    const formattedEntries = todayEntries.map((entry, index) => {
      const time = new Date(entry.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: userTimezone
      });

      return `ENTRY ${index + 1} [${time}]:\nTitle: ${entry.title}\nContent: ${entry.content}\nMoods: ${entry.moods.join(', ')}\n`;
    }).join('\n\n');

    // Generate summary using LangChain
    const summaryPrompt = await dailySummaryTemplate.invoke({
      entries: formattedEntries,
    });

    const summaryResponse = await llm.invoke(summaryPrompt);
    const summaryContent = summaryResponse.content;

    // Parse the summary into structured data
    const parsedSummary = parseDailySummary(summaryContent);

    // Create or update the daily summary document
    const dailySummaryData = {
      user: userId,
      date: today,
      entryCount: todayEntries.length,
      overview: parsedSummary.overview,
      mood: parsedSummary.mood,
      highlights: parsedSummary.highlights,
      concerns: parsedSummary.concerns,
      patterns: parsedSummary.patterns,
      reflection: parsedSummary.reflection,
      rawSummary: summaryContent,
      generatedAt: new Date()
    };

    // If we have an existing summary, update it; otherwise create a new one
    if (existingSummary) {
      await models.DailySummary.findByIdAndUpdate(existingSummary._id, dailySummaryData);
    } else {
      await new models.DailySummary(dailySummaryData).save();
    }

    // Return the summary
    res.json({
      date: todayDateString,
      entryCount: todayEntries.length,
      summary: parsedSummary,
      rawSummary: summaryContent,
      fromCache: false
    });

  } catch (error) {
    console.error("Error generating today's summary:", error);
    res.status(500).json({ error: "Failed to generate today's summary", message: error.message });
  }
};

// Cleanup function to remove inactive sessions (can be called periodically)
export const cleanupSessions = () => {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes

  Object.keys(activeSessions).forEach(userId => {
    if (now - activeSessions[userId].lastActivity > timeout) {
      delete activeSessions[userId];
    }
  });
};

// Add this function at the end of the file

/**
 * Helper function to update today's summary when a new entry is added
 * This is called automatically after saving a new journal entry
 */
const updateTodaySummary = async (userId) => {
  try {
    // Use UTC as default timezone since we're just updating the backend data
    const today = new Date();
    const startOfDay = new Date(today.setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setUTCHours(23, 59, 59, 999));

    // Find all journal entries for this user from today
    const todayEntries = await models.JournalEntry.find({
      user: userId,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ createdAt: 1 });

    // If no entries, no need to update
    if (todayEntries.length === 0) {
      return;
    }

    // Format entries for the LLM
    const formattedEntries = todayEntries.map((entry, index) => {
      const time = new Date(entry.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return `ENTRY ${index + 1} [${time}]:\nTitle: ${entry.title}\nContent: ${entry.content}\nMoods: ${entry.moods.join(', ')}\n`;
    }).join('\n\n');

    // Generate summary using LangChain
    const summaryPrompt = await dailySummaryTemplate.invoke({
      entries: formattedEntries,
    });

    const summaryResponse = await llm.invoke(summaryPrompt);
    const summaryContent = summaryResponse.content;

    // Parse the summary into structured data
    const parsedSummary = parseDailySummary(summaryContent);

    // Create or update the daily summary document
    const dailySummaryData = {
      user: userId,
      date: today,
      entryCount: todayEntries.length,
      overview: parsedSummary.overview,
      mood: parsedSummary.mood,
      highlights: parsedSummary.highlights,
      concerns: parsedSummary.concerns,
      patterns: parsedSummary.patterns,
      reflection: parsedSummary.reflection,
      rawSummary: summaryContent,
      generatedAt: new Date()
    };

    // Check for an existing summary and update it, or create a new one
    const existingSummary = await models.DailySummary.findOne({
      user: userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (existingSummary) {
      await models.DailySummary.findByIdAndUpdate(existingSummary._id, dailySummaryData);
    } else {
      await new models.DailySummary(dailySummaryData).save();
    }

    console.log(`Updated today's summary for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error updating today's summary:", error);
    // Don't throw error, just log it - we don't want to break the main flow
    return false;
  }
};

/**
 * Store conversation in vector database for future reference
 * @param {string} userId - The user ID
 * @param {Array} messages - The conversation messages
 * @param {string} journalId - The journal entry ID
 */
const storeConversationMemory = async (userId, messages, journalId) => {
  try {
    // Ensure userId is a string
    const userIdStr = String(userId);
    console.log(`Storing memory for user ${userIdStr}, journal ID ${journalId}`);
    
    // Extract user messages only
    const userMessages = messages
      .filter(msg => msg.role === "user")
      .map(msg => msg.content)
      .join("\n\n");
    
    console.log(`Extracted ${messages.filter(msg => msg.role === "user").length} user messages`);
    
    if (!userMessages || userMessages.trim().length === 0) {
      console.log("No user messages to store");
      return false;
    }
    
    // Get the Pinecone index
    const index = pineconeClient.index(PINECONE_INDEX_NAME);
    
    // The namespace where this user's memories should be stored
    const userNamespace = `${PINECONE_NAMESPACE}-${userIdStr}`;
    console.log(`Storing in namespace: ${userNamespace}`);
    
    // Convert journalId to string safely
    const journalIdString = typeof journalId === 'object' && journalId.toString ? 
                           journalId.toString() : String(journalId);
    
    // Create a document with metadata
    const document = new Document({
      pageContent: userMessages,
      metadata: {
        userId: userIdStr,
        journalId: journalIdString,
        timestamp: new Date().toISOString(),
        messageCount: messages.length,
      }
    });
    
    // Create a vectorstore
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { 
        pineconeIndex: index,
        namespace: userNamespace
      }
    );
    
    // Add the document to the vector store
    await vectorStore.addDocuments([document]);
    
    // Verify storage by immediately retrieving 
    try {
      console.log("Verifying storage...");
      const shortQuery = userMessages.split(" ").slice(0, 5).join(" ");
      const verificationResults = await vectorStore.similaritySearch(
        shortQuery, 
        1
      );
      
      if (verificationResults.length > 0) {
        console.log("✅ Memory storage verified!");
      } else {
        console.warn("⚠️ Verification check returned no results");
      }
    } catch (verifyError) {
      console.warn("Error during verification check:", verifyError.message);
    }
    
    console.log(`Successfully stored conversation memory for user ${userIdStr}`);
    return true;
  } catch (error) {
    console.error("Error storing conversation memory:", error);
    console.error(error.stack);
    return false;
  }
};
/**
 * Retrieve relevant conversation memories for a user based on current context
 * @param {string} userId - The user ID
 * @param {string} currentContext - Current conversation content to find relevant memories
 * @param {number} limit - Maximum number of memories to retrieve
 */
const retrieveConversationMemories = async (userId, currentContext, limit = 3) => {
  try {
    // Ensure userId is a string
    // Handle both object and string userId cases
    let userIdStr;
    
    if (typeof userId === 'object' && userId !== null) {
      // Try to extract ID from various object formats
      if (userId._id) {
        userIdStr = String(userId._id); 
      } else if (userId.toString) {
        userIdStr = userId.toString();
      } else {
        userIdStr = String(Object.values(userId)[0] || 'unknown');
      }
      console.log("Converted object userId to string:", userIdStr);
    } else {
      userIdStr = String(userId);
    }
    
    console.log(`Retrieving memories for user ${userIdStr}`);
    console.log(`Retrieving memories for user ${JSON.stringify(userIdStr)}`);
    console.log(`Context length: ${currentContext?.length || 0} characters`);
    
    if (!currentContext || currentContext.trim() === '') {
      console.log("Empty context provided, skipping memory retrieval");
      return [];
    }
    
    // Get the Pinecone index
    const index = pineconeClient.index(PINECONE_INDEX_NAME);
    
    // The namespace where this user's memories are stored
    const userNamespace = `${PINECONE_NAMESPACE}-${userIdStr}`;
    console.log(`Looking in namespace: ${userNamespace}`);
    
    // Create a vectorstore
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { 
        pineconeIndex: index,
        namespace: userNamespace
      }
    );
    
    // Search for similar conversations
    console.log(`Searching for up to ${limit} similar conversations...`);
    
    // Add metadata filter to ensure we only get this user's memories
    const results = await vectorStore.similaritySearch(
      currentContext, 
      limit,
      { userId: userIdStr }
    );
    
    console.log(`Retrieved ${results.length} memories`);
    results.forEach((memory, i) => {
      console.log(`Memory ${i+1} (${new Date(memory.metadata?.timestamp || Date.now()).toLocaleDateString()}): ${memory.pageContent.substring(0, 50)}...`);
    });
    
    return results;
  } catch (error) {
    console.error("Error retrieving conversation memories:", error);
    console.error(error.stack);
    return [];
  }
};
/**
 * Format retrieved memories into a context string for the AI
 * @param {Array} memories - Array of retrieved memory documents
 */
const formatMemoriesForContext = (memories) => {
  if (!memories || memories.length === 0) {
    return "No previous conversation history available.";
  }
  
  let formattedMemories = "Here are relevant parts of our previous conversations:\n\n";
  
  memories.forEach((memory, index) => {
    const date = memory.metadata && memory.metadata.timestamp ? 
      new Date(memory.metadata.timestamp).toLocaleDateString() : 
      "Unknown date";
    
    // Make the format cleaner and more focused
    formattedMemories += `CONVERSATION FROM ${date}:\n${memory.pageContent}\n\n`;
  });
  
  formattedMemories += "When responding, incorporate relevant information from these previous conversations naturally.\n";
  
  return formattedMemories;
};
// Add a new controller for long form journaling
export const processLongFormJournal = async (req, res) => {
  try {
    const { userId, content, title, mood } = req.body;

    if (!userId || !content) {
      return res.status(400).json({ error: "User ID and content are required" });
    }

    // Calculate word count
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    // Analyze the journal entry
    const analysisPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are an expert journal analyst. Analyze this long-form journal entry and provide:
        1. A suitable title (if not already provided)
        2. 3-5 emotions expressed in the entry
        3. A brief 2-3 sentence summary
        4. 2-3 actionable insights that might help the user
        5. 3-5 main themes discussed

        Format your response in the following structure:
        TITLE: [Generated title]
        EMOTIONS: [comma-separated list of emotions]
        SUMMARY: [Brief summary]
        INSIGHTS:
        - [First insight]
        - [Second insight]
        - [Additional insights if applicable]
        THEMES: [comma-separated list of themes]`
      ],
      ["user", content]
    ]);

    const analysisResponse = await summaryLlm.invoke(await analysisPrompt.invoke({}));
    const analysisText = analysisResponse.content;
    const analysisData = parseSentimentAnalysis(analysisText);

    // Calculate sentiment scores
    const sentimentScores = await assessScores([
      { role: "user", content }
    ]);
    let moodData = [];
if (mood !== null && mood !== undefined) {
  const moodOption = moodOptions.find(m => m.rating === Number(mood));
  if (moodOption) {
    moodData = [moodOption.label];
  }
} 
    // Create new journal entry
    const journalEntry = new models.JournalEntry({
      user: userId,
      content: content,
      title: title || analysisData.title || new Date().toLocaleDateString(),
      moods: moodData.length > 0 ? moodData : analysisData.emotions,
      wordCount: wordCount,
      format: 'longform', // Mark this as a long-form entry
      aiConversation: [
        {
          role: 'user',
          content: content,
          timestamp: new Date()
        }
      ]
    });

    // Save journal entry
    const savedEntry = await journalEntry.save();
    
    // Process entry for challenges
    await processJournalEntryForChallenges(userId, savedEntry);
    
    // Create sentiment analysis entry
    const sentimentAnalysis = new models.SentimentAnalysis({
      journalEntry: savedEntry._id,
      emotions: analysisData.emotions,
      keywords: [],
      themes: analysisData.themes,
      summary: analysisData.summary,
      insights: analysisData.insights,
      nltkScores: {
        positive: sentimentScores.posScore,
        negative: sentimentScores.negScore,
        neutral: sentimentScores.neutralScore,
        compound: sentimentScores.compoundScore,
        sentiment: sentimentScores.sentiment
      }
    });

    // Save sentiment analysis
    await sentimentAnalysis.save();

    // Update today's summary
    await updateTodaySummary(userId);
    await updateStreakData(userId);

    // Check and award any new badges
    const newBadges = await checkAndAwardBadges(userId);

    // Return success response with analysis and new badges
    res.json({
      success: true,
      journalId: savedEntry._id,
      title: journalEntry.title,
      analysis: {
        emotions: analysisData.emotions,
        summary: analysisData.summary,
        insights: analysisData.insights,
        themes: analysisData.themes
      },
      sentimentScores: {
        positive: sentimentScores.posScore,
        negative: sentimentScores.negScore,
        neutral: sentimentScores.neutralScore,
        compound: sentimentScores.compoundScore,
        overall: sentimentScores.sentiment
      },
      newBadges: newBadges.length > 0 ? newBadges : null
    });
  } catch (error) {
    console.error("Error processing long form journal:", error);
    res.status(500).json({ error: "Failed to process journal entry" });
  }
};