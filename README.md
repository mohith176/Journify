# Journify: AI-Powered Journaling for Mental Well-being  

**Your Empathetic Companion for Reflective Journaling and Mental Health Insights**  

 

Journify is an open-source AI journaling platform designed to help users improve mental health through guided reflection, mood tracking, and habit-building gamification. Combining Retrieval-Augmented Generation (RAG) with long-term memory capabilities, Journify acts as a personalized companion that understands your emotional journey and provides actionable insights.  

---

## Table of Contents  
- [Key Features](#key-features)  
- [Core Components](#core-components) 
- [Self-Hosting Guide](#self-hosting-guide)  
- [Access](#access) 

---

## Key Features  
✨ **Conversational AI Journaling**  
- Chat with an empathetic AI companion trained with **RAG** for context-aware responses.  
- Choose between guided prompts or free-form conversations.  
- Choose between long or short form of journaling as per your preference.

📊 **Mood Analytics Dashboard**  
- Visualize emotional trends via sentiment analysis of journal entries.  
- Track progress with summaries and AI-generated insights.  

🎮 **Gamified Habit-Building**  
- Earn badges, maintain streaks, and unlock achievements for consistent journaling.  
- Daily challenges tailored to your mental health goals.  

🔒 **Security**   
- OAuth 2.0 authentication with Google and Facebook for streamlined, secure login
- End-to-end encryption for all journal entries and personal data

🌐 **Multi-Language Support**  
- Interact with the AI in your preferred language while retaining an English UI.  

---


## Core Components  
| **Component**       | **Tech Stack**                          | **Purpose**                                                                 |  
|----------------------|-----------------------------------------|-----------------------------------------------------------------------------|  
| **Frontend**         | React.js, Tailwind CSS, Bootstrap        | Responsive UI for journaling, dashboards, and analytics.                   |  
| **Backend API**      | Node.js, Express.js                     | REST API for user authentication, journal storage, and AI integration.      |  
| **AI Engine**        | OpenAI GPT-4, LangChain, Hugging Face   | RAG model for personalized prompts and conversational memory.               |  
| **Database**         | MongoDB (journal data), Pinecone (RAG)  | Secure storage + semantic search for past entries.                          |  
| **DevOps**           |  Vercel, Render                     | Scalable cloud deployment and CI/CD pipelines.                              |  

---

## Use Cases  

### 🧠 Mental Health Support  
> **Prompt**: "I’ve been feeling overwhelmed with exams. Can you suggest ways to manage stress?"  
> **Journify**: Analyzes past entries about academic pressure, recommends CBT-based techniques, and tracks mood changes post-intervention.  

### 🎓 Student Productivity  
> **Prompt**: "Help me balance study time and self-care this week."  
> **Journify**: Creates a schedule with Pomodoro timers

### 💼 Professional Burnout Prevention  
> **Prompt**: "I need to vent about a toxic workplace."  
> **Journify**: Provides empathetic listening, flags recurring stress patterns, and suggests boundary-setting strategies.   

---

## Access 

[Click here to visit the website](https://journify-deploy.vercel.app/)

---
## Self-Hosting Guide  

### Prerequisites  
- MongoDB Atlas cluster (free tier)  
- Pinecone account for vector DB  
- OpenAI API key  
- Node.js v18+ and npm  

### Installation  
1. Clone the repository:  
```bash  
git clone https://github.com/DASS-Spring-2025/dass-spring-2025-project-team-41  
cd dass-spring-2025-project-team-41/code
```

2. Create .env files for frontend and backend:

```bash
# Backend

JWT_SECRET="your-jwt-secret-key"
OPENAI_API_KEY="your-openai-api-key"
PORT=5000

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_TRANSALTE_API_KEY="your-google-transalte-api-key"
EMAIL_USER="your-email"
EMAIL_PASS="your-email-password"
FACEBOOK_APP_ID="your-facebook-app-id"
FACEBOOK_APP_SECRET="your-facebook-app-secret-key"
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_INDEX_NAME="your-pinecone-index-name"
```
```bash
# Frontend
VITE_GOOGLE_CLIENT_ID="your-google-client-id"
VITE_FACEBOOK_APP_ID="your-facebook-app-id"
```

```bash
# Replace Api URL everywhere
const API_BASE_URL = 'https://localhost:5000';
```


3. Install dependencies and run:

```bash
# Backend  
cd backend  
npm install  
npm run dev  
```
```bash
# Frontend  
cd ../frontend  
npm install  
npm run dev  
```

4. Access Journify locally at http://localhost:5000

