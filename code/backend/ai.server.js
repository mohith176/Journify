import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import cors from 'cors';
import userRoutes from './routes/user.route.js';
import chatRoutes from './routes/chat.route.js';
import summaryRoutes from './routes/summary.route.js';
import moodRoutes from './routes/mood.route.js'; 
import analyzeRoutes from './routes/analyze.route.js';
import progressRoutes from './routes/progress.route.js';
import insightsRoutes from './routes/insights.route.js';
import { cleanupSessions } from './controllers/chat.controller.js';
import goalsRoutes from './routes/goals.route.js';

dotenv.config();
const PORT = process.env.PORT || 5000;

// Create Express app
const app = express();

// Middleware
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
  optionSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/mood', moodRoutes); 
app.use('/api/analyze', analyzeRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/goals', goalsRoutes);

// Cleanup inactive sessions every 30 minutes
setInterval(cleanupSessions, 30 * 60 * 1000);

// Start server
app.listen(PORT, async () => {
  try {
    await connectDB();
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (error) {
    console.error("Server startup error:", error);
  }
});