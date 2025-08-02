import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Dashboard.css';
import { ChevronRight, Home, BookOpen, BarChart2, Lightbulb, Users, Settings, Menu, X, LogOut, AlertCircle, RefreshCw, Check, Target, Clock } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../main';

// API base URL configuration - use environment variable or fallback to the render.com URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://journify-deploy.onrender.com';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todaySummary, setTodaySummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Goals state
  const [goals, setGoals] = useState([]);
  const [dailyGoals, setDailyGoals] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
// Add this right after your state declarations, before the fetchGoals function
// Define placeholder insights
const placeholderInsights = [
  {
    id: 'placeholder-1',
    title: 'Mood Patterns',
    content: 'Start journaling to discover patterns in your mood and emotional well-being.',
    iconType: 'mood'
  },
  {
    id: 'placeholder-2',
    title: 'Sleep Insights',
    content: 'Track your sleep habits through journaling to understand how they affect your daily life.',
    iconType: 'sleep'
  },
  {
    id: 'placeholder-3',
    title: 'Activity Impact',
    content: 'Record your activities to see how they influence your energy levels and productivity.',
    iconType: 'exercise'
  }
];
  // Function to fetch goals
  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/goals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const fetchedGoals = response.data || [];
      setGoals(fetchedGoals);

      // Filter daily goals
      const daily = fetchedGoals.filter(goal => goal.type === 'daily' && !goal.completedToday);
      setDailyGoals(daily);

      // Filter upcoming deadlines
      const deadlines = fetchedGoals.filter(
        goal =>
          goal.deadline &&
          new Date(goal.deadline) > new Date() &&
          new Date(goal.deadline) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );
      setUpcomingDeadlines(deadlines);
    } catch (err) {
      console.error('Error fetching goals:', err);
    }
  };

  // Fetch goals on component mount
  useEffect(() => {
    fetchGoals();
  }, []);

  // Function to mark a daily goal as completed
  const handleDailyGoalAction = async (goalId, completed) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/api/goals/${goalId}/complete`,
        { completed },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchGoals(); // Refresh goals after updating
    } catch (err) {
      console.error('Error updating daily goal:', err);
    }
  };

  // Function to get user ID
  const getUserId = () => {
    let userId;
    const userString = localStorage.getItem('user');

    if (userString) {
      try {
        const userObj = JSON.parse(userString);
        // Try different common user ID field names
        userId = userObj.id || userObj.userId || userObj._id || userObj.user_id;

        if (!userId && userObj.user) {
          // Sometimes user data is nested under a 'user' property
          userId = userObj.user.id || userObj.user._id || userObj.user.userId;
        }

        console.log('Found user data:', userObj);
        console.log('Extracted user ID:', userId);
      } catch (parseErr) {
        console.error('Error parsing user data:', parseErr);
      }
    }

    if (!userId) {
      // Try alternative localStorage keys that might contain user ID
      userId = localStorage.getItem('userId') || localStorage.getItem('user_id');
    }

    return userId;
  };

  // Memoize the fetchTodaySummary function so we can call it when needed
  const fetchTodaySummary = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setSummaryLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const userId = getUserId();

      if (!userId) {
        console.warn('User ID not found, cannot load today\'s summary');
        setSummaryLoading(false);
        setIsRefreshing(false);
        return;
      }

      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      // Get user's timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Use API_BASE_URL instead of hardcoded localhost
      const response = await axios.get(`${API_BASE_URL}/api/chat/summary/${userId}/today`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          timezone,
          // Add cache-busting timestamp to force fresh data
          _t: new Date().getTime()
        }
      });

      console.log('Today\'s summary response:', response.data);
      setTodaySummary(response.data);
      setSummaryError(null);

    } catch (err) {
      console.error('Error fetching today\'s summary:', err);
      setSummaryError(err.response?.data?.message || 'Failed to load today\'s summary');
    } finally {
      setSummaryLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate]);

  // Effect for fetching insights
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const userId = getUserId();

        if (!userId) {
          console.warn('User ID not found, using placeholder insights');
          setInsights(placeholderInsights);
          setLoading(false);
          return;
        }

        const token = localStorage.getItem('token');

        if (!token) {
          navigate('/login');
          return;
        }

        console.log(`Making API call with userId: ${userId}`);

        // Update URL to use API_BASE_URL
        const response = await axios.get(`${API_BASE_URL}/api/summaries/insights/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        console.log('API response:', response.data);

        let combinedInsights = [];

        // Check if we have insights in the response
        if (response.data &&
          ((response.data.insights && response.data.insights.length > 0) ||
            (Array.isArray(response.data) && response.data.length > 0))) {

          // Handle both possible response formats
          const insightsArray = response.data.insights || response.data;

          // Map API insights to our format - use index in key to avoid duplicate keys
          const apiInsights = insightsArray.slice(0, 3).map((insightItem, index) => {
            // Get the insight text from the correct property
            const insightText = typeof insightItem === 'string'
              ? insightItem
              : insightItem.insight || insightItem.content || '';

            return {
              id: insightItem.entryId ? `${insightItem.entryId}-${index}` : `api-insight-${index}`,
              title: `Insight ${index + 1}`,
              content: insightText,
              iconType: ['sleep', 'mood', 'exercise'][index % 3] // Cycle through icon types
            };
          });

          // If we have less than 3 insights from API, fill the rest with placeholders
          if (apiInsights.length < 3) {
            combinedInsights = [
              ...apiInsights,
              ...placeholderInsights.slice(0, 3 - apiInsights.length)
            ];
          } else {
            combinedInsights = apiInsights;
          }
        } else {
          combinedInsights = placeholderInsights;
        }

        setInsights(combinedInsights);
      } catch (err) {
        console.error('Error fetching insights:', err);
        setError('Failed to load insights');
        setInsights(placeholderInsights);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [navigate]);

  // Effect for checking new journal entry completion from location state
  useEffect(() => {
    // Check if coming back from creating a journal entry
    if (location.state && location.state.newJournalEntry) {
      console.log("New journal entry detected, refreshing summary");
      // Clear the state to prevent repeated refreshes
      navigate(location.pathname, { replace: true, state: {} });
      // Refresh without showing the full loading spinner
      fetchTodaySummary(false);
    }
  }, [location.state, navigate, fetchTodaySummary]);

  // Initial fetch for today's summary
  useEffect(() => {
    fetchTodaySummary(true);
  }, [fetchTodaySummary]);

  const handleLogout = () => {
    // Remove JWT token and user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Redirect to homepage
    navigate('/');
  };

  // Function to manually refresh the summary
  const handleRefreshSummary = () => {
    fetchTodaySummary(false);
  };

  // Render insight icon based on type
  const renderInsightIcon = (iconType) => {
    switch (iconType) {
      case 'sleep':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"></path>
            <path d="M16 8h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1z"></path>
          </svg>
        );
      case 'mood':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v6m0 12v2"></path>
            <path d="M4.93 4.93l4.24 4.24"></path>
            <path d="M19.07 4.93l-4.24 4.24"></path>
            <path d="M2 12h6"></path>
            <path d="M16 12h6"></path>
            <path d="M4.93 19.07l4.24-4.24"></path>
            <path d="M19.07 19.07l-4.24-4.24"></path>
          </svg>
        );
      case 'exercise':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 7v10"></path>
            <path d="M6 7v10"></path>
            <path d="M18 11h5v2h-5z"></path>
            <path d="M6 11H1v2h5z"></path>
            <path d="M12 16.5v-9"></path>
            <path d="M12 7.5V6"></path>
            <path d="M12 18v-1.5"></path>
            <path d="M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path>
            <path d="M12 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path>
          </svg>
        );
      default:
        return <Lightbulb size={24} />;
    }
  };

  // Function to format the insight content
  const formatInsightContent = (content) => {
    if (!content) return <p className="insight-text">No insight available</p>;

    // Format numbered points like "1) Point one. 2) Point two."
    if (content.match(/\d+\)/)) {
      const points = content.split(/\d+\)/).filter(point => point.trim().length > 0);
      return (
        <ul className="insight-points">
          {points.map((point, idx) => (
            <li key={idx}>{point.trim()}</li>
          ))}
        </ul>
      );
    }
    // Format bullet points if present
    else if (content.includes('•')) {
      const points = content.split('•').filter(point => point.trim().length > 0);
      return (
        <ul className="insight-points">
          {points.map((point, idx) => (
            <li key={idx}>{point.trim()}</li>
          ))}
        </ul>
      );
    }
    // Format multiline text (with line breaks)
    else if (content.includes('\n')) {
      return (
        <div className="insight-text">
          {content.split('\n').map((line, idx) => (
            <p key={idx}>{line.trim()}</p>
          ))}
        </div>
      );
    }
    // Default formatting
    else {
      return <p className="insight-text">{content}</p>;
    }
  };

  // Format today's date for display
  const formatDate = () => {
    const date = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Format date to readable string
  const formatDeadlineDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Render summary content with proper formatting
  const renderSummaryContent = (summary) => {
    if (!summary) return null;

    return (
      <div className="summary-details">
        <p className="summary-overview">{summary.overview}</p>

        {summary.mood && summary.mood.length > 0 && (
          <div className="summary-section">
            <h4>Mood</h4>
            <div className="mood-tags">
              {summary.mood.map((mood, idx) => (
                <span key={idx} className="mood-tag">{mood}</span>
              ))}
            </div>
          </div>
        )}

        {summary.highlights && summary.highlights.length > 0 && (
          <div className="summary-section">
            <h4>Highlights</h4>
            <ul className="summary-list">
              {summary.highlights.map((highlight, idx) => (
                <li key={idx}>{highlight}</li>
              ))}
            </ul>
          </div>
        )}

        {summary.concerns && summary.concerns.length > 0 && (
          <div className="summary-section">
            <h4>Concerns</h4>
            <ul className="summary-list">
              {summary.concerns.map((concern, idx) => (
                <li key={idx}>{concern}</li>
              ))}
            </ul>
          </div>
        )}

        {summary.reflection && (
          <div className="summary-section">
            <h4>Reflection</h4>
            <p className="summary-reflection">{summary.reflection}</p>
          </div>
        )}
      </div>
    );
  };

  const moodData = [
    { day: 'Mon', points: [100, 180, 220, 190, 160] },
    { day: 'Tue', points: [160, 250, 170, 210, 150] },
    { day: 'Wed', points: [150, 180, 280, 220, 190] },
    { day: 'Thu', points: [190, 220, 180, 250, 220] },
    { day: 'Fri', points: [220, 320, 280, 350, 300] },
    { day: 'Sat', points: [300, 250, 220, 280, 330] },
    { day: 'Sun', points: [330, 280, 350, 320, 380] },
  ];

  const getPathFromPoints = () => {
    const svgHeight = 100;
    const svgWidth = 350;

    let path = '';

    moodData.forEach((dayData, dayIndex) => {
      const dayWidth = svgWidth / 7;
      const dayX = dayIndex * dayWidth + dayWidth / 2;

      dayData.points.forEach((point, pointIndex) => {
        const normalizedPoint = svgHeight - (point / 380) * svgHeight;
        const pointX = dayX - dayWidth / 4 + pointIndex * (dayWidth / 10);

        if (dayIndex === 0 && pointIndex === 0) {
          path += `M ${pointX} ${normalizedPoint}`;
        } else {
          path += ` L ${pointX} ${normalizedPoint}`;
        }
      });
    });

    return path;
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const navItems = [
    { icon: <Home size={18} />, label: 'Dashboard' },
    { icon: <BookOpen size={18} />, label: 'Journal', path: '/journal' },
    { icon: <Lightbulb size={18} />, label: 'Summaries', path: '/summary' },
    { icon: <BarChart2 size={18} />, label: 'Mood Tracker' },
    { icon: <Lightbulb size={18} />, label: 'Progress' },
    { icon: <Settings size={18} />, label: 'Settings' },
    { icon: <LogOut size={18} />, label: 'Logout', isLogout: true }
  ];

  return (
    <div className={`dashboard-page ${theme}`}>
      <div className="dashboard-container">
        {/* Mobile Menu Button */}
        <button className="mobile-menu-button" onClick={toggleMobileSidebar}>
          {isMobileSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Sidebar */}
        <div className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
          <div className="logo">
            <span className="logo-icon">⚡</span> Journify
          </div>

          <nav className="nav-menu">
            {navItems.map((item) => {
              if (item.isLogout) {
                return (
                  <button
                    key={item.label}
                    className="nav-item logout-button"
                    onClick={handleLogout}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                );
              }

              let path = item.path || "/dashboard";

              if (!item.path) {
                if (item.label === "Journal") path = "/journal";
                else if (item.label === "Settings") path = "/settings";
                else if (item.label === "Mood Tracker") path = "/mood";
                else if (item.label === "Summaries") path = "/summary";
                else if (item.label === "Progress") path = "/progress";
                else path = "/dashboard";
              }

              return (
                <Link
                  to={path}
                  key={item.label}
                  className={`nav-item ${activeNav === item.label ? "active" : ""}`}
                  onClick={() => {
                    setActiveNav(item.label);
                    if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
                  }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {activeNav === item.label && <span className="active-indicator" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="header">
            <h1>Welcome back, {JSON.parse(localStorage.getItem('user'))?.name || 'User'}</h1>
          </div>

          <div className="content">
            <section className="start-journaling-section">
              <div className="start-journaling-card">
                <div className="start-journaling-content">
                  <div className="journaling-header">
                    <h2>Start Journaling</h2>
                    <div className="journaling-badge">
                      <span>Recommended</span>
                    </div>
                  </div>
                  <p>Capture your thoughts, reflect on your day, or express your feelings. Just a few minutes of journaling can improve your mental well-being and help you track personal growth.</p>
                  <div className="journaling-options">
                    <Link to="/journal" className="primary-journal-btn">
                      <span>Write a new entry</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14"></path>
                        <path d="M12 5l7 7-7 7"></path>
                      </svg>
                    </Link>
                  </div>
                </div>
                <div className="start-journaling-image">
                  <div className="image-container">
                    <svg viewBox="0 0 24 24" width="100" height="100" stroke="currentColor" fill="none" strokeWidth="1.5">
                      <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                      <path d="M17 21h-10a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h7l5 5v11a2 2 0 0 1-2 2z"></path>
                      <line x1="9" y1="9" x2="10" y2="9"></line>
                      <line x1="9" y1="13" x2="15" y2="13"></line>
                      <line x1="9" y1="17" x2="15" y2="17"></line>
                    </svg>
                    <div className="decorative-circle"></div>
                  </div>
                </div>
              </div>
            </section>

           
<section className="insights-section">
  <h2>Actionable Insights</h2>
  <span className="section-subtitle">Based on your journal entries</span>

  {loading ? (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading your personalized insights...</p>
    </div>
  ) : error ? (
    <div className="error-container">
      <div className="error-icon">!</div>
      <div className="error-message">
        <h4>Unable to load insights</h4>
        <p>{error}</p>
      </div>
    </div>
  ) : insights.length === 0 || insights.every(insight => insight.id.startsWith('placeholder')) ? (
    <div className="no-insights-container">
      <div className="no-insights-icon">
        <Lightbulb size={40} />
      </div>
      <h3>No insights available yet</h3>
      <p>Start journaling regularly to get personalized AI-powered insights based on your entries.</p>
      <Link to="/journal" className="start-journaling-link">
        <span>Start Journaling</span>
        <ChevronRight size={16} />
      </Link>
    </div>
  ) : (
    <div className="insights-grid">
      {insights.map((insight) => (
        <div className="insight-card" key={insight.id}>
          <div className={`insight-icon ${insight.iconType}`}>
            {renderInsightIcon(insight.iconType)}
          </div>
          <div className="insight-content">
            <h3>{insight.title}</h3>
            {formatInsightContent(insight.content)}
            <div className="insight-meta">
              <span className="insight-tag">{insight.id.startsWith('api-insight') || insight.id.startsWith('placeholder') ? 'AI generated' : 'From your journal'}</span>
            </div>
          </div>
          <button className="insight-action-btn" aria-label="View insight details">
            <ChevronRight className="insight-arrow" size={18} />
          </button>
        </div>
      ))}
    </div>
  )}
</section>

            {/* Get Back to Work Section */}
            <section className="get-back-to-work-section">
              <div className="get-back-to-work-header">
                <h2 className="get-back-to-work-title">
                  <AlertCircle size={24} /> Come on mate! You have work to do!
                </h2>
                <p className="get-back-to-work-subtitle">
                  You've got habits to complete and deadlines to meet
                </p>
              </div>
              
              <div className="work-sections-container">
                {/* Today's Challenges Section */}
                <div className="section-inner">
                  <h3>
                    <Target size={20} /> Daily Habits
                  </h3>
                  <div className="daily-goals-list">
                    {dailyGoals.length > 0 ? (
                      dailyGoals.map((goal) => (
                        <div 
                          key={goal._id} 
                          className="daily-goal-card"
                          onClick={() => handleDailyGoalAction(goal._id, true)}
                        >
                          <div className="daily-goal-emoji">{goal.emoji || '🎯'}</div>
                          <div className="daily-goal-content">
                            <h4 className="daily-goal-title">{goal.title}</h4>
                            <div className="daily-goal-streak">
                              Streak: <span>{goal.streak?.current || 0}</span> days
                              {goal.streak?.best > 0 && <> (Best: {goal.streak?.best})</>}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>No challenges for today. Set some goals to get started!</p>
                    )}
                  </div>
                </div>

                {/* Upcoming Deadlines section */}
                <div className="section-inner">
                  <h3>
                    <Clock size={20} /> Upcoming Deadlines
                  </h3>
                  <div className="deadlines-list">
                    {upcomingDeadlines.length > 0 ? (
                      upcomingDeadlines.map((deadline) => (
                        <div key={deadline._id} className="deadline-item">
                          <div className={`deadline-emoji priority-${deadline.priority?.toLowerCase() || 'medium'}`}>
                            {deadline.emoji || '📌'}
                          </div>
                          <div className="deadline-content">
                            <h4 className="deadline-title">{deadline.title}</h4>
                            <div className="deadline-date">
                              Due: {formatDeadlineDate(deadline.deadline)}
                            </div>
                          </div>
                          {deadline.priority && (
                            <div className={`deadline-priority priority-${deadline.priority.toLowerCase()}`}>
                              {deadline.priority}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p>No upcoming deadlines in the next week.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Today's Summary Section with refresh button */}
            <section className="summary-section">
              <div className="section-header-with-actions">
                <div>
                  <h2>Today's Summary</h2>
                  <span className="section-subtitle">{formatDate()}</span>
                </div>

                {!summaryLoading && !summaryError && todaySummary && todaySummary.summary !== null && (
                  <button
                    className={`refresh-button ${isRefreshing ? 'refreshing' : ''}`}
                    onClick={handleRefreshSummary}
                    disabled={isRefreshing}
                    aria-label="Refresh summary"
                  >
                    <RefreshCw size={18} />
                  </button>
                )}
              </div>
              
              {summaryLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Generating your daily summary...</p>
                </div>
              ) : summaryError ? (
                // Replace this error container with an encouraging message
                <div className="no-entries-container">
                  <AlertCircle size={40} />
                  <h3>No Journal Entries Today</h3>
                  <p>Take a moment to reflect on your day. Journaling can help improve your mood and mental clarity.</p>
                  <Link to="/journal" className="new-entry-link">
                    Start Writing
                  </Link>
                </div>
              ) : !todaySummary || todaySummary.summary === null ? (
                <div className="no-entries-container">
                  <AlertCircle size={40} />
                  <h3>No journal entries today</h3>
                  <p>Write in your journal today to see a summary here</p>
                  <Link to="/journal" className="new-entry-link">
                    Write your first entry
                  </Link>
                </div>
              )
                : (
                  <div className={`summary-card today-summary ${isRefreshing ? 'refreshing' : ''}`}>
                    {isRefreshing && (
                      <div className="summary-refreshing-overlay">
                        <div className="refreshing-spinner"></div>
                      </div>
                    )}
                    <div className="summary-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                        <path d="M17 21h-10a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h7l5 5v11a2 2 0 0 1-2 2z"></path>
                        <path d="M9 9h1"></path>
                        <path d="M9 13h6"></path>
                        <path d="M9 17h6"></path>
                      </svg>
                    </div>
                    <div className="summary-content">
                      <h3>Summary of your day</h3>
                      <span className="entries-count">{todaySummary.entryCount} journal {todaySummary.entryCount === 1 ? 'entry' : 'entries'} today</span>

                      {renderSummaryContent(todaySummary.summary)}
                    </div>
                    <ChevronRight className="summary-arrow" />
                  </div>
                )}
            </section>

            <section className="mood-tracker-section">
              <h2>Weekly Mood Tracker</h2>

              <div className="mood-tracker-preview">
                <div className="mood-tracker-info">
                  <p>Track your mood patterns over time and discover emotional insights.</p>
                  <Link to="/mood" className="mood-tracker-btn">
                    View Mood Tracker
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </section>

            <section className="quick-add-section">
              <Link to="/journal" className="new-entry-btn">New Entry</Link>
            </section>
          </div>
        </div>

        {/* Overlay for mobile sidebar */}
        {isMobileSidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;