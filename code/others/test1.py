<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 65a9591a618da8ad62e490f652ccfe2866ceb1a7
import os
import json
import datetime
import uuid
import getpass
import time
from typing import List, Dict, Any, Optional
import argparse

# Third-party imports
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
from pymongo import MongoClient
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
import numpy as np
from rich.console import Console
from rich.markdown import Markdown
from rich.prompt import Prompt, Confirm
from rich.panel import Panel
from rich import print as rprint
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
load_dotenv()
# Initialize console for pretty output
console = Console()

# Configure OpenAI

# Configure MongoDB
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ai_journal")
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# Configure Pinecone
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-west1-gcp")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "journal-entries")

# Initialize NLTK for sentiment analysis
try:
    nltk.data.find('vader_lexicon')
except LookupError:
    nltk.download('vader_lexicon')
sentiment_analyzer = SentimentIntensityAnalyzer()

class JournalBot:
    def __init__(self):
        self.user_id = None
        self.username = None
        self.current_streak = 0
        self.longest_streak = 0
        self.last_entry_date = None
        self.initialize_pinecone()
        self.client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    def initialize_pinecone(self):
        """Initialize Pinecone client and ensure index exists"""
        try:
            pc = Pinecone(
            api_key=os.environ.get("PINECONE_API_KEY")
            )

            # Check if index exists, if not create it
            if PINECONE_INDEX_NAME not in pc.list_indexes().names():
                console.print("[yellow]Creating Pinecone index. This might take a minute...[/yellow]")
                pc.create_index(
                    name=PINECONE_INDEX_NAME,
                    dimension=1536,  # OpenAI embeddings dimension
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud='aws',
                        region='us-west-2'
                    ))

            self.pinecone_index = pc.Index(PINECONE_INDEX_NAME)
            console.print("[green]Successfully connected to Pinecone[/green]")
        except Exception as e:
            console.print(f"[red]Error initializing Pinecone: {str(e)}[/red]")
            exit(1)

    def register_user(self, username: str, password: str) -> bool:
        """Register a new user"""
        # Check if username already exists
        if db.users.find_one({"username": username}):
            console.print("[red]Username already exists. Please choose another.[/red]")
            return False

        # Create new user
        user_id = str(uuid.uuid4())
        user_data = {
            "user_id": user_id,
            "username": username,
            "password_hash": self._hash_password(password),
            "created_at": datetime.datetime.now(),
            "preferences": {},
            "current_streak": 0,
            "longest_streak": 0,
            "last_entry_date": None
        }

        db.users.insert_one(user_data)
        console.print(f"[green]User {username} registered successfully![/green]")

        # Set current user
        self.user_id = user_id
        self.username = username
        self.current_streak = 0
        self.longest_streak = 0
        self.last_entry_date = None

        return True

    def login_user(self, username: str, password: str) -> bool:
        """Login an existing user"""
        user = db.users.find_one({"username": username})

        if not user or not self._verify_password(password, user["password_hash"]):
            console.print("[red]Invalid username or password.[/red]")
            return False

        # Set current user
        self.user_id = user["user_id"]
        self.username = username
        self.current_streak = user.get("current_streak", 0)
        self.longest_streak = user.get("longest_streak", 0)
        self.last_entry_date = user.get("last_entry_date")

        console.print(f"[green]Welcome back, {username}![/green]")
        return True

    def _hash_password(self, password: str) -> str:
        """Simple password hashing (in production, use a proper library like bcrypt)"""
        # This is a placeholder. In a real app, use a secure hashing library
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()

    def _verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return self._hash_password(password) == hashed

    def create_journal_entry(self, content: str, mood: str = "neutral") -> str:
        """Create a new journal entry and store it in MongoDB and Pinecone"""
        if not self.user_id:
            console.print("[red]Please login first.[/red]")
            return

        # Calculate sentiment
        sentiment_score = sentiment_analyzer.polarity_scores(content)["compound"]

        # Create entry document
        entry_id = str(uuid.uuid4())
        entry = {
            "entry_id": entry_id,
            "user_id": self.user_id,
            "content": content,
            "mood": mood,
            "sentiment_score": sentiment_score,
            "created_at": datetime.datetime.now(),
            "updated_at": datetime.datetime.now()
        }

        # Store in MongoDB
        db.journal_entries.insert_one(entry)

        # Update streak information
        self._update_streak()

        # Create embedding and store in Pinecone
        try:
            embedding = self._get_embedding(content)
            metadata = {
                "entry_id": entry_id,
                "user_id": self.user_id,
                "mood": mood,
                "sentiment_score": sentiment_score,
                "created_at": entry["created_at"].isoformat()
            }

            self.pinecone_index.upsert(
                vectors=[(entry_id, embedding, metadata)]
            )

        except Exception as e:
            console.print(f"[yellow]Warning: Failed to create embedding: {str(e)}[/yellow]")

        return entry_id

    def _update_streak(self):
        """Update user's journaling streak"""
        today = datetime.datetime.now().date()

        if self.last_entry_date is None:
            # First entry
            self.current_streak = 1
        elif self.last_entry_date == today - datetime.timedelta(days=1):
            # Consecutive day
            self.current_streak += 1
        elif self.last_entry_date < today - datetime.timedelta(days=1):
            # Streak broken
            self.current_streak = 1
        # If entry already made today, streak stays the same

        # Update longest streak if needed
        if self.current_streak > self.longest_streak:
            self.longest_streak = self.current_streak

        # Update user in database
        db.users.update_one(
            {"user_id": self.user_id},
            {
                "$set": {
                    "current_streak": self.current_streak,
                    "longest_streak": self.longest_streak,
                    "last_entry_date": today
                }
            }
        )

        # Update local instance
        self.last_entry_date = today

    def get_recent_entries(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get the user's most recent journal entries"""
        if not self.user_id:
            return []

        entries = list(db.journal_entries.find(
            {"user_id": self.user_id},
            projection={"_id": 0}
        ).sort("created_at", -1).limit(limit))

        return entries

    def _get_embedding(self, text: str) -> List[float]:
        """Get OpenAI embedding for text"""
        print(text)
        response = self.client.embeddings.create(input=text,model="text-embedding-3-small")
        return response.data[0].embedding

    def retrieve_relevant_entries(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Retrieve relevant journal entries using Pinecone"""
        if not self.user_id:
            return []

        try:
            # Get embedding for query
            print("Query:", query)
            query_embedding = self._get_embedding(query)

            # Query Pinecone
            results = self.pinecone_index.query(
                vector=query_embedding,
                filter={"user_id": self.user_id},
                top_k=top_k,
                include_metadata=True
            )

            # Get full entries from MongoDB using entry_ids
            entry_ids = [match["id"] for match in results["matches"]]
            entries = list(db.journal_entries.find(
                {"entry_id": {"$in": entry_ids}},
                projection={"_id": 0}
            ))

            # Sort by relevance (using the order from Pinecone)
            entry_dict = {entry["entry_id"]: entry for entry in entries}
            sorted_entries = [entry_dict[entry_id] for entry_id in entry_ids if entry_id in entry_dict]

            return sorted_entries
        except Exception as e:
            console.print(f"[yellow]Warning: Failed to retrieve relevant entries: {str(e)}[/yellow]")
            return []

    def generate_ai_response(self, user_input: str, history: List[Dict[str, Any]] = None) -> str:
        """Generate AI response using OpenAI with RAG context"""
        if not self.user_id:
            return "Please login first."

        # Retrieve relevant past entries
        relevant_entries = self.retrieve_relevant_entries(user_input)

        # Format past entries as context
        context = ""
        if relevant_entries:
            context = "Here are some of my past journal entries that may be relevant:\n\n"
            for i, entry in enumerate(relevant_entries):
                date_str = entry["created_at"].strftime("%B %d, %Y")
                context += f"Entry {i+1} ({date_str}):\n{entry['content']}\n\n"

        # Get user streak information
        streak_info = f"Current journaling streak: {self.current_streak} days. Longest streak: {self.longest_streak} days."

        # Build prompt
        system_message = """You are an empathetic AI journaling companion. Your goal is to help the user process their thoughts and emotions, 
        provide thoughtful responses, and encourage self-reflection. Be supportive and kind, but also gently challenging when appropriate. 
        Use the context from past journal entries to provide personalized insights and continuity in your responses. 
        Never be judgmental or dismissive of the user's feelings."""

        if context:
            system_message += f"\n\nHere's some context from the user's past journal entries:\n{context}"

        system_message += f"\n\n{streak_info}"

        try:
            # Call OpenAI API for response
            print("309")
            response = self.client.chat.completions.create(model="gpt-4",  # or another appropriate model
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_input}
            ],
            temperature=0.7,
            max_tokens=800)

            return response.choices[0].message.content
        except Exception as e:
            console.print(f"[red]Error generating AI response: {str(e)}[/red]")
            return "I'm having trouble connecting right now. Please try again later."

    def generate_journal_prompt(self) -> str:
        """Generate a personalized journaling prompt"""
        if not self.user_id:
            return "Please login first."

        # Get recent entries for context
        recent_entries = self.get_recent_entries(limit=3)

        # Format recent entries as context
        context = ""
        if recent_entries:
            context = "Here are some of my recent journal entries:\n\n"
            for i, entry in enumerate(recent_entries):
                date_str = entry["created_at"].strftime("%B %d, %Y")
                context += f"Entry {i+1} ({date_str}):\n{entry['content'][:150]}...\n\n"

        # Build prompt
        system_message = """You are an empathetic AI journaling companion. Generate a thoughtful, engaging journaling prompt 
        that will help the user self-reflect and process their emotions. The prompt should be specific, open-ended, and 
        encouraging. Use the context from past journal entries to personalize the prompt if available."""

        if context:
            system_message += f"\n\nHere's some context from the user's recent journal entries:\n{context}"

        try:
            # Call OpenAI API for prompt
            print("349")
            response = self.client.chat.completions.create(model="gpt-4",  # or another appropriate model
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": "Please generate a personalized journaling prompt for me."}
            ],
            temperature=0.8,
            max_tokens=150)

            return response.choices[0].message.content
        except Exception as e:
            console.print(f"[red]Error generating prompt: {str(e)}[/red]")
            return "How are you feeling today? Take a moment to reflect on your emotions and experiences."

    def analyze_mood_trends(self, days: int = 30) -> Dict[str, Any]:
        """Analyze mood trends over a period of time"""
        if not self.user_id:
            return {}

        # Calculate date range
        end_date = datetime.datetime.now()
        start_date = end_date - datetime.timedelta(days=days)

        # Get entries in date range
        entries = list(db.journal_entries.find(
            {
                "user_id": self.user_id,
                "created_at": {"$gte": start_date, "$lte": end_date}
            },
            projection={"created_at": 1, "sentiment_score": 1, "mood": 1, "_id": 0}
        ))

        if not entries:
            return {"message": "No entries found in the specified time period."}

        # Group by day and calculate average sentiment
        daily_sentiments = {}
        for entry in entries:
            day = entry["created_at"].strftime("%Y-%m-%d")
            if day not in daily_sentiments:
                daily_sentiments[day] = {"sum": 0, "count": 0, "moods": []}

            daily_sentiments[day]["sum"] += entry["sentiment_score"]
            daily_sentiments[day]["count"] += 1
            daily_sentiments[day]["moods"].append(entry["mood"])

        # Calculate averages and find most common mood
        results = []
        for day, data in daily_sentiments.items():
            avg_sentiment = data["sum"] / data["count"]
            mood_counts = {}
            for mood in data["moods"]:
                mood_counts[mood] = mood_counts.get(mood, 0) + 1

            most_common_mood = max(mood_counts.items(), key=lambda x: x[1])[0]

            results.append({
                "date": day,
                "average_sentiment": avg_sentiment,
                "most_common_mood": most_common_mood,
                "entry_count": data["count"]
            })

        # Sort by date
        results.sort(key=lambda x: x["date"])

        # Calculate overall trends
        sentiment_values = [r["average_sentiment"] for r in results]
        if len(sentiment_values) > 1:
            overall_trend = "improving" if sentiment_values[-1] > sentiment_values[0] else "declining"
            volatility = np.std(sentiment_values) if len(sentiment_values) > 2 else 0
        else:
            overall_trend = "stable"
            volatility = 0

        return {
            "daily_data": results,
            "overall_trend": overall_trend,
            "volatility": volatility,
            "average_sentiment": np.mean(sentiment_values) if sentiment_values else 0,
            "total_entries": sum(r["entry_count"] for r in results)
        }

