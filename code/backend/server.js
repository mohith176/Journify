import express from 'express';
import dotenv from 'dotenv';
import {connectDB} from './config/db.js';
import cors from 'cors';
import userRoutes from './routes/user.route.js';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
    START,
    END,
    MessagesAnnotation,
    StateGraph,
    MemorySaver,
  } from "@langchain/langgraph";
  
import { z } from "zod";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000; // Define PORT consistently

const corsOptions = {
    origin: 'http://localhost:19006', // Replace with your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

app.use(cors(corsOptions)); // You need to use the cors middleware
app.use(express.json()); // Add middleware to parse JSON bodies
app.use('/api/users', userRoutes);

// AI thrapist function 
async function AiTherapist() {
  const model = new ChatOpenAI({ model: "gpt-4o" });
  const messages = [
    new SystemMessage("Give response as a therapist"),
    new HumanMessage("I'm feeling sad."),
  ];
  
  // Stream the response
  console.log("Starting consversation...");
  const stream = await model.stream(messages);
  
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
    // console.log(`Chunk received: ${chunk.content}|`);
  }
  
  // Combine all chunks for complete response
  const completeResponse = chunks.map(chunk => chunk.content).join("");
  console.log("Complete output:", completeResponse);
  return completeResponse;
}



// sentiment analysis function
async function AiSentimentAnalysis() {
    const llm = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0
    });
    
    const taggingPrompt = ChatPromptTemplate.fromTemplate(
        `Extract the desired information from the following passage.
    
    Only extract the properties mentioned in the 'Classification' function.
    Please ensure the aggressiveness score is an integer between 1 and 5.
    
    Passage:
    {input}
    `
    );
    
    // Simplified schema without numeric constraints
    const classificationSchema = z.object({
        sentiment: z.string().describe("The sentiment of the text"),
        aggressiveness: z.number().int().describe("How aggressive the text is on a scale from 1 to 5"),
        language: z.string().describe("The language the text is written in"),
    });
    
    // Fixed the typo in variable name
    const llmWithStructuredOutput = llm.withStructuredOutput(classificationSchema, {
        name: "extractor",
    });

    const prompt1 = await taggingPrompt.invoke({
        input: "What the hell is wrong with you? You are a complete idiot!",
    });
    
    try {
        const result = await llmWithStructuredOutput.invoke(prompt1);
        console.log("Sentiment analysis result:", result);
        return result;
    } catch (error) {
        console.error("Sentiment analysis error details:", error);
        throw error;
    }
}

// clearer sentiment analysis function
async function AiSentimentAnalysis2() {
    const llm = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0
    });

    const classificationSchema2 = z.object({
        sentiment: z
          .enum(["happy", "neutral", "sad","angry","fearful"])
          .describe("The sentiment of the text"),
          aggressiveness: z.number().int().describe("How aggressive the text is on a scale from 1 to 5"),
        language: z
          .enum(["spanish", "english", "french", "german", "italian"])
          .describe("The language the text is written in"),
      });
      
      const taggingPrompt2 = ChatPromptTemplate.fromTemplate(
        `Extract the desired information from the following passage.
      
      Only extract the properties mentioned in the 'Classification' function.
      
      Passage:
      {input}
      `
      );
      
      const llmWithStructuredOutput2 = llm.withStructuredOutput(
        classificationSchema2,
        { name: "extractor" }
      );
      
     
      
      const prompt2 = await taggingPrompt2.invoke({
        input:
          "I am scared!!",
      });
      
        try {
            const result = await llmWithStructuredOutput2.invoke(prompt2);
            console.log("Sentiment analysis result:", result);
            return result;
        } 
        catch (error) {
            console.error("Sentiment analysis error details:", error);
            throw error;
        }
    }




// Start server
app.listen(PORT, async () => {
    connectDB();
    console.log(`Server is running on http://localhost:${PORT}`);
    
    // Run the therapist if needed
    // try {
    //   await AiTherapist();
    // } catch (error) {
    //   console.error("error:", error);
    // }

    // // Run the sentiment analysis if needed
    // try {
    //   await AiSentimentAnalysis();
    // } catch (error) {
    //   console.error("error:", error);
    // }

    // Run the clearer sentiment analysis if needed
    try {
      await AiSentimentAnalysis2();
    } catch (error) {
      console.error("error:", error);
    }
});