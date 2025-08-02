"use client"

import { useState, useEffect, useRef } from "react"
import "./Progress.css"
import { Link, useNavigate } from "react-router-dom"
import {
  FaHome,
  FaBook,
  FaFileAlt,
  FaChartPie,
  FaCog as SettingsIcon,
  FaCalendarAlt as Calendar,
  FaMedal as Award,
  FaLightbulb,
  FaBullseye as Target,
  FaFlag,
  FaTrashAlt,
  FaCheck,
  FaTimes,
  FaPencilAlt,
  FaExclamationTriangle,
  FaCalendarDay,
  FaCalendarWeek,
  FaStar,
  FaBullseye,
  FaRandom,
  FaInfo,
  FaGrin,
  FaTasks
} from "react-icons/fa"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  Award as AwardIcon,
  Target as TargetIcon,
  Flag,
  Smile,
  PenTool,
  CheckSquare
} from "react-feather"
import { Home, BookOpen, BarChart2, Lightbulb, Settings, LogOut } from 'lucide-react';
import { RefreshCw, Flame, Sparkles, X } from "lucide-react"
import {
  Book, PieChart, FileText
} from 'react-feather';
import { Navbar, Container, Nav, Button, Modal, Form, Badge } from "react-bootstrap"
import axios from "axios"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import EmojiPicker from 'emoji-picker-react'
import { toast, ToastContainer } from "react-toastify"
import { motion, AnimatePresence } from 'framer-motion'
import "react-toastify/dist/ReactToastify.css"
import { api, API_BASE_URL } from '../config/api';
// import { Progress } from "@/components/ui/progress"
// import { Skeleton } from "@/components/ui/skeleton"

// Add this function after your imports
const normalizeGoalData = (goals) => {
  if (!Array.isArray(goals)) return [];
  
  return goals.map(goal => {
    // Make a copy to avoid mutating the original
    const normalizedGoal = {...goal};
    
    // Convert status from backend format (with underscore) to frontend format (with hyphen)
    if (normalizedGoal.status === 'not_started') normalizedGoal.status = 'not-started';
    if (normalizedGoal.status === 'in_progress') normalizedGoal.status = 'in-progress';
    
    // Ensure the streak object is properly structured
    if (!normalizedGoal.streak) {
      normalizedGoal.streak = { current: 0, best: 0 };
    }
    // Convert deadline to Date object if it exists
    if (normalizedGoal.deadline) {
      normalizedGoal.deadline = new Date(normalizedGoal.deadline);
    }

    return normalizedGoal;
  });
};

// Helper function to check if a daily goal is completed today
const isCompletedToday = (goal) => {
  if (!goal.completionHistory) return false;
  
  const today = new Date().setHours(0,0,0,0);
  return goal.completionHistory.some(entry => {
    const entryDate = new Date(entry.date).setHours(0,0,0,0);
    return entryDate === today && entry.completed;
  });
};