def display_welcome():
    """Display welcome message and streak info"""
    console.print(Panel.fit(
        "[bold blue]Welcome to AI Journal[/bold blue]\n"
        "Your intelligent mental health companion",
        title="📔 AI Journal",
        border_style="blue"
    ))

def display_menu():
    """Display main menu options"""
    console.print("\n[bold cyan]Menu Options:[/bold cyan]")
    console.print("1. Write new journal entry")
    console.print("2. Chat with AI companion")
    console.print("3. Get journaling prompt")
    console.print("4. View recent entries")
    console.print("5. View mood analysis")
    console.print("6. Logout")
    console.print("7. Exit")
    return Prompt.ask("Choose an option", choices=["1", "2", "3", "4", "5", "6", "7"])

def display_streak_info(bot):
    """Display user streak information"""
    if not bot.user_id:
        return

    console.print(f"\n[green]Current streak: {bot.current_streak} days[/green]")
    console.print(f"[green]Longest streak: {bot.longest_streak} days[/green]")

def login_or_register():
    """Handle login or registration flow"""
    console.print("\n[bold cyan]Authentication[/bold cyan]")
    console.print("1. Login")
    console.print("2. Register")
    console.print("3. Exit")
    choice = Prompt.ask("Choose an option", choices=["1", "2", "3"])

    if choice == "3":
        return None

    username = Prompt.ask("Username")
    password = getpass.getpass("Password: ")

    bot = JournalBot()

    if choice == "1":
        success = bot.login_user(username, password)
    else:  # choice == "2"
        success = bot.register_user(username, password)

    if success:
        return bot
    else:
        console.print("[yellow]Press Enter to continue...[/yellow]")
        input()
        return login_or_register()

