<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 65a9591a618da8ad62e490f652ccfe2866ceb1a7
# Import necessary libraries
import os
from datetime import datetime as dt,timedelta
from typing import Dict, List, Optional, Any
import uuid

# OpenAI and LangChain imports
from langchain_openai import OpenAIEmbeddings,ChatOpenAI
from langchain_community.vectorstores import Pinecone
from langchain.chains import ConversationalRetrievalChain
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.prompts import ChatPromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
from langchain.chains.question_answering import load_qa_chain
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore

# Pinecone for vector database
import pinecone
from pinecone import Pinecone, ServerlessSpec
# MongoDB for journal storage
from pymongo import MongoClient
from pymongo.collection import Collection
from bson.objectid import ObjectId

# Sentiment analysis
from transformers import pipeline

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Sentiment analyzer setup
sentiment_analyzer = pipeline("sentiment-analysis")

class AIJournalChatbot:
    def __init__(self, user_id: str):
        """
        Initialize the AI Journal Chatbot with user ID and setup connections
        """
        self.user_id = user_id
        
        # OpenAI API key
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        # MongoDB setup
        self.mongo_client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017/"))
        self.db = self.mongo_client["ai_journal_app"]
        self.users_collection = self.db["users"]
        self.journal_entries_collection = self.db["journal_entries"]
        self.mood_tracking_collection = self.db["mood_tracking"]
        
        # Pinecone setup
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        pinecone_environment = os.getenv("PINECONE_ENVIRONMENT", "us-west1-gcp")
        if not pinecone_api_key:
            raise ValueError("PINECONE_API_KEY environment variable is required")
        
        pc = Pinecone(
        api_key=os.environ.get("PINECONE_API_KEY")
        )
        self.index_name = "journal-entries"
        
        # Create Pinecone index if it doesn't exist
        if self.index_name not in pc.list_indexes().names():
            pc.create_index(name=self.index_name, dimension=1536, metric="cosine",spec=ServerlessSpec(
                cloud='aws',
                region='us-west-2'
            ))
        
        # Setup embeddings and vector store
        self.embeddings = OpenAIEmbeddings(openai_api_key=self.openai_api_key)
        self.vector_store = PineconeVectorStore(index_name=self.index_name, embedding=self.embeddings)
        
        # Setup LLM
        self.llm = ChatOpenAI(
            temperature=0.7,
            model_name="gpt-4",
            openai_api_key=self.openai_api_key
        )
        
        # Setup memory
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        # Setup RAG with conversational chain
        self.conversation_chain = self._setup_conversation_chain_alternate()
        
        # Custom prompt templates
        self.prompt_templates = {
            "journal": (
                "You are an empathetic AI journaling companion. "
                "The user is sharing their thoughts and feelings with you. "
                "Respond in a supportive, non-judgmental way. "
                "Use the context of their previous journal entries when relevant, "
                "but respect their privacy and be sensitive to their emotions.\n\n"
                "User's previous relevant journal entries:\n{context}\n\n"
                "Current journal entry or message: {question}\n\n"
            ),
            "insight": (
                "As an AI journaling companion, analyze the user's journal entries "
                "to provide thoughtful insights. Focus on patterns, growth opportunities, "
                "and positive observations. Be supportive and constructive. "
                "Never be judgmental or negative.\n\n"
                "User's journal entries:\n{context}\n\n"
                "Generate insights based on these entries. Be specific and reference "
                "actual content from their writing when possible.\n"
            ),
            "prompt_suggestion": (
                "You are an AI journaling companion. Based on the user's previous "
                "journal entries, suggest 3 thoughtful and personalized journaling prompts. "
                "These should be relevant to their current life situations, interests, "
                "or emotional patterns that you've observed.\n\n"
                "User's recent journal entries:\n{context}\n\n"
                "Generate 3 personalized journaling prompts."
            )
        }
        
        # Output parser for structured responses
        self.response_schemas = [
            ResponseSchema(name="message", description="The supportive response to the user"),
            ResponseSchema(name="sentiment", description="The detected sentiment of the user's entry (positive, negative, neutral)"),
            ResponseSchema(name="suggested_prompt", description="An optional follow-up journaling prompt if appropriate")
        ]
        self.output_parser = StructuredOutputParser.from_response_schemas(self.response_schemas)
        
    # def _setup_conversation_chain(self) -> ConversationalRetrievalChain:
    #     """
    #     Setup the conversational retrieval chain for RAG
    #     """
    #     retriever = self.vector_store.as_retriever(
    #         search_type="similarity",
    #         search_kwargs={"k": 5, "filter": {"user_id": self.user_id}}
    # )
    
    #     return ConversationalRetrievalChain.from_llm(
    #         llm=self.llm,
    #         retriever=retriever,
    #         memory=self.memory,
    #         return_source_documents=True,
    #         # Specify the output key to fix the multiple outputs error
    #         output_key="answer" 
    # )
    def _setup_conversation_chain_alternate(self):
        """
        Alternative setup for conversational retrieval chain using newer LangChain methods
        """
        retriever = self.vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 5, "filter": {"user_id": self.user_id}}
        )
        
        # Create a system prompt for the retrieval chain
        system_prompt = """You are an empathetic AI journaling companion. 
        Use the following context from the user's previous journal entries to provide supportive, 
        personalized responses. Be warm, understanding, and insightful.
        
        Previous relevant journal entries:
        {context}
        """
        
        # Create a prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}")
        ])
        
        # Create a document chain to process retrieved documents
        document_chain = create_stuff_documents_chain(self.llm, prompt)
        
        # Create the final retrieval chain
        retrieval_chain = create_retrieval_chain(retriever, document_chain)
        
        return retrieval_chain
    
    def add_journal_entry(self, content: str, tags: List[str] = None) -> Dict:
        """
        Add a new journal entry to MongoDB and update vector store
        """
        # Analyze sentiment
        sentiment_result = sentiment_analyzer(content)
        sentiment = sentiment_result[0]["label"]
        sentiment_score = sentiment_result[0]["score"]
        
        # Create journal entry document
        entry_id = str(ObjectId())
        timestamp = dt.now()
        journal_entry = {
            "_id": entry_id,
            "user_id": self.user_id,
            "content": content,
            "tags": tags or [],
            "sentiment": sentiment,
            "sentiment_score": sentiment_score,
            "created_at": timestamp,
            "updated_at": timestamp
        }
        
        # Insert into MongoDB
        self.journal_entries_collection.insert_one(journal_entry)
        
        # Update mood tracking
        self.mood_tracking_collection.insert_one({
            "user_id": self.user_id,
            "mood": sentiment,
            "score": sentiment_score,
            "date": timestamp
        })
        
        # Add to vector store
        self.vector_store.add_texts(
            texts=[content],
            metadatas=[{
                "user_id": self.user_id,
                "entry_id": entry_id,
                "timestamp": timestamp.isoformat(),
                "sentiment": sentiment,
                "tags": tags or []
            }],
            ids=[entry_id]
        )
        
        # Update user's streak
        self._update_streak(self.user_id)
        
        return journal_entry
    
    def _update_streak(self, user_id: str) -> None:
        """
        Update the user's journaling streak
        """
        user = self.users_collection.find_one({"_id": user_id})
        if not user:
            return
        
        last_entry = self.journal_entries_collection.find_one(
            {"user_id": user_id},
            sort=[("created_at", -1)],
            skip=1  # Skip the most recent entry (the one just added)
        )
        
        today = dt.now().date()
        
        if last_entry:
            last_entry_date = last_entry["created_at"].date()
            
            # If last entry was yesterday, increment streak
            if (today - last_entry_date).days == 1:
                current_streak = user.get("current_streak", 0) + 1
                longest_streak = max(current_streak, user.get("longest_streak", 0))
                
                self.users_collection.update_one(
                    {"_id": user_id},
                    {"$set": {
                        "current_streak": current_streak,
                        "longest_streak": longest_streak
                    }}
                )
            # If there was a gap, reset streak
            elif (today - last_entry_date).days > 1:
                self.users_collection.update_one(
                    {"_id": user_id},
                    {"$set": {"current_streak": 1}}
                )
        else:
            # First entry, set streak to 1
            self.users_collection.update_one(
                {"_id": user_id},
                {"$set": {
                    "current_streak": 1,
                    "longest_streak": 1
                }}
            )
    
    def chat(self, message: str) -> Dict:
        """
        Process a user message and generate a response using RAG
        """
        try:
            # Check if this is a journal entry or a question
            is_journal_entry = len(message.split()) > 20 or "today" in message.lower() or "feeling" in message.lower()
            
            if is_journal_entry:
                # Process as journal entry
                entry_data = self.add_journal_entry(message)
                
                # Use journal prompt for response
                prompt = PromptTemplate(
                    template=self.prompt_templates["journal"],
                    input_variables=["context", "question"]
                )
                
                chain = load_qa_chain(
                    self.llm,
                    chain_type="stuff",
                    prompt=prompt
                )
                
                # Get relevant entries for context
                docs = self.vector_store.similarity_search(
                    message,
                    k=3,
                    filter={"user_id": self.user_id}
                )
                
                response = chain({"input_documents": docs, "question": message})
                
                # Generate a follow-up prompt
                follow_up_prompt = self._generate_follow_up_prompt(message, docs)
                
                return {
                    "response": response["output_text"],
                    "sentiment": entry_data["sentiment"],
                    "follow_up_prompt": follow_up_prompt
                }
                
        except Exception as e:
            print(f"Error in chat: {str(e)}")
            return {"response": "I'm sorry, I encountered an error processing your message. Please try again."}
    
    def _generate_follow_up_prompt(self, message: str, context_docs: List) -> str:
        """
        Generate a follow-up prompt based on the user's message and context
        """
        prompt = PromptTemplate(
            template=self.prompt_templates["prompt_suggestion"],
            input_variables=["context"]
        )
        
        context = "\n".join([doc.page_content for doc in context_docs])
        
        chain = load_qa_chain(
            self.llm,
            chain_type="stuff",
            prompt=prompt
        )
        
        response = chain({"input_documents": context_docs, "question": ""})
        prompts = response["output_text"].split("\n")
        
        # Return just one prompt
        for prompt in prompts:
            if prompt.strip() and len(prompt) > 10:
                return prompt.strip()
        
        return "How would you like to explore this topic further in your journal?"
    
    def generate_insights(self) -> Dict:
        """
        Generate insights based on the user's journal entries
        """
        # Get the user's recent entries
        recent_entries = list(self.journal_entries_collection.find(
            {"user_id": self.user_id},
            sort=[("created_at", -1)],
            limit=10
        ))
        
        if not recent_entries:
            return {"insights": "Not enough journal entries to generate insights yet."}
        
        # Concatenate entries into context
        context = "\n".join([f"{entry['created_at'].strftime('%Y-%m-%d')}: {entry['content']}" 
                           for entry in recent_entries])
        
        # Use insight prompt for analysis
        prompt = PromptTemplate(
            template=self.prompt_templates["insight"],
            input_variables=["context"]
        )
        
        # Create a dummy list of documents for the chain
        from langchain.docstore.document import Document
        docs = [Document(page_content=context)]
        
        chain = load_qa_chain(
            self.llm,
            chain_type="stuff",
            prompt=prompt
        )
        
        response = chain({"input_documents": docs, "question": ""})
        
        # Save the insight to database
        insight_id = str(ObjectId())
        self.db["insights"].insert_one({
            "_id": insight_id,
            "user_id": self.user_id,
            "content": response["output_text"],
            "generated_at": dt.now()
        })
        
        return {
            "insights": response["output_text"],
            "generated_from": [entry["_id"] for entry in recent_entries]
        }
    
    def get_mood_trends(self, days: int = 30) -> Dict:
        """
        Get mood trends for the specified number of days
        """
        from_date = dt.now() - timedelta(days=days)
        
        mood_entries = list(self.mood_tracking_collection.find(
            {
                "user_id": self.user_id,
                "date": {"$gte": from_date}
            },
            sort=[("date", 1)]
        ))
        
        if not mood_entries:
            return {"trends": "Not enough data to analyze mood trends."}
        
        # Process mood data for trends
        moods = {}
        dates = []
        scores = []
        
        for entry in mood_entries:
            date_str = entry["date"].strftime("%Y-%m-%d")
            dates.append(date_str)
            scores.append(entry["score"])
            
            mood = entry["mood"]
            if mood in moods:
                moods[mood] += 1
            else:
                moods[mood] = 1
        
        # Calculate dominant mood
        dominant_mood = max(moods.items(), key=lambda x: x[1])[0]
        
        # Calculate average sentiment score
        avg_score = sum(scores) / len(scores)
        
        return {
            "dominant_mood": dominant_mood,
            "mood_distribution": moods,
            "average_sentiment": avg_score,
            "days_analyzed": days,
            "mood_timeline": {date: score for date, score in zip(dates, scores)}
        }
    
    def search_entries(self, query: str, limit: int = 5) -> List[Dict]:
        """
        Search for relevant journal entries using vector similarity
        """
        results = self.vector_store.similarity_search(
            query,
            k=limit,
            filter={"user_id": self.user_id}
        )
        
        entries = []
        for doc in results:
            entry_id = doc.metadata.get("entry_id")
            if entry_id:
                entry = self.journal_entries_collection.find_one({"_id": entry_id})
                if entry:
                    entries.append({
                        "id": entry_id,
                        "content": entry["content"],
                        "date": entry["created_at"],
                        "sentiment": entry["sentiment"],
                        "relevance_score": doc.metadata.get("score", 0)
                    })
        
        return entries