const Progress = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [progressData, setProgressData] = useState({
    entriesCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    activeMonths: 0,
    journalDates: [],
  })
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [streakHistory, setStreakHistory] = useState([])
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [categorizedBadges, setCategorizedBadges] = useState({})
  
  //challenges state
  const [challenges, setChallenges] = useState([]);
  const [displayedChallenges, setDisplayedChallenges] = useState([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [challengeError, setChallengeError] = useState(null);
  const [refreshingChallenges, setRefreshingChallenges] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  
  const [totalPoints, setTotalPoints] = useState([]);
  const [showReviveModal, setShowReviveModal] = useState([]);
  const [revivedToday, setRevivedToday] = useState([]);
  const [reviveCost, setReviveCost] = useState([]); // Base cost to revive streak


  // Goals state
  const [goals, setGoals] = useState([])
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [goalFormData, setGoalFormData] = useState({
    title: '',
    description: '',
    type: 'normal',
    status: 'not-started',
    priority: 'medium',
    deadline: null,
    emoji: '🎯',
    details: '',
    target: 1,
    progress: 0
  })
  const [editingGoalId, setEditingGoalId] = useState(null)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [showGoalDetails, setShowGoalDetails] = useState(false)
  const [goalUpdating, setGoalUpdating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [goalToDelete, setGoalToDelete] = useState(null)
  const [goalFilterType, setGoalFilterType] = useState('all')
  const [goalFilterStatus, setGoalFilterStatus] = useState('all')
  const [goalFilterPriority, setGoalFilterPriority] = useState('all')
  
  // Random emoji list for goals
  const emojiOptions = [
    '🎯', '✨', '🚀', '📚', '💪', '🧘', '🏆', '📝', '🌱', '🔥', 
    '⭐', '📊', '🌟', '💡', '🏃', '🧠', '❤️', '🌈', '🏋️', '🌊'
  ]
  
  // Categorize badges by type
  const categorizeBadges = (badgesList) => {
    // Log all badges to help with debugging
    console.log("All badges:", badgesList);
    
    const categories = {
      streaks: badgesList.filter(badge => 
        badge.name.toLowerCase().includes('streak') || 
        badge.name.toLowerCase().includes('day streak')
      ),
      
      consistency: badgesList.filter(badge => 
        badge.name.toLowerCase().includes('consistency') || 
        badge.name.toLowerCase().includes('dedicated') ||
        badge.name.toLowerCase().includes('journal enthusiast') ||
        badge.name.toLowerCase().includes('journal virtuoso') ||
        badge.name.toLowerCase().includes('weekly') ||
        badge.criteria?.type === 'entryCount'
      ),
      
      writing: badgesList.filter(badge => 
        badge.name.toLowerCase().includes('writer') || 
        badge.name.toLowerCase().includes('word') ||
        badge.name.toLowerCase().includes('essay') ||
        badge.name.toLowerCase().includes('novelist') ||
        badge.name.toLowerCase().includes('eloquent') ||
        badge.name.toLowerCase().includes('budding writer') ||
        badge.criteria?.type === 'wordCount'
      ),
      
      mood: badgesList.filter(badge => 
        badge.name.toLowerCase().includes('mood') || 
        badge.name.toLowerCase().includes('emotion') ||
        badge.name.toLowerCase().includes('positive')
      ),
      
      timeOfDay: badgesList.filter(badge => 
        badge.name.toLowerCase().includes('night owl') || 
        badge.name.toLowerCase().includes('early bird') ||
        badge.name.toLowerCase().includes('lunch break')
      ),
      
      special: badgesList.filter(badge => 
        badge.name.toLowerCase().includes('newcomer') || 
        badge.name.toLowerCase().includes('first month') ||
        badge.name.toLowerCase().includes('veteran') ||
        badge.name.toLowerCase().includes('deep thinker') ||
        badge.name.toLowerCase().includes('philosopher') ||
        badge.name.toLowerCase().includes('weekend warrior') ||
        badge.name.toLowerCase().includes('holiday') ||
        badge.name.toLowerCase().includes('new year')
      )
    };
    
    // Log categorized badges to help with debugging
    console.log("Categorized badges:", categories);
    
    return categories;
  };

  // Fetch progress data and goals on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please log in to view your progress");
          navigate("/login");
          return;
        }
        await fetchUserPoints();
        // Make all API calls in parallel
        const [progressResponse, badgesResponse, streakResponse, goalsResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/progress`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/api/progress/badges`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/api/progress/streak-history`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/api/goals`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);

        // Process results
        setProgressData(progressResponse.data);
        setBadges(badgesResponse.data);
        setCategorizedBadges(categorizeBadges(badgesResponse.data));
        setStreakHistory(streakResponse.data.streakHistory || []);
        
        if (goalsResponse.data) {
          const normalizedGoals = normalizeGoalData(goalsResponse.data);
          setGoals(normalizedGoals);
        }
      } catch (err) {
        console.error("Error details:", err.response?.data || err.message);
        setError("Failed to load progress data");
        if (err.response?.status === 401) {
          localStorage.removeItem("token"); // Clear invalid token
          setError("Your session has expired. Please log in again.");
          setTimeout(() => navigate("/login"), 2000); // Redirect after showing error
        } else {
          setError("Failed to load progress data: " + (err.response?.data?.message || err.message));
        }

        // Set placeholder data for demo purposes
        setProgressData({
          entriesCount: 0,
          currentStreak: 0,
          longestStreak: 0,
          activeMonths: 0,
          journalDates: [
            { date: "2025-01-15T00:00:00.000Z", content: "Sample entry with medium length text" },
            { date: "2025-01-16T00:00:00.000Z", content: "Another sample entry with longer text content to demonstrate the color variation in the calendar cells based on entry length" }
          ],
        });
        
        // Set sample goals for demonstration
        setGoals([
          {
            _id: "g1",
            title: "Daily Journal Habit",
            description: "Write at least one journal entry every day",
            type: "daily",
            status: "in-progress",
            priority: "high",
            emoji: "📝",
            streak: 5,
            target: 1,
            progress: 1
          },
          {
            _id: "g2",
            title: "Monthly Reflection",
            description: "Complete monthly reflection on personal growth",
            type: "normal",
            status: "not-started",
            priority: "medium",
            emoji: "🧠",
            deadline: new Date(new Date().setDate(new Date().getDate() + 14)),
            target: 1,
            progress: 0
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    setDisplayedChallenges(challenges);
  }, [challenges]);

  // Generate calendar data for the heatmap
  const generateCalendarData = () => {
    // Create start and end dates based on selected year
    const startDate = new Date(selectedYear, 0, 1) // Jan 1 of selected year
    const endDate = new Date(selectedYear, 11, 31) // Dec 31 of selected year
    
    // Always start from Sunday of the first week that includes a day of the selected year
    const firstDay = new Date(startDate)
    const dayOffset = firstDay.getDay()
    firstDay.setDate(firstDay.getDate() - dayOffset)
    
    // End on the Saturday of the last week that includes a day of the selected year
    const lastDay = new Date(endDate)
    lastDay.setDate(lastDay.getDate() + (6 - lastDay.getDay()))
    
    // Create array of all days within display range
    const days = []
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d))
    }
    
    // Calculate week columns for the entire year
    const totalWeeks = Math.ceil(days.length / 7)
    
    // Prepare month data for labels (fixed positioning)
    const monthLabels = []
    const monthPositions = [0, 4, 9, 13, 17, 22, 26, 30, 35, 39, 43, 48]
    
    // Create month names in order
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    
    // Apply positions to each month
    monthNames.forEach((name, index) => {
      monthLabels.push({
        name,
        position: monthPositions[index]
      })
    })
    
    // Create a map of dates with journal entries for quick lookup
    const entryDatesMap = {}
    if (progressData.journalDates) {
      progressData.journalDates.forEach((entry) => {
        const dateStr = new Date(entry.date).toISOString().split("T")[0]
        entryDatesMap[dateStr] = entry
      })
    }

    // Map each day to its activity level
    const calendarData = days.map((day) => {
      const dateStr = day.toISOString().split("T")[0]
      const entryData = entryDatesMap[dateStr]

      // Determine activity level (0-4)
      let level = 0
      if (entryData) {
        const contentLength = entryData.content ? entryData.content.length : 0
        if (contentLength > 500) level = 4
        else if (contentLength > 300) level = 3
        else if (contentLength > 100) level = 2
        else level = 1
      }

      return {
        date: day,
        level,
        count: level > 0 ? 1 : 0, // For tooltip display
        isCurrentYear: day.getFullYear() === selectedYear,
        dayOfWeek: day.getDay() // 0 = Sunday, 1 = Monday, etc.
      }
    })
    
    return { calendarData, monthLabels }
  }
  
  // Handle goal form input changes
  const handleGoalFormChange = (e) => {
    const { name, value } = e.target
    setGoalFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle emoji selection for goal
  const handleEmojiClick = (emojiData) => {
    setGoalFormData(prev => ({
      ...prev,
      emoji: emojiData.emoji
    }))
    setShowEmojiPicker(false)
  }
  
  // Generate a random emoji for goal
  const handleRandomEmoji = () => {
    const randomIndex = Math.floor(Math.random() * emojiOptions.length)
    setGoalFormData(prev => ({
      ...prev,
      emoji: emojiOptions[randomIndex]
    }))
  }
  
  // Handle date selection for goal deadline
  const handleDeadlineChange = (date) => {
    setGoalFormData(prev => ({
      ...prev,
      deadline: date
    }))
  }

  // Submit goal form (create or edit)
  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    setGoalUpdating(true);
    
    try {
      const token = localStorage.getItem("token");
      console.log("Submitting goal form data:", goalFormData);
      
      // Add proper handling for daily goals
      const submissionData = {...goalFormData};
      
      // For daily goals, ensure appropriate defaults
      if (submissionData.type === 'daily') {
        // Daily goals don't use these fields
        delete submissionData.target;
        delete submissionData.progress;
        delete submissionData.status; // Status is managed by completion history
      }
      console.log("Submitting goal form data:", submissionData);
      if (editingGoalId) {
        // Update existing goal
        const response = await axios.put(
          `${API_BASE_URL}/api/goals/${editingGoalId}`,
          submissionData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setGoals(prev => 
          prev.map(goal => 
            goal._id === editingGoalId ? normalizeGoalData([response.data])[0] : goal
          )
        );
        
        toast.success("Goal updated successfully!");
      } else {
        // Create new goal
        const response = await axios.post(
          `${API_BASE_URL}/api/goals`, 
          submissionData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const newGoal = normalizeGoalData([response.data])[0];
        setGoals(prev => [newGoal, ...prev]);
        toast.success("New goal created!");
      }
      
      handleCloseGoalModal();
    } catch (err) {
      console.error("Error saving goal:", err);
      console.error("Error response data:", err.response?.data);
      toast.error(`Failed to save goal: ${err.response?.data?.message || 'Please try again'}`);
    } finally {
      setGoalUpdating(false);
    }
  };
  
  // Delete a goal
  const handleDeleteGoal = async () => {
    if (!goalToDelete) return
    
    try {
      const token = localStorage.getItem("token")
      await axios.delete(`${API_BASE_URL}/api/goals/${goalToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setGoals(prev => prev.filter(goal => goal._id !== goalToDelete))
      setShowDeleteConfirm(false)
      setGoalToDelete(null)
      
      if (selectedGoal && selectedGoal._id === goalToDelete) {
        setSelectedGoal(null)
        setShowGoalDetails(false)
      }
      
      toast.success("Goal deleted successfully")
    } catch (err) {
      console.error("Error deleting goal:", err)
      toast.error("Failed to delete goal. Please try again.")
    }
  }
  
  // Open goal creation modal
  const handleOpenGoalModal = () => {
    setEditingGoalId(null)
    setGoalFormData({
      title: '',
      description: '',
      type: 'normal',
      status: 'not-started',
      priority: 'medium',
      deadline: null,
      emoji: '🎯',
      details: '',
      target: 1,
      progress: 0
    })
    setShowGoalModal(true)
  }
  
  // Open goal edit modal with existing data
  const handleEditGoal = (goal) => {
    setEditingGoalId(goal._id);
    let normalizedStatus = goal.status;
    if (goal.status === 'not_started') normalizedStatus = 'not-started';
    if (goal.status === 'in_progress') normalizedStatus = 'in-progress';
    setGoalFormData({
      title: goal.title || '',
      description: goal.description || '',
      type: goal.type || 'normal',
      // Normalize status value
      status: normalizedStatus,
      priority: goal.priority || 'medium',
      deadline: goal.deadline ? new Date(goal.deadline) : null,
      emoji: goal.emoji || '🎯',
      details: goal.details || '',
      target: goal.target || 1,
      progress: goal.progress || 0
    });
    setShowGoalModal(true);
    setShowGoalDetails(false);
  };
  
  // Close goal modal and reset form
  const handleCloseGoalModal = () => {
    setShowGoalModal(false)
    setShowEmojiPicker(false)
    setEditingGoalId(null)
  }
  
  // View goal details
  const handleViewGoalDetails = (goal) => {
    setSelectedGoal(goal)
    setShowGoalDetails(true)
  }
  
  // Close goal details modal
  const handleCloseGoalDetails = () => {
    setShowGoalDetails(false)
    setSelectedGoal(null)
  }

// Update goal status
const handleUpdateGoalStatus = async (goalId, newStatus) => {
  try {
    setGoalUpdating(true);
    const token = localStorage.getItem("token");
    console.log("Updating goal status:", { goalId, newStatus });
    
    // Use PUT method with correct endpoint
    const response = await axios.put(
      `${API_BASE_URL}/api/goals/${goalId}`, 
      { status: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // Get updated goal from response
    const updatedGoal = response.data;
    
    // Update goals list
    setGoals(prevGoals => 
      prevGoals.map(goal => 
        goal._id === goalId ? updatedGoal : goal
      )
    );
    
    // Close the details modal if it's open
    if (showGoalDetails && selectedGoal && selectedGoal._id === goalId) {
      handleCloseGoalDetails();
    }
    
    toast.success(`Goal marked as ${newStatus}!`);
  } catch (err) {
    console.error("Error updating goal status:", err);
    console.error("Error response data:", err.response?.data || err.message);
    toast.error("Failed to update goal status.");
  } finally {
    setGoalUpdating(false);
  }
};

 // Update daily goal progress
const handleDailyGoalAction = async (goalId, completed) => {
  try {
    setGoalUpdating(true);
    const token = localStorage.getItem("token");
    
    // Log for debugging
    console.log(`Updating daily goal ${goalId} to completed: ${completed}`);
    
    const response = await axios.post(
      `${API_BASE_URL}/api/goals/${goalId}/complete`, 
      { completed },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // Get the updated goal data from the response
    const updatedGoal = response.data;
    
    // Update ALL instances of this goal in the state
    setGoals(prevGoals => 
      prevGoals.map(goal => 
        goal._id === goalId ? updatedGoal : goal
      )
    );
    
    // If the selected goal modal is showing this goal, update it too
    if (selectedGoal && selectedGoal._id === goalId) {
      setSelectedGoal(updatedGoal);
    }
    
    toast.success(completed ? "Habit marked as completed for today!" : "Habit marked as skipped for today.");
    
    // If a daily goal is completed for today, it should no longer appear in the "Today's Habits" section
    // This will happen automatically on the next render when dailyGoals is calculated
    
  } catch (err) {
    console.error("Error updating daily goal:", err);
    console.error("Error details:", err.response?.data || err.message);
    toast.error("Failed to update habit status.");
  } finally {
    setGoalUpdating(false);
  }
};
  
  // Update goal progress
  const handleUpdateProgress = async (goalId, newProgress) => {
    try {
      const token = localStorage.getItem("token")
      
      // First find the goal to get the target
      const goal = goals.find(g => g._id === goalId)
      if (!goal) return
      
      // Ensure progress doesn't exceed target
      const validProgress = Math.min(newProgress, goal.target)
      
      const response = await axios.patch(`${API_BASE_URL}/api/goals/${goalId}/progress`, 
        { progress: validProgress },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      
      setGoals(prev => prev.map(goal => 
        goal._id === goalId ? { ...goal, progress: validProgress } : goal
      ))
      
      if (selectedGoal && selectedGoal._id === goalId) {
        setSelectedGoal(prev => ({ ...prev, progress: validProgress }))
      }
      
      // If progress equals target, automatically complete the goal
      if (validProgress === goal.target && goal.status !== 'completed') {
        handleUpdateGoalStatus(goalId, 'completed')
      } else {
        toast.info("Progress updated!")
      }
    } catch (err) {
      console.error("Error updating goal progress:", err)
      toast.error("Failed to update goal progress")
    }
  }
  
  // Fix the filtering function to handle both formats
const filteredGoals = goals.filter(goal => {
  // Filter by type
  if (goalFilterType !== 'all' && goal.type !== goalFilterType) return false;
  
  // Filter by status - handle both formats 
  if (goalFilterStatus !== 'all') {
    // Check for both formats (with underscore and with hyphen)
    const statusMatches = 
      goal.status === goalFilterStatus || 
      (goalFilterStatus === 'not-started' && goal.status === 'not_started') ||
      (goalFilterStatus === 'in-progress' && goal.status === 'in_progress');
    
    if (!statusMatches) return false;
  }
  
  // Filter by priority
  if (goalFilterPriority !== 'all' && goal.priority !== goalFilterPriority) return false;
  
  return true;
});
  
  // Get daily goals that need attention - update this function
  const dailyGoals = goals.filter(goal => {
    if (goal.type !== 'daily') return false;

    // Skip inactive goals
    if (goal.active === false) return false;

    // Check if already completed today
    const today = new Date().setHours(0,0,0,0);
    const completedToday = goal.completionHistory?.some(entry => {
      const entryDate = new Date(entry.date).setHours(0,0,0,0);
      return entryDate === today && entry.completed;
    });
    
    // Only show goals that haven't been completed today
    return !completedToday;
  });
  // Get upcoming deadlines (goals due in the next 7 days)
  const upcomingDeadlines = goals.filter(goal => 
    goal.deadline && 
    goal.status !== 'completed' &&
    new Date(goal.deadline) > new Date() &&
    new Date(goal.deadline) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ).sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
  
  // Format date to readable string
  const formatDate = (date) => {
    if (!date) return ""
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  // Check if a goal is overdue
  const isOverdue = (goal) => {
    return goal.deadline && 
           goal.status !== 'completed' && 
           new Date(goal.deadline) < new Date()
  }

// Add function to fetch user's points
const fetchUserPoints = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    const response = await axios.get(`${API_BASE_URL}/api/progress/points`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(response.data);
    setTotalPoints(response.data.points || 0);
    setReviveCost(response.data.nextReviveCost || 100);
    setRevivedToday(response.data.revivedToday || false);
  } catch (err) {
    console.error("Error fetching points:", err);
  }
};

// Add this function for streak revival
const handleReviveStreak = async () => {
  try {
    if (totalPoints < reviveCost) {
      toast.error(`Not enough points! You need ${reviveCost} points to revive your streak.`);
      return;
    }
    
    const token = localStorage.getItem("token");
    const response = await axios.post(`${API_BASE_URL}/api/progress/revive-streak`, 
      { cost: reviveCost },
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    // Update points and progress data
    setTotalPoints(prev => prev - reviveCost);
    setProgressData(prev => ({
      ...prev,
      currentStreak: prev.currentStreak + 1
    }));
    setRevivedToday(true);
    setReviveCost(response.data.nextReviveCost || reviveCost * 1.5);
    
    toast.success("Streak saved successfully!");
    setShowReviveModal(false);
  } catch (err) {
    console.error("Error reviving streak:", err);
    toast.error("Failed to revive streak: " + (err.response?.data?.message || err.message));
  }
};

// Use this version in your React component
const completeChallenge = async (challengeId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${API_BASE_URL}/api/progress/challenges/${challengeId}/complete`,
      {},  // Empty request body
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    // Update total points if returned in response
    console.log(response.data);
    if (response.data.points!==undefined) {
      setTotalPoints(response.data.points);
    }
    
    // Show notification with points earned
    if (response.data.points > 0) {
      toast.success(`Challenge completed! You earned ${response.data.points} points.`);
    }
    
    // If a badge was earned, show that too
    if (response.data.badge) {
      toast.success(`You earned the ${response.data.badge.name} badge!`, {
        autoClose: 5000
      });
    }
    
    // Refresh challenges list
    fetchChallenges();
    
    return true;
  } catch (err) {
    console.error("Error completing challenge:", err);
    toast.error(`Failed to complete challenge: ${err.response?.data?.message || err.message}`);
    return false;
  }
};

  const handleRefreshChallenges = async () => {
    setRefreshingChallenges(true);
    setRefreshError(null);
    try {
      await api.post('/api/progress/refresh');
      
      // After refreshing, get the new set of challenges
      const { data } = await api.get('/api/progress/challenges');
      setChallenges(data);
      
    } catch (err) {
      console.error("Error refreshing challenges:", err);
      if (err.response?.status === 400) {
        setRefreshError(err.response.data.message);
      } else {
        setRefreshError("Failed to refresh challenges: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setRefreshingChallenges(false);
    }
  };

  const fetchChallenges = async () => {
    setLoadingChallenges(true);
    setChallengeError(null);
    try {
      const { data } = await api.get('/api/progress/challenges');
      setChallenges(data);
    } catch (err) {
      console.error("Error fetching challenges:", err);
      setChallengeError("Failed to load challenges: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingChallenges(false);
    }
  };
  // Add this with your other useEffect hooks
  useEffect(() => {
    if (activeTab === "challenges") {
      fetchChallenges();
    }
  }, [activeTab]);
  // Add this function to remove challenges from display
  const removeChallenge = (id) => {
    setDisplayedChallenges(prev => prev.filter(ch => ch.id !== id));
  };
  
  // Handle year selection change
  const handleYearChange = (event) => {
    setSelectedYear(parseInt(event.target.value))
  }

  // Simulated logout handler
  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/login")
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your progress data...</p>
      </div>
    )
  }

  const { calendarData, monthLabels } = generateCalendarData()

  // Available years for the dropdown (current year and previous 2 years)
  const availableYears = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2
  ]

  // Renders a badge section with appropriate badges
  const BadgeSection = ({ title, badges = [], showIfEmpty = false }) => {
    if (!badges || (badges.length === 0 && !showIfEmpty)) return null;
    
    const unlockedCount = badges.filter(b => b.achieved).length;
    
    return (
      <div className="badges-section">
        <h4 className="badge-category">
          <span>{title}</span> 
          <span className="category-progress">
            {unlockedCount} of {badges.length} unlocked
          </span>
        </h4>
        <div className="badges-grid">
          {badges.length > 0 ? (
            badges.map((badge, index) => (
              <div 
                key={index} 
                className={`badge-item ${badge.achieved ? 'achieved' : 'locked'}`}
                onClick={() => setSelectedBadge(badge)}
              >
                <div className="badge-icon-container">
                  <div className={`badge-icon rarity-${badge.rarity || 'common'}`}>
                    {badge.icon || "⭐"}
                    {!badge.achieved && (
                      <div className="progress-overlay">
                        <div 
                          className="progress-fill" 
                          style={{height: `${badge.progress || 0}%`}} 
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="badge-name">{badge.name}</div>
                {badge.achieved && (
                  <div className="badge-earned-date">
                    {new Date(badge.achievedOn).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="no-badges-message">No {title.toLowerCase()} badges available yet.</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* <ToastContainer position="top-right" autoClose={4000} /> */}
      
      {/* Navigation */}
        <Navbar bg="white" expand="lg" className="border-bottom shadow-sm">
          <Container fluid>
            <Navbar.Brand as={Link} to="/dashboard" className="d-flex align-items-center">
              <span className="fs-4 me-2">⚡</span>
              <span className="fw-bold">Journify</span>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Link as={Link} to="/dashboard" className="d-flex align-items-center">
                  <Home size={16} className="me-1" /> Dashboard
                </Nav.Link>
                <Nav.Link as={Link} to="/journal" className="d-flex align-items-center">
                  <Book size={16} className="me-1" /> Journal
                </Nav.Link>
                <Nav.Link as={Link} to="/mood" className="d-flex align-items-center">
                  <BarChart2 size={16} className="me-1" /> Mood Tracking
                </Nav.Link>
                <Nav.Link as={Link} to="/summary" className="d-flex align-items-center">
                  <FileText size={16} className="me-1" /> Summaries
                </Nav.Link>
                <Nav.Link as={Link} to="/Progress" className="d-flex align-items-center">
                  <PieChart size={16} className="me-1" /> Progress
                </Nav.Link>
                <Nav.Link as={Link} to="/settings" className="d-flex align-items-center">
                  <Settings size={16} className="me-1" /> Settings
                </Nav.Link>
              </Nav>
              <Button
                variant="outline-secondary"
                size="sm"
                className="d-flex align-items-center"
                onClick={handleLogout}
              >
                <LogOut size={16} className="me-1" /> Logout
              </Button>
            </Navbar.Collapse>
          </Container>
        </Navbar>

      <div className="content-container">
        <div className="progress-container">
          <div className="progress-header">
            <h1>Your Journaling Progress</h1>
            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="stats-overview">
            <div className="stats-card">
              <div className="stat-icon">
                <FaBook />
              </div>
              <div className="stat-content">
                <div className="stat-value">{progressData.entriesCount}</div>
                <div className="stat-label">Total Entries</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stat-icon streak-icon">
                <Calendar />
              </div>
              <div className="stat-content">
                <div className="stat-value">{progressData.currentStreak}</div>
                <div className="stat-label">Current Streak</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stat-icon longest-streak-icon">
                <Award />
              </div>
              <div className="stat-content">
                <div className="stat-value">{progressData.longestStreak}</div>
                <div className="stat-label">Longest Streak</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stat-icon months-icon">
                <Calendar />
              </div>
              <div className="stat-content">
                <div className="stat-value">{progressData.activeMonths}</div>
                <div className="stat-label">Active Months</div>
              </div>
            </div>
          </div>

          <div className="tabs-container">
            <div className="tabs">
              <button
                className={`tab ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                <Calendar className="tab-icon" />
                Overview
              </button>
              <button
                className={`tab ${activeTab === "badges" ? "active" : ""}`}
                onClick={() => setActiveTab("badges")}
              >
                <Award className="tab-icon" />
                Badges
              </button>
              <button
                className={`tab ${activeTab === "goals" ? "active" : ""}`}
                onClick={() => setActiveTab("goals")}
              >
                <FaFlag className="tab-icon" />
                Goals
              </button>
              <button
                className={`tab ${activeTab === "challenges" ? "active" : ""}`}
                onClick={() => setActiveTab("challenges")}
              >
                <Target className="tab-icon" />
                Challenges
              </button>
            </div>

            <div className="tab-content">
              {activeTab === "overview" && (
                <div className="overview-tab">
                  <div className="section-header">
                    <h3>Contribution Activity</h3>
                    <div className="section-actions">
                      <select 
                        className="year-selector" 
                        value={selectedYear}
                        onChange={handleYearChange}
                      >
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      </div>
</div>

                  {progressData.journalDates && progressData.journalDates.length > 0 ? (
                    <div className="github-style-calendar">
                      <div className="calendar-container">
                        <div className="month-labels">
                          {monthLabels.map((month, i) => (
                            <div 
                              key={i} 
                              className="month-label" 
                              style={{ left: `${month.position * 100 / 51}%` }}
                            >
                              {month.name}
                            </div>
                          ))}
                        </div>
                        
                        <div className="calendar-with-labels">
                          <div className="weekday-labels">
                            <div className="weekday-label">Mon</div>
                            <div className="weekday-label">Wed</div>
                            <div className="weekday-label">Fri</div>
                          </div>
                          
                          <div className="calendar-grid">
                            {calendarData.map((day, i) => (
                              <div
                                key={i}
                                className={`calendar-cell level-${day.level} ${!day.isCurrentYear ? 'outside-month' : ''}`}
                                data-tooltip={`${day.date.toLocaleDateString()}: ${day.count} ${day.count === 1 ? "entry" : "entries"}`}
                                style={{
                                  gridRow: day.dayOfWeek === 0 ? 7 : day.dayOfWeek,
                                  gridColumn: Math.floor(i / 7) + 1
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        
                        <div className="calendar-legend">
                          <div className="legend-label">Less</div>
                          <div className="legend-cells">
                            <div className="legend-cell level-0"></div>
                            <div className="legend-cell level-1"></div>
                            <div className="legend-cell level-2"></div>
                            <div className="legend-cell level-3"></div>
                            <div className="legend-cell level-4"></div>
                          </div>
                          <div className="legend-label">More</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p>You haven't created any journal entries yet.</p>
                      <Link to="/journal" className="start-journaling-btn">
                        Start Journaling
                      </Link>
                    </div>
                  )}

                  <div className="streak-summary">
                    <div className="streak-card">
                      <div className="streak-header">Current Streak</div>
                      <div className="streak-value">{progressData.currentStreak} days</div>
                      <div className="streak-subtitle">Keep it going!</div>
                    </div>

                    <div className="streak-card">
                      <div className="streak-header">This Year</div>
                      <div className="streak-value">{progressData.entriesCount} entries</div>
                      <div className="streak-subtitle">
                        {progressData.entriesCount > 0
                          ? `That's ${Math.round((progressData.entriesCount / 365) * 100)}% of days with entries`
                          : "Start your journaling journey today!"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "badges" && (
                <div className="badges-tab">
                  <h3>Your Achievements</h3>
                  
                  {/* Render each badge category section */}
                  <BadgeSection title="Streaks" badges={categorizedBadges.streaks} />
                  <BadgeSection title="Consistency" badges={categorizedBadges.consistency} />
                  <BadgeSection title="Writing" badges={categorizedBadges.writing} />
                  <BadgeSection title="Mood & Emotion" badges={categorizedBadges.mood} />
                  <BadgeSection title="Time of Day" badges={categorizedBadges.timeOfDay} />
                  <BadgeSection title="Special" badges={categorizedBadges.special} />

                      {/* Empty state when no badges exist */}
                      {badges.length === 0 && (
                        <div className="empty-state">
                          <p>You haven't earned any badges yet. Keep journaling to unlock achievements!</p>
                          <Link to="/journal" className="start-journaling-btn">
                            Start Journaling
                          </Link>
                        </div>
                      )}
    
                      {/* Badge details modal */}
                      {selectedBadge && (
                        <div className="badge-modal" onClick={() => setSelectedBadge(null)}>
                          <div className="badge-modal-content" onClick={e => e.stopPropagation()}>
                            <button className="close-modal" onClick={() => setSelectedBadge(null)}>×</button>
                            <div className={`badge-icon-large rarity-${selectedBadge.rarity}`}>
                              {selectedBadge.icon || "⭐"}
                            </div>
                            <h3 className="badge-modal-title">{selectedBadge.name}</h3>
                            <p className="badge-modal-description">{selectedBadge.description}</p>
                            
                            {selectedBadge.achieved ? (
                              <p className="badge-earned">
                                Earned on {new Date(selectedBadge.achievedOn).toLocaleDateString()}
                              </p>
                            ) : (
                              <div className="badge-progress">
                                <div className="progress-bar">
                                  <div 
                                    className="progress-bar-fill" 
                                    style={{width: `${selectedBadge.progress || 0}%`}}
                                  ></div>
                                </div>
                                <p className="progress-text">{selectedBadge.progress || 0}% Complete</p>
                              </div>
                            )}
                            
                            <div className="badge-rarity">
                              <span className={`rarity-tag rarity-${selectedBadge.rarity}`}>
                                {selectedBadge.rarity.charAt(0).toUpperCase() + selectedBadge.rarity.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === "goals" && (
                <div className="goals-tab">
                  <div className="goals-header">
                    <h3>Goals</h3>
                    <Button 
                      variant="primary" 
                      className="add-goal-btn" 
                      onClick={handleOpenGoalModal}
                    >
                      <span>+</span> New Goal
                    </Button>
                  </div>
                  
                  {/* Daily goals section */}
                  {dailyGoals.length > 0 && (
                    <div className="daily-goals-section">
                      <h4 className="section-title">
                        <FaCalendarDay className="section-icon" /> 
                        Today's Habits
                      </h4>
                      <div className="daily-goals-list">
                        {dailyGoals.map(goal => (
                          <div key={goal._id} className="daily-goal-card">
                            <div className="daily-goal-emoji">{goal.emoji || '🎯'}</div>
                            <div className="daily-goal-content">
                              <h4 className="daily-goal-title">{goal.title}</h4>
                              <div className="daily-goal-streak">
                                Streak: <span>{goal.streak?.current || 0}</span> days 
                                {goal.streak?.best > 0 && <> (Best: {goal.streak?.best})</>}
                              </div>
                            </div>
                            <div className="daily-goal-actions">
                              <button
                                className="daily-goal-btn complete"
                                onClick={() => handleDailyGoalAction(goal._id, true)}
                                title="Complete for today"
                              >
                                <FaCheck />
                              </button>
                              <button
                                className="daily-goal-btn skip"
                                onClick={() => handleDailyGoalAction(goal._id, false)}
                                title="Skip today"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                                    {/* Upcoming deadlines section */}
                  {upcomingDeadlines.length > 0 && (
                    <div className="deadlines-section">
                      <h4 className="section-title">
                        <Clock className="section-icon" />
                        Upcoming Deadlines
                      </h4>
                      <div className="deadlines-list">
                        {upcomingDeadlines.map(goal => (
                          <div 
                            key={goal._id} 
                            className="deadline-item"
                            onClick={() => handleViewGoalDetails(goal)}
                          >
                            <div className="deadline-emoji">{goal.emoji || '🎯'}</div>
                            <div className="deadline-content">
                              <div className="deadline-title">{goal.title}</div>
                              <div className="deadline-date">Due: {formatDate(goal.deadline)}</div>
                            </div>
                            <div className={`deadline-priority priority-${goal.priority}`}>{goal.priority}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Goals filter section */}
                  <div className="goals-filters">
                    <div className="filter-group">
                      <label>Type:</label>
                      <div className="btn-group">
                        <button 
                          className={goalFilterType === 'all' ? 'active' : ''}
                          onClick={() => setGoalFilterType('all')}
                        >
                          All
                        </button>
                        <button
                          className={goalFilterType === 'normal' ? 'active' : ''}
                          onClick={() => setGoalFilterType('normal')}
                        >
                          Goals
                        </button>
                        <button
                          className={goalFilterType === 'daily' ? 'active' : ''}
                          onClick={() => setGoalFilterType('daily')}
                        >
                          Habits
                        </button>
                      </div>
                    </div>
                    
                    <div className="filter-group">
                      <label>Status:</label>
                      <div className="btn-group">
                        <button 
                          className={goalFilterStatus === 'all' ? 'active' : ''}
                          onClick={() => setGoalFilterStatus('all')}
                        >
                          All
                        </button>
                        <button
                          className={goalFilterStatus === 'not-started' ? 'active' : ''}
                          onClick={() => setGoalFilterStatus('not-started')}
                        >
                          Not Started
                        </button>
                        <button
                          className={goalFilterStatus === 'in-progress' ? 'active' : ''}
                          onClick={() => setGoalFilterStatus('in-progress')}
                        >
                          In Progress
                        </button>
                        <button
                          className={goalFilterStatus === 'completed' ? 'active' : ''}
                          onClick={() => setGoalFilterStatus('completed')}
                        >
                          Completed
                        </button>
                      </div>
                    </div>
                    
                    <div className="filter-group">
                      <label>Priority:</label>
                      <div className="btn-group">
                        <button 
                          className={goalFilterPriority === 'all' ? 'active' : ''}
                          onClick={() => setGoalFilterPriority('all')}
                        >
                          All
                        </button>
                        <button
                          className={`priority-btn priority-high ${goalFilterPriority === 'high' ? 'active' : ''}`}
                          onClick={() => setGoalFilterPriority('high')}
                        >
                          High
                        </button>
                        <button
                          className={`priority-btn priority-medium ${goalFilterPriority === 'medium' ? 'active' : ''}`}
                          onClick={() => setGoalFilterPriority('medium')}
                        >
                          Medium
                        </button>
                        <button
                          className={`priority-btn priority-low ${goalFilterPriority === 'low' ? 'active' : ''}`}
                          onClick={() => setGoalFilterPriority('low')}
                        >
                          Low
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Main goals grid */}
                  {goals.length > 0 ? (
                    <div className="goals-grid">
                      {filteredGoals.map(goal => (
                        <div 
                          key={goal._id}
                          className={`goal-card ${goal.type === 'daily' ? 'daily-type' : 'normal-type'} ${isOverdue(goal) ? 'overdue' : ''}`}
                        >
                          <div className="goal-card-header">
                            <div className="goal-emoji">{goal.emoji || '🎯'}</div>
                            
                            {goal.type === 'daily' ? (
                              <div className={`goal-status-badge ${isCompletedToday(goal) ? 'completed' : 'in-progress'}`}>
                                {isCompletedToday(goal) ? 'Completed Today' : 'Not Completed Today'}
                              </div>
                            ) : (
                              <div className={`goal-status-badge ${goal.status}`}>
                                {goal.status === 'not-started' ? 'Not Started' : 
                                goal.status === 'in-progress' ? 'In Progress' : 'Completed'}
                              </div>
                            )}
                          </div>
                          
                          <h4 className="goal-title">{goal.title}</h4>
                          <p className="goal-description">{goal.description}</p>
                          
                          <div className="goal-details">
                            {goal.type === 'daily' && (
                              <div className="goal-detail">
                                <FaCalendarDay className="detail-icon" />
                                <span>Daily Habit • Streak: {goal.streak?.current || 0} days</span>
                              </div>
                            )}
                            
                            {goal.deadline && (
                              <div className="goal-detail">
                                <Clock className="detail-icon" />
                                <span className={isOverdue(goal) ? 'overdue-text' : ''}>
                                  {isOverdue(goal) ? 'Overdue: ' : 'Due: '}
                                  {formatDate(goal.deadline)}
                                </span>
                              </div>
                            )}
                            
                            <div className="goal-detail">
                              <FaFlag className="detail-icon" />
                              <span className={`priority priority-${goal.priority}`}>
                                {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} Priority
                              </span>
                            </div>
                          </div>
                          
                          {goal.target && goal.target > 1 && (
                            <div className="goal-progress-tracker">
                              <div className="progress-bar-container">
                                <div 
                                  className="progress-bar" 
                                  style={{ width: `${(goal.progress / goal.target) * 100}%` }}
                                ></div>
                              </div>
                              <span className="progress-text">
                                {goal.progress} of {goal.target} {goal.target > 1 ? 'units' : 'unit'}
                              </span>
                            </div>
                          )}
                          
                          <div className="goal-actions">
                            <button
                              className="goal-action-btn view-btn"
                              onClick={() => handleViewGoalDetails(goal)}
                              title="View Details"
                            >
                              <FaInfo />
                            </button>
                            
                            <button
                              className="goal-action-btn edit-btn"
                              onClick={() => handleEditGoal(goal)}
                              title="Edit Goal"
                            >
                              <FaPencilAlt />
                            </button>
                            
                            {goal.type === 'daily' ? (
                              // Show daily goal complete action if not already completed today
                              !isCompletedToday(goal) && (
                                <button
                                  className="goal-action-btn complete-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDailyGoalAction(goal._id, true);
                                  }}
                                  title="Complete for today"
                                >
                                  <FaCheck />
                                </button>
                              )
                            ) : (
                              // For regular goals, show complete button if not completed
                              goal.status !== 'completed' && (
                                <button
                                  className="goal-action-btn complete-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateGoalStatus(goal._id, 'completed');
                                  }}
                                  title="Mark as Completed"
                                >
                                  <FaCheck />
                                </button>
                              )
                            )}
                            
                            <button
                              className="goal-action-btn delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setGoalToDelete(goal._id);
                                setShowDeleteConfirm(true);
                              }}
                              title="Delete Goal"
                            >
                              <FaTrashAlt />
                            </button>
                        </div>
                        </div>
                      ))}
                      
                      <div className="goal-card add-goal" onClick={handleOpenGoalModal}>
                        <div className="add-goal-content">
                          <div className="add-icon">+</div>
                          <h4>Create New Goal</h4>
                          <p>Track your journaling progress</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p>You haven't created any goals yet. Goals help you track your Life.</p>
                      <Button 
                        variant="primary"
                        onClick={handleOpenGoalModal}
                        className="create-goal-btn"
                      >
                        Create Your First Goal
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "challenges" && (
                <div className="challenges-tab">
                  <div className="challenges-container">
                    {/* Header Section */}
                    <div className="challenges-header">
                      <div>
                        <h3>Daily Challenges</h3>
                        <div className="points-display">
                            <span className="points-icon">⚡</span>
                            <span className="points-value">{totalPoints}</span> points
                            {progressData.currentStreak > 0 && !revivedToday && (
                              <button
                                onClick={() => setShowReviveModal(true)}
                                className="revive-streak-btn"
                                title="Use points to prevent breaking your streak"
                              >
                                Protect Streak
                              </button>
                            )}
                          </div>
                        <p>
                          Complete challenges to earn badges and reflection points. Track your progress and unlock rewards.
                        </p>
                      </div>
                      <Button
                        onClick={handleRefreshChallenges}
                        disabled={refreshingChallenges}
                        className="refresh-challenges-btn"
                      >
                        {refreshingChallenges ? "Refreshing..." : "Get New Challenges"}
                      </Button>
                    </div>

                    {/* Error Messages */}
                    {(refreshError || challengeError) && (
                      <div className="error-message">
                        {refreshError || challengeError}
                      </div>
                    )}

                    {/* Challenges Grid */}
                    <div className="challenges-grid">
                      {challenges.map((challenge) => {
                        const progressPercent = Math.min(
                          100,
                          parseFloat(((challenge.userProgress.current / challenge.requirements.target) * 100).toFixed(2))
                        );

                        // Parse the reward object
                        const reward = challenge.reward;
                        let rewardText = "";
                        if (reward) {
                          if (reward.type === "badge") {
                            rewardText = `${reward.badgeName} ${reward.badgeIcon || ""}`;
                          } else if (reward.type === "points") {
                            rewardText = `${reward.points} points`;
                          } else if (reward.type === "both") {
                            rewardText = `${reward.points} points + ${reward.badgeName} ${reward.badgeIcon || ""}`;
                          }
                        }

                        return (
                          <div key={challenge.id} className="challenge-card">
                            <h4 className="challenge-title">{challenge.title || "Untitled Challenge"}</h4>
                            <div className="difficulty-indicator">
                              {challenge.difficulty === 'easy' && <span className="difficulty-icon easy">⭐</span>}
                              {challenge.difficulty === 'medium' && <span className="difficulty-icon medium">⭐⭐</span>}
                              {challenge.difficulty === 'hard' && <span className="difficulty-icon hard">⭐⭐⭐</span>}
                            </div>
                            <p className="challenge-description">{challenge.description}</p>
                            <div className="challenge-progress">
                              <div className="progress-bar-container">
                                <div
                                  className="progress-bar-done"
                                  style={{ width: `${progressPercent}%` }}
                                ></div>
                              </div>
                              <span>{progressPercent}% Complete</span>
                            </div>
                            <div className="challenge-reward">
                              <strong>Reward:</strong> {rewardText || "No reward specified"}
                              {progressPercent >= 100 && (
                                <Button
                                  onClick={() => completeChallenge(challenge.id)}
                                  className="complete-challenge-btn"
                                >
                                  Claim Reward
                                </Button>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      
      
      {/* Goal Creation/Editing Modal */}
      <Modal 
        show={showGoalModal} 
        onHide={handleCloseGoalModal}
        centered
        backdrop="static"
        className="goal-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {editingGoalId ? "Edit Goal" : "Create New Goal"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleGoalSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Goal Icon</Form.Label>
              <div className="emoji-selector">
                <div 
                  className="selected-emoji"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  {goalFormData.emoji}
                </div>
                <Button 
                  variant="outline-secondary"
                  className="random-emoji-btn"
                  onClick={handleRandomEmoji}
                  type="button"
                >
                  <FaRandom /> Random
                </Button>
                {showEmojiPicker && (
                  <div className="emoji-picker-container">
                    <EmojiPicker 
                      onEmojiClick={handleEmojiClick} 
                      width={300}
                      height={400}
                    />
                  </div>
                )}
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Goal Type</Form.Label>
              <div className="goal-type-selector">
                <div 
                  className={`goal-type-option ${goalFormData.type === 'normal' ? 'active' : ''}`}
                  onClick={() => handleGoalFormChange({target: {name: 'type', value: 'normal'}})}
                >
                  <FaBullseye className="type-icon" />
                  <div className="type-label">Regular Goal</div>
                  <div className="type-description">Track progress toward a specific target</div>
                </div>
                <div 
                  className={`goal-type-option ${goalFormData.type === 'daily' ? 'active' : ''}`}
                  onClick={() => handleGoalFormChange({target: {name: 'type', value: 'daily'}})}
                >
                  <FaCalendarDay className="type-icon" />
                  <div className="type-label">Daily Habit</div>
                  <div className="type-description">Track a recurring daily activity</div>
                </div>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control 
                type="text" 
                name="title"
                placeholder="Enter goal title"
                value={goalFormData.title}
                onChange={handleGoalFormChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control 
                type="text" 
                name="description"
                placeholder="Briefly describe your goal"
                value={goalFormData.description}
                onChange={handleGoalFormChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Priority</Form.Label>
              <Form.Select 
                name="priority"
                value={goalFormData.priority}
                onChange={handleGoalFormChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Form.Select>
            </Form.Group>

            {goalFormData.type === 'normal' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select 
                    name="status"
                    value={goalFormData.status}
                    onChange={handleGoalFormChange}
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Target (How many units to complete?)</Form.Label>
                  <Form.Control 
                    type="number" 
                    name="target"
                    placeholder="Set a numeric target"
                    value={goalFormData.target}
                    onChange={handleGoalFormChange}
                    min="1"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Current Progress</Form.Label>
                  <Form.Control 
                    type="number" 
                    name="progress"
                    placeholder="Current progress towards target"
                    value={goalFormData.progress}
                    onChange={handleGoalFormChange}
                    min="0"
                    max={goalFormData.target || 1}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Deadline (Optional)</Form.Label>
                  <div className="date-picker-container">
                    <DatePicker
                      selected={goalFormData.deadline}
                      onChange={handleDeadlineChange}
                      dateFormat="MMMM d, yyyy"
                      minDate={new Date()}
                      placeholderText="Select a deadline date"
                      className="form-control"
                    />
                    {goalFormData.deadline && (
                      <button 
                        type="button" 
                        className="clear-date-btn"
                        onClick={() => handleDeadlineChange(null)}
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                </Form.Group>
              </>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Additional Details (Optional)</Form.Label>
              <Form.Control 
                as="textarea" 
                name="details"
                rows={3}
                placeholder="Add any additional details about your goal"
                value={goalFormData.details}
                onChange={handleGoalFormChange}
              />
            </Form.Group>

            <div className="modal-actions">
              <Button 
                variant="secondary" 
                onClick={handleCloseGoalModal}
                disabled={goalUpdating}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={goalUpdating}
              >
                {goalUpdating ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span className="ms-2">Saving...</span>
                  </>
                ) : (
                  editingGoalId ? "Update Goal" : "Create Goal"
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Goal Details Modal */}
      {selectedGoal && (
        <Modal
          show={showGoalDetails}
          onHide={handleCloseGoalDetails}
          centered
          className="goal-details-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <span className="goal-emoji-header">{selectedGoal.emoji || '🎯'}</span>
              {selectedGoal.title}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className={`goal-status-badge large ${selectedGoal.status}`}>
              {selectedGoal.status === 'not-started' ? 'Not Started' : 
               selectedGoal.status === 'in-progress' ? 'In Progress' : 'Completed'}
            </div>
            
            {selectedGoal.description && (
              <div className="goal-detail-section">
                <h5>Description</h5>
                <p>{selectedGoal.description}</p>
              </div>
            )}
            
            <div className="goal-detail-section">
              <h5>Details</h5>
              <div className="goal-attributes">
                <div className="attribute">
                  <span className="attribute-label">Type:</span>
                  <span className="attribute-value">
                    {selectedGoal.type === 'daily' ? 'Daily Habit' : 'Regular Goal'}
                  </span>
                </div>
                
                <div className="attribute">
                  <span className="attribute-label">Priority:</span>
                  <span className={`attribute-value priority-${selectedGoal.priority}`}>
                    {selectedGoal.priority.charAt(0).toUpperCase() + selectedGoal.priority.slice(1)}
                  </span>
                </div>
                
                {selectedGoal.type === 'daily' && (
                  <>
                    <div className="attribute">
                      <span className="attribute-label">Current streak:</span>
                      <span className="attribute-value">
                        {selectedGoal.streak?.current || 0} days
                      </span>
                    </div>
                    <div className="attribute">
                      <span className="attribute-label">Best streak:</span>
                      <span className="attribute-value">
                        {selectedGoal.streak?.best || 0} days
                      </span>
                    </div>
                    <div className="attribute">
                      <span className="attribute-label">Today's status:</span>
                      <span className="attribute-value">
                        {selectedGoal.completionHistory?.some(entry => {
                          const entryDate = new Date(entry.date);
                          const today = new Date();
                          return entryDate.setHours(0,0,0,0) === today.setHours(0,0,0,0) && entry.completed;
                        }) ? "✅ Completed" : "❌ Not completed"}
                      </span>
                    </div>
                  </>
                )}
                
                {selectedGoal.deadline && (
                  <div className="attribute">
                    <span className="attribute-label">Deadline:</span>
                    <span className={`attribute-value ${isOverdue(selectedGoal) ? 'overdue-text' : ''}`}>
                      {formatDate(selectedGoal.deadline)}
                    </span>
                  </div>
                )}
                
                {selectedGoal.target && selectedGoal.target > 1 && (
                  <>
                    <div className="attribute">
                      <span className="attribute-label">Target:</span>
                      <span className="attribute-value">{selectedGoal.target} units</span>
                    </div>
                    
                    <div className="attribute">
                      <span className="attribute-label">Progress:</span>
                      <span className="attribute-value">
                        {selectedGoal.progress || 0} / {selectedGoal.target} 
                        ({Math.round((selectedGoal.progress / selectedGoal.target) * 100)}%)
                      </span>
                    </div>
                    
                    <div className="progress-bar-container details-progress">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${(selectedGoal.progress / selectedGoal.target) * 100}%` }}
                      ></div>
                    </div>
                  </>
                )}
                
                {selectedGoal.details && (
                  <div className="attribute full-width">
                    <span className="attribute-label">Additional notes:</span>
                    <span className="attribute-value details-text">{selectedGoal.details}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="goal-modal-actions">
              <Button 
                variant="outline-secondary" 
                onClick={handleCloseGoalDetails}
              >
                Close
              </Button>
              
              <Button 
                variant="outline-primary"
                onClick={() => handleEditGoal(selectedGoal)}
              >
                <FaPencilAlt className="btn-icon" /> Edit
              </Button>
              
              {selectedGoal.status !== 'completed' && selectedGoal.type !== 'daily' && (
                <Button 
                  variant="success"
                  onClick={() => {
                    handleUpdateGoalStatus(selectedGoal._id, 'completed');
                    // handleCloseGoalDetails();
                  }}
                >
                  <FaCheck className="btn-icon" /> Mark Complete
                </Button>
              )}
              
              <Button 
                variant="danger"
                onClick={() => {
                  setGoalToDelete(selectedGoal._id);
                  setShowDeleteConfirm(true);
                  setShowGoalDetails(false);
                }}
              >
                <FaTrashAlt className="btn-icon" /> Delete
              </Button>
            </div>
          </Modal.Body>
        </Modal>
      )}

      {/* Streak Revival Modal */}
      <Modal
        show={showReviveModal}
        onHide={() => setShowReviveModal(false)}
        centered
        className="revive-streak-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Protect Your Streak</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="revive-modal-content">
            <div className="revive-icon">🛡️</div>
            <p>
              About to break your {progressData.currentStreak}-day streak? Use your points to maintain it!
            </p>
            <div className="revive-cost">
              <span className="cost-label">Cost:</span>
              <span className="cost-value">{reviveCost} points</span>
              <span className="user-points">
                (You have: <strong>{totalPoints}</strong> points)
              </span>
            </div>
            {totalPoints < reviveCost && (
              <div className="insufficient-points">
                <FaExclamationTriangle className="warning-icon" />
                You don't have enough points! Complete more challenges to earn points.
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReviveModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleReviveStreak}
            disabled={totalPoints < reviveCost}
          >
            Use {reviveCost} Points to Protect Streak
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteConfirm} 
        onHide={() => setShowDeleteConfirm(false)} 
        centered
        className="delete-confirm-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Goal</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="delete-confirm-content">
            <FaExclamationTriangle className="warning-icon" />
            <p>Are you sure you want to delete this goal? This action cannot be undone.</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteGoal}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Progress;