def write_journal_entry(bot):
    """Handle writing a new journal entry"""
    console.print("\n[bold cyan]New Journal Entry[/bold cyan]")
    console.print("(Type 'done' on a new line when finished)")
    console.print("Start writing your thoughts below:")

    lines = []
    while True:
        line = input()
        if line.lower().strip() == 'done':
            break
        lines.append(line)

    content = "\n".join(lines)

    if not content.strip():
        console.print("[yellow]Entry was empty. Cancelled.[/yellow]")
        return

    # Get mood
    console.print("\nHow would you describe your mood?")
    console.print("1. Happy")
    console.print("2. Content")
    console.print("3. Neutral")
    console.print("4. Anxious")
    console.print("5. Sad")
    console.print("6. Other (specify)")

    mood_choice = Prompt.ask("Choose a mood", choices=["1", "2", "3", "4", "5", "6"])

    mood_map = {
        "1": "happy",
        "2": "content",
        "3": "neutral",
        "4": "anxious",
        "5": "sad"
    }

    if mood_choice == "6":
        mood = Prompt.ask("Specify your mood")
    else:
        mood = mood_map[mood_choice]

    # Save entry
    entry_id = bot.create_journal_entry(content, mood)

    if entry_id:
        console.print("\n[green]Journal entry saved successfully![/green]")

        # Generate AI response
        console.print("\n[bold cyan]AI Reflection:[/bold cyan]")
        with console.status("[cyan]Generating reflection...[/cyan]"):
            response = bot.generate_ai_response(content)

        console.print(Panel(Markdown(response), title="AI Reflection", border_style="cyan"))

    console.print("\n[yellow]Press Enter to continue...[/yellow]")
    input()