# User management functions
def create_user(name: str, email: str, password_hash: str, mongo_client: MongoClient) -> str:
    """
    Create a new user in the database
    """
    db = mongo_client["ai_journal_app"]
    users_collection = db["users"]
    
    # Check if user already exists
    existing_user = users_collection.find_one({"email": email})
    if existing_user:
        raise ValueError("User with this email already exists")
    
    user_id = str(ObjectId())
    users_collection.insert_one({
        "_id": user_id,
        "name": name,
        "email": email,
        "password_hash": password_hash,
        "created_at": dt.now(),
        "current_streak": 0,
        "longest_streak": 0,
        "badges": [],
        "preferences": {
            "reminder_time": "20:00",
            "theme": "light"
        }
    })
    
    return user_id

def authenticate_user(email: str, password_hash: str, mongo_client: MongoClient) -> Optional[str]:
    """
    Authenticate user and return user_id if successful
    """
    db = mongo_client["ai_journal_app"]
    users_collection = db["users"]
    
    user = users_collection.find_one({
        "email": email,
        "password_hash": password_hash
    })
    
    return user["_id"] if user else None

# Example usage
if __name__ == "__main__":
    # Example of how to use the chatbot
    # Note: In a real application, you would get the user_id from authentication
    
    # Initialize MongoDB client
    mongo_client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017/"))
    
    # Create or authenticate user
    try:
        user_id = create_user(
            "John Doe",
            "john@example.com",
            "hashed_password",  # In real app, use proper password hashing
            mongo_client
        )
        print(f"Created new user with ID: {user_id}")
    except ValueError:
        user_id = authenticate_user(
            "john@example.com",
            "hashed_password",
            mongo_client
        )
        print(f"Authenticated user with ID: {user_id}")
    
    if user_id:
        # Initialize chatbot with user ID
        chatbot = AIJournalChatbot(user_id)
        
        # Example of adding a journal entry
        entry = chatbot.add_journal_entry(
            "Today I felt really productive at work. I managed to complete the project ahead of schedule, which made me feel accomplished. However, I'm a bit worried about my upcoming presentation next week."
        )
        print(f"Added journal entry with ID: {entry['_id']}")
        
        # Example of chatting with the bot
        response = chatbot.chat("Can you help me manage my anxiety about my presentation?")
        print(f"Chatbot response: {response['response']}")
        
        # Generate insights
        insights = chatbot.generate_insights()
        print(f"Insights: {insights['insights']}")
        
        # Get mood trends
        trends = chatbot.get_mood_trends(days=7)  # Last 7 days
        print(f"Mood trends: {trends}")