def chat_with_ai(bot):
    """Chat with the AI companion"""
    console.print("\n[bold cyan]Chat with AI Companion[/bold cyan]")
    console.print("(Type 'exit' to return to main menu)")

    while True:
        user_input = Prompt.ask("\nYou")

        if user_input.lower() == 'exit':
            break

        with console.status("[cyan]Thinking...[/cyan]"):
            response = bot.generate_ai_response(user_input)

        console.print(Panel(Markdown(response), title="AI", border_style="cyan"))

def get_journal_prompt(bot):
    """Get a personalized journaling prompt"""
    console.print("\n[bold cyan]Journaling Prompt[/bold cyan]")

    with console.status("[cyan]Generating prompt...[/cyan]"):
        prompt = bot.generate_journal_prompt()

    console.print(Panel(Markdown(prompt), title="Today's Prompt", border_style="cyan"))

    if Confirm.ask("Would you like to write a journal entry based on this prompt?"):
        write_journal_entry(bot)
    else:
        console.print("\n[yellow]Press Enter to continue...[/yellow]")
        input()

def view_recent_entries(bot):
    """View recent journal entries"""
    console.print("\n[bold cyan]Recent Journal Entries[/bold cyan]")

    entries = bot.get_recent_entries(limit=5)

    if not entries:
        console.print("[yellow]No entries found.[/yellow]")
    else:
        for entry in entries:
            date_str = entry["created_at"].strftime("%B %d, %Y at %I:%M %p")
            console.print(Panel(
                f"[italic]{entry['content']}[/italic]\n\n"
                f"[blue]Mood: {entry['mood']}[/blue]",
                title=f"Entry from {date_str}",
                border_style="blue"
            ))

    console.print("\n[yellow]Press Enter to continue...[/yellow]")
    input()

def view_mood_analysis(bot):
    """View mood analysis"""
    console.print("\n[bold cyan]Mood Analysis[/bold cyan]")

    days = int(Prompt.ask("How many days to analyze?", default="30"))

    with console.status("[cyan]Analyzing mood trends...[/cyan]"):
        analysis = bot.analyze_mood_trends(days=days)

    if "message" in analysis:
        console.print(f"[yellow]{analysis['message']}[/yellow]")
    else:
        console.print(Panel(
            f"[bold]Overall Mood Trend:[/bold] {analysis['overall_trend']}\n"
            f"[bold]Average Sentiment:[/bold] {analysis['average_sentiment']:.2f} (-1 to +1 scale)\n"
            f"[bold]Total Entries:[/bold] {analysis['total_entries']}\n",
            title=f"Mood Analysis (Last {days} Days)",
            border_style="cyan"
        ))

        # Simple visualization of daily sentiment
        if analysis['daily_data']:
            console.print("[bold]Daily Sentiment Trend:[/bold]")
            for day in analysis['daily_data']:
                sentiment = day['average_sentiment']
                # Create a simple bar chart
                bar_length = int((sentiment + 1) * 20)  # Scale -1 to 1 to 0 to 40
                bar = "█" * bar_length
                color = "green" if sentiment > 0.25 else "yellow" if sentiment > -0.25 else "red"
                console.print(f"{day['date']}: [{color}]{bar}[/{color}] ({sentiment:.2f}) - {day['most_common_mood']}")

    console.print("\n[yellow]Press Enter to continue...[/yellow]")
    input()

def main():
    """Main function to run the CLI app"""
    os.system('cls' if os.name == 'nt' else 'clear')
    display_welcome()

    # Login or register
    bot = login_or_register()
    if not bot:
        console.print("[yellow]Goodbye![/yellow]")
        return

    # Main menu loop
    while True:
        os.system('cls' if os.name == 'nt' else 'clear')
        display_welcome()
        display_streak_info(bot)

        choice = display_menu()

        if choice == "1":  # Write new journal entry
            write_journal_entry(bot)
        elif choice == "2":  # Chat with AI
            chat_with_ai(bot)
        elif choice == "3":  # Get prompt
            get_journal_prompt(bot)
        elif choice == "4":  # View recent entries
            view_recent_entries(bot)
        elif choice == "5":  # View mood analysis
            view_mood_analysis(bot)
        elif choice == "6":  # Logout
            bot = login_or_register()
            if not bot:
                console.print("[yellow]Goodbye![/yellow]")
                break
        elif choice == "7":  # Exit
            console.print("[yellow]Goodbye![/yellow]")
            break

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n[yellow]Program interrupted. Exiting...[/yellow]")
    except Exception as e:
        console.print(f"\n[red]An error occurred: {str(e)}[/red]")