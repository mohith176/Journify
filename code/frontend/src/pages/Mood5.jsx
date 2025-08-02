import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { Home, BookOpen, BarChart2, Lightbulb, Settings, LogOut } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ReactApexChart from 'react-apexcharts';
import {
  Container, Navbar, Nav, Button
} from 'react-bootstrap';
import axios from 'axios';
import {
  Book, PieChart, FileText
} from 'react-feather';
import D3WordCloud from '../components/D3WordCloud';
import { useTheme } from '../main';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://journify-deploy.onrender.com';

const Mood = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [activeNav, setActiveNav] = useState('Mood Tracker');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [userId, setUserId] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const navItems = [
    { icon: <Home size={18} />, label: 'Dashboard' },
    { icon: <BookOpen size={18} />, label: 'Journal' },
    { icon: <BarChart2 size={18} />, label: 'Mood Tracker' },
    { icon: <Lightbulb size={18} />, label: 'Insights' },
    { icon: <Settings size={18} />, label: 'Settings' },
    { icon: <LogOut size={18} />, label: 'Logout', isLogout: true }
  ];

  // Get user data from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser && parsedUser._id) {
          setUserId(parsedUser._id);
        } else {
          console.error('User data does not contain a valid ID');
          navigate('/login');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Helper function for fetching sentiment data
  // Update this helper function to respect the date range
  const fetchSentimentChartData = async (userId, startDate, endDate) => {
    try {
      // Fetch sentiment data from the backend
      const response = await fetch(`${API_BASE_URL}/api/analyze/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
        }),
      });
      if (!response.ok) {
        console.log(response);
        throw new Error('Failed to fetch sentiment data');
      }

      const sentimentData = await response.json();

      // Process the data to group by date
      const groupedByDate = {};

      sentimentData.forEach(entry => {
        // Extract date (ignore time)
        const date = new Date(entry.createdAt);
        const dateKey = date.toISOString().split('T')[0];

        // Get day name (Mon, Tue, etc.)
        const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);

        // Initialize the date group if it doesn't exist
        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = {
            day: dayName,
            date: dateKey,
            Positive: [],
            Negative: [],
            Neutral: [],
            Overall: [],
            entries: 0
          };
        }

        // Add scores to their respective arrays
        if (entry.nltkScores) {
          groupedByDate[dateKey].Positive.push(entry.nltkScores.positive);
          groupedByDate[dateKey].Negative.push(entry.nltkScores.negative);
          groupedByDate[dateKey].Neutral.push(entry.nltkScores.neutral);
          groupedByDate[dateKey].Overall.push(entry.nltkScores.compound);
          groupedByDate[dateKey].entries += 1;
        }
      });

      // Calculate averages and format for the chart
      const chartData = Object.values(groupedByDate).map(dateGroup => {
        // Calculate averages for each sentiment type
        const calculateAverage = arr => {
          return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
        };

        return {
          day: dateGroup.day,
          date: dateGroup.date, // Keep the full date for tooltips or additional functionality
          Positive: parseFloat(calculateAverage(dateGroup.Positive).toFixed(2)),
          Negative: parseFloat(calculateAverage(dateGroup.Negative).toFixed(2)),
          Neutral: parseFloat(calculateAverage(dateGroup.Neutral).toFixed(2)),
          Overall: parseFloat(calculateAverage(dateGroup.Overall).toFixed(2)),
          entries: dateGroup.entries
        };
      });

      // Sort the chart data by date
      chartData.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate the date range in days
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dayDiff = Math.round((end - start) / (1000 * 60 * 60 * 24));

      // Generate empty entries for missing dates in the range
      const emptyEntries = [];
      for (let i = 0; i <= dayDiff; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];

        // Use more compact format for day names when showing more days
        let dayName;
        if (dayDiff > 14) {
          // For month view, just show date number
          dayName = new Date(dateKey).getDate().toString();
        } else {
          // For week and 2-week views, show abbreviated day name
          dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
        }

        // Check if this date exists in our data
        if (!chartData.some(item => item.date === dateKey)) {
          emptyEntries.push({
            day: dayName,
            date: dateKey,
            Positive: 0,
            Negative: 0,
            Neutral: 0,
            Overall: 0,
            entries: 0
          });
        } else {
          // Update the day label for existing entries to maintain consistency
          const existingEntry = chartData.find(item => item.date === dateKey);
          if (existingEntry) {
            existingEntry.day = dayName;
          }
        }
      }

      // Combine existing data with empty entries
      const combinedData = [...chartData, ...emptyEntries];

      // Sort to ensure proper order
      combinedData.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Return all the data for the requested range, not just the last 7 days
      return combinedData;
    } catch (error) {
      console.error('Error processing sentiment data:', error);
      return [];
    }
  };

  // Fetch sentiment data when userId is available
  useEffect(() => {
    const fetchSentimentData = async () => {
      if (!userId) return;

      setIsLoading(true);
      try {
        // Get data for the last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 6); // 7 days including today

        const data = await fetchSentimentChartData(
          userId,
          startDate.toISOString(),
          endDate.toISOString()
        );

        setChartData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSentimentData();
  }, [userId]);

  // MoodPieChart Component
  const MoodPieChart = ({ userId }) => {
    const [moodData, setMoodData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasData, setHasData] = useState(false);
    // Word Cloud variables
    const [timeRange, setTimeRange] = useState('month');
    const [wordCloudData, setWordCloudData] = useState([]);
    const [totalEntries, setTotalEntries] = useState(0);
    const wordCloudColors = ['#1e88e5', '#d81b60', '#00897b', '#ff8f00', '#020617'];
    // Add these new state variables inside the MoodPieChart component
    const [selectedTimeFrame, setSelectedTimeFrame] = useState('week'); // 'week', '2week', 'month', 'year'
    const [timeframeChartData, setTimeframeChartData] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Add this useEffect to fetch data based on selected timeframe
    useEffect(() => {
      const fetchTimeframeData = async () => {
        if (!userId) return;

        setIsLoading(true);
        try {
          let startDate = new Date();
          const endDate = new Date();

          // Set start date based on selected timeframe
          switch (selectedTimeFrame) {
            case 'week':
              startDate.setDate(startDate.getDate() - 6); // Last 7 days
              break;
            case '2week':
              startDate.setDate(startDate.getDate() - 13); // Last 14 days
              break;
            case 'month':
              startDate.setDate(startDate.getDate() - 29); // Last 30 days
              break;
            case 'year':
              startDate.setDate(startDate.getDate() - 364); // Last 365 days
              break;
            default:
              startDate.setDate(startDate.getDate() - 6); // Default to 7 days
          }

          const data = await fetchSentimentChartData(
            userId,
            startDate.toISOString(),
            endDate.toISOString()
          );

          setTimeframeChartData(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };

      fetchTimeframeData();
    }, [userId, selectedTimeFrame]);

    // Helper function to determine min and max for Y axis
    const calculateYAxisDomain = (data) => {
      if (!data || data.length === 0) return [0, 1];

      // Get all overall values
      const values = data.map(item => item.Overall);
      const min = Math.max(0, Math.min(...values) - 0.1); // Pad by 0.1 but not below 0
      const max = Math.min(1, Math.max(...values) + 0.1); // Pad by 0.1 but not above 1

      return [min, max];
    };

    // Function to handle timeframe change
    const handleTimeframeChange = (timeframe) => {
      setSelectedTimeFrame(timeframe);
    };
    // Function to toggle section expansion
    const toggleSectionExpansion = (sectionId) => {
      if (expandedSection === sectionId) {
        setExpandedSection(null); // Collapse if already expanded
      } else {
        setExpandedSection(sectionId); // Expand the clicked section
      }
    };

    // Fetch word cloud data
    useEffect(() => {
      const fetchWordCloudData = async () => {
        if (!userId) return;

        setIsLoading(true);
        try {
          const response = await axios.get(
            `${API_BASE_URL}/api/insights/wordcloud/${userId}?timeRange=${timeRange}&limit=100`
          );

          if (response.data && response.data.wordCloud) {
            setWordCloudData(response.data.wordCloud);
            setTotalEntries(response.data.totalEntries || 0);
          } else {
            setWordCloudData([]);
          }
        } catch (err) {
          console.error('Error fetching word cloud data:', err);
          setError(err.response?.data?.message || 'Failed to load word cloud data');
        } finally {
          setIsLoading(false);
        }
      };

      fetchWordCloudData();
    }, [userId, timeRange]);

    const handleTimeRangeChange = (newRange) => {
      setTimeRange(newRange);
    };

    // Fetch mood distribution data
    useEffect(() => {
      const fetchMoodDistribution = async () => {
        if (!userId) {
          console.error("User ID is null. Cannot fetch mood distribution.");
          return;
        }

        setIsLoading(true);
        try {
          const response = await axios.get(`${API_BASE_URL}/api/mood/track/${userId}`);

          if (response.data && response.data.success && response.data.data) {
            const moodOrder = ["Horrible", "Sad", "Neutral", "Good", "Great"];
            const moodArray = moodOrder.map(mood => response.data.data[mood] || 0);

            // Check if there's any actual data (values > 0)
            const hasAnyData = moodArray.some(value => value > 0);

            if (hasAnyData) {
              setMoodData(moodArray);
              setHasData(true);
            } else {
              setHasData(false);
            }
          } else {
            setHasData(false);
          }
        } catch (error) {
          console.error("Error fetching mood distribution:", error);
          setError("Failed to load mood data. Please try again later.");
          setHasData(false);
        } finally {
          setIsLoading(false);
        }
      };

      if (userId) {
        fetchMoodDistribution();
      }
    }, [userId]);

    // Update the pieChartConfig object in the MoodPieChart component
    // Update the options in pieChartConfig
    // Update the pieChartConfig options object to improve title position
    const pieChartConfig = {
      series: moodData,
      options: {
        chart: {
          type: "donut",
          width: 500,
          height: 500,
          toolbar: {
            show: false,
          },
        },
        title: {
          text: `${monthNames[selectedMonth]} ${selectedYear} Mood Distribution`,
          align: 'center',
          style: {
            fontSize: '16px',
            fontFamily: 'Inter, sans-serif',
            color: '#333'
          },
          margin: 15,  // Add margin to push title down
          floating: false, // Change from true to false
          offsetY: 0     // Reset offsetY
        },
        labels: ["Horrible", "Sad", "Neutral", "Good", "Great"],
        dataLabels: {
          enabled: false,
        },
        colors: ["#020617", "#ff8f00", "#00897b", "#1e88e5", "#d81b60"],
        legend: {
          show: false,
        },
        plotOptions: {
          donut: {
            size: '70%',
            background: 'transparent',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                color: '#333',
              },
              value: {
                show: true,
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
                color: '#777',
                formatter: function (val) {
                  return val;
                }
              },
              total: {
                show: true,
                label: 'Total',
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                color: '#333',
                formatter: function (w) {
                  return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                }
              }
            }
          }
        },
        stroke: {
          width: 0
        },
        responsive: [{
          breakpoint: 480,
          options: {
            chart: {
              width: 300
            },
            legend: {
              position: 'bottom'
            }
          }
        }],
        tooltip: {
          enabled: true,
          y: {
            formatter: function (val, opts) {
              // Get the actual count instead of the percentage
              const seriesIndex = opts.seriesIndex;
              const actualCount = moodData[seriesIndex]; // Changed from pieChartConfig.series to moodData
              return actualCount + (actualCount === 1 ? " entry" : " entries");
            }
          }
        }
      },
    };

    // Update the fetchMoodDistributionByMonth function
    const fetchMoodDistributionByMonth = async (month, year) => {
      if (!userId) {
        console.error("User ID is null. Cannot fetch mood distribution.");
        return;
      }

      setIsLoading(true);
      try {
        // Create date range for the selected month
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0); // Last day of the month

        // Format dates as ISO strings
        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();

        console.log(`Fetching mood data for: ${monthNames[month]} ${year}`);
        console.log(`Date range: ${startISO} to ${endISO}`);

        // Add timestamps to URL to prevent caching
        const response = await axios.get(
          `${API_BASE_URL}/api/mood/track/${userId}?startDate=${startISO}&endDate=${endISO}&_t=${new Date().getTime()}`
        );

        console.log("Mood API response:", response.data);

        if (response.data && response.data.success && response.data.data) {
          const moodOrder = ["Horrible", "Sad", "Neutral", "Good", "Great"];
          const moodArray = moodOrder.map(mood => response.data.data[mood] || 0);

          // Check if there's any actual data (values > 0)
          const hasAnyData = moodArray.some(value => value > 0);

          console.log(`Month data for ${monthNames[month]} ${year}:`, moodArray);

          if (hasAnyData) {
            setMoodData(moodArray);
            setHasData(true);
          } else {
            setMoodData([0, 0, 0, 0, 0]);
            setHasData(false);
          }
        } else {
          setMoodData([0, 0, 0, 0, 0]);
          setHasData(false);
        }
      } catch (error) {
        console.error("Error fetching mood distribution:", error);
        setError("Failed to load mood data. Please try again later.");
        setMoodData([0, 0, 0, 0, 0]);
        setHasData(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Update the useEffect for mood distribution to use the month selection
    useEffect(() => {
      if (userId) {
        fetchMoodDistributionByMonth(selectedMonth, selectedYear);
      }
    }, [userId, selectedMonth, selectedYear]);

    // Add functions to navigate between months
    const goToPreviousMonth = (e) => {
      e.stopPropagation(); // Prevent expansion toggle
      let newMonth = selectedMonth - 1;
      let newYear = selectedYear;

      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }

      setSelectedMonth(newMonth);
      setSelectedYear(newYear);
    };

    const goToNextMonth = (e) => {
      e.stopPropagation(); // Prevent expansion toggle
      let newMonth = selectedMonth + 1;
      let newYear = selectedYear;

      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }

      setSelectedMonth(newMonth);
      setSelectedYear(newYear);
    };

    const goToCurrentMonth = (e) => {
      e.stopPropagation(); // Prevent expansion toggle
      const currentDate = new Date();
      setSelectedMonth(currentDate.getMonth());
      setSelectedYear(currentDate.getFullYear());
    };
    const legendItems = [
      { label: "Horrible", color: "#020617" },
      { label: "Sad", color: "#ff8f00" },
      { label: "Neutral", color: "#00897b" },
      { label: "Good", color: "#1e88e5" },
      { label: "Great", color: "#d81b60" },
    ];

    // Define section IDs for expandable sections
    const SECTION_IDS = {
      SENTIMENT_TRENDS: 'sentiment-trends',
      MOOD_DISTRIBUTION: 'mood-distribution',
      WORD_CLOUD: 'word-cloud'
    };
    // Add this helper function in the MoodPieChart component
    const formatXAxisTick = (value, selectedTimeFrame) => {
      if (selectedTimeFrame === 'month') {
        // For month view, only show every 3rd or 5th day to avoid crowding
        const days = timeframeChartData.map(d => d.day);
        const index = days.indexOf(value);
        if (index % 1 === 0) {
          // Also show the month for clarity
          const entry = timeframeChartData.find(d => d.day === value);
          if (entry) {
            const date = new Date(entry.date);
            return `${date.getDate()}/${date.getMonth() + 1}`;
          }
        }
        return '';
      }
      // For week and 2-week, show all day abbreviations
      return value;
    };
    // Check if a section is expanded
    const isSectionExpanded = (sectionId) => expandedSection === sectionId;

    // Update the getSectionClasses helper function to support the new layout
const getSectionClasses = (sectionId) => {
  const baseClasses = "transition-all duration-300 ease-in-out rounded-xl overflow-hidden";

  if (expandedSection === null) {
    // New layout: Sentiment trends is full width, others are half width
    if (sectionId === SECTION_IDS.SENTIMENT_TRENDS) {
      return `${baseClasses} w-full cursor-pointer mb-4`;
    } else {
      return `${baseClasses} w-full lg:w-[calc(50%-1rem)] cursor-pointer`;
    }
  } else if (expandedSection === sectionId) {
    // This section is expanded
    return `${baseClasses} w-full cursor-pointer`;
  } else {
    // Other sections are hidden when one is expanded
    return `${baseClasses} w-full lg:hidden`;
  }
};

    // Helper function to calculate trend
    const calculateTrend = (values) => {
      if (values.length < 3) return "Not enough data";

      // Compare first half with second half
      const halfPoint = Math.floor(values.length / 2);
      const firstHalfAvg = values.slice(0, halfPoint).reduce((sum, val) => sum + val, 0) / halfPoint;
      const secondHalfAvg = values.slice(halfPoint).reduce((sum, val) => sum + val, 0) / (values.length - halfPoint);

      const difference = ((secondHalfAvg - firstHalfAvg) * 100).toFixed(1);

      if (difference > 5) {
        return (
          <span className="flex items-center text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
            {difference}% Improving
          </span>
        );
      } else if (difference < -5) {
        return (
          <span className="flex items-center text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
            </svg>
            {Math.abs(difference)}% Declining
          </span>
        );
      } else {
        return (
          <span className="flex items-center text-yellow-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Stable
          </span>
        );
      }
    };

    // Helper function to generate mood insights
    const generateMoodInsight = (data) => {
      // Find the days with highest and lowest mood
      const sortedByMood = [...data].sort((a, b) => b.Overall - a.Overall);
      const highestMoodDay = sortedByMood[0];
      const lowestMoodDay = sortedByMood[sortedByMood.length - 1];

      // Count the number of entries
      const totalEntries = data.reduce((sum, day) => sum + day.entries, 0);

      // Calculate average mood score
      const avgMood = data.reduce((sum, day) => sum + day.Overall, 0) / data.length;

      // Check if user is consistent in journaling
      const daysWithEntries = data.filter(day => day.entries > 0).length;
      const journalingConsistency = daysWithEntries / data.length;

      // Generate personalized insights
      let insights = [];

      if (journalingConsistency < 0.5) {
        insights.push("You've been journaling sporadically. Consider setting a daily reminder to build consistency.");
      } else if (journalingConsistency === 1) {
        insights.push("Great job maintaining daily journal entries! Consistency helps build a complete picture of your emotional patterns.");
      }

      if (highestMoodDay && lowestMoodDay) {
        insights.push(`Your mood tends to be highest on ${highestMoodDay.day} and lowest on ${lowestMoodDay.day}.`);
      }

      if (avgMood > 0.7) {
        insights.push("Your overall mood has been quite positive this week. Keep up whatever you're doing!");
      } else if (avgMood < 0.3) {
        insights.push("Your mood appears lower than usual. Consider activities that have boosted your mood in the past.");
      }

      if (totalEntries > 10) {
        insights.push(`With ${totalEntries} entries this week, you're building a rich emotional record. This provides great insights for reflection.`);
      }


      return insights.join(" ");
    };
    return (
      <>
        {/* Navigation Bar */}
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

        <div className={`mood-page ${theme}`}>
          <h1>Mood Tracker</h1>
          {/* Content */}
        </div>

        <div className="dashboard-container">
          {/* Main Content */}
          <div className="main-content">
            <div className="header">
              <h1>Analysis</h1>
              {expandedSection && (
                <button
                  onClick={() => setExpandedSection(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded-md text-sm flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                  View All Sections
                </button>
              )}
            </div>

            {/* Flex container for graphs with wrap */}
            <div className="flex flex-col mt-4">
              {/* Sentiment Trends (Line Chart) - Always full width at top */}
              <div
                className={getSectionClasses(SECTION_IDS.SENTIMENT_TRENDS)}
                onClick={() => toggleSectionExpansion(SECTION_IDS.SENTIMENT_TRENDS)}
              >
                <div className="bg-white p-6 rounded-xl shadow-lg h-full">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-indigo-500 pb-1">
                      Mood Timeline
                      {selectedTimeFrame === 'week' && " (Last 7 Days)"}
                      {selectedTimeFrame === '2week' && " (Last 14 Days)"}
                      {selectedTimeFrame === 'month' && " (Last 30 Days)"}
                      {isSectionExpanded(SECTION_IDS.SENTIMENT_TRENDS) && (
                        <span className="ml-2 text-sm text-blue-500">
                          (Click to collapse)
                        </span>
                      )}
                    </h2>

                    {/* Time range selector */}
                    {(expandedSection === null || isSectionExpanded(SECTION_IDS.SENTIMENT_TRENDS)) && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent expansion toggle
                            handleTimeframeChange('week');
                          }}
                          className={`px-3 py-1 text-sm rounded-md ${selectedTimeFrame === 'week'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700'}`}
                        >
                          Last 7 Days
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent expansion toggle
                            handleTimeframeChange('2week');
                          }}
                          className={`px-3 py-1 text-sm rounded-md ${selectedTimeFrame === '2week'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700'}`}
                        >
                          Last 14 Days
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent expansion toggle
                            handleTimeframeChange('month');
                          }}
                          className={`px-3 py-1 text-sm rounded-md ${selectedTimeFrame === 'month'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700'}`}
                        >
                          Last 30 Days
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Chart - adjust height based on expansion state */}
                  <div className={isSectionExpanded(SECTION_IDS.SENTIMENT_TRENDS) ? "h-96" : "h-64"}>
                    {isLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-base">Loading mood data...</span>
                      </div>
                    ) : error ? (
                      <div className="flex flex-col justify-center items-center h-full">
                        <p className="text-red-500 text-base">Error loading data: {error}</p>
                        <Link to="/journal" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md">
                          Write a Journal Entry
                        </Link>
                      </div>
                    ) : timeframeChartData.length === 0 ? (
                      <div className="flex flex-col justify-center items-center h-full">
                        <p className="text-gray-500 text-base">No mood data available for the selected period.</p>
                        <p className="text-sm mt-2">Start journaling to see your mood trends here.</p>
                        <Link to="/journal" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md">
                          Start Journaling
                        </Link>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timeframeChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="day"
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: '#ccc' }}
                            tickFormatter={(value) => formatXAxisTick(value, selectedTimeFrame)}
                            interval={selectedTimeFrame === 'month' ? 0 : 'preserveStartEnd'}
                          />
                          <YAxis
                            domain={calculateYAxisDomain(timeframeChartData)}
                            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: '#ccc' }}
                          />
                          <Tooltip
                            formatter={(value) => [`${(value * 100).toFixed(0)}%`, "Mood Score"]}
                            labelFormatter={(label, entries) => {
                              const entry = entries[0]?.payload;
                              if (entry) {
                                return `${label} (${entry.date})${entry.entries > 0 ? ` - ${entry.entries} entries` : ''}`;
                              }
                              return label;
                            }}
                            contentStyle={{
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              fontSize: '14px'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="Overall"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.2}
                            strokeWidth={3}
                            name="Mood Score"
                            activeDot={{ r: 8 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Add the detailed statistics section that appears when expanded */}
                  {isSectionExpanded(SECTION_IDS.SENTIMENT_TRENDS) && !isLoading && timeframeChartData.length > 0 && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h3 className="text-xl font-semibold text-blue-800 mb-2">Overall Average</h3>
                        <div className="flex items-center">
                          <div className="text-4xl font-bold text-blue-600">
                            {(timeframeChartData.reduce((sum, day) => sum + day.Overall, 0) / timeframeChartData.length * 100).toFixed(0)}%
                          </div>
                          <div className="ml-2 text-base text-blue-700">
                            {calculateTrend(timeframeChartData.map(d => d.Overall))}
                          </div>
                        </div>
                        <p className="text-base text-blue-600 mt-2">
                          Your average mood score for the selected period
                        </p>
                      </div>

                      <div className="bg-indigo-50 rounded-lg p-4">
                        <h3 className="text-xl font-semibold text-indigo-800 mb-2">Peak Day</h3>
                        <div className="flex items-center">
                          <div className="text-4xl font-bold text-indigo-600">
                            {(() => {
                              // Find the day with highest mood
                              const peakDay = timeframeChartData.reduce(
                                (best, day) => day.Overall > best.Overall ? day : best,
                                timeframeChartData[0]
                              );

                              // Format the date for display
                              if (peakDay) {
                                const date = new Date(peakDay.date);
                                return `${date.getDate()}/${date.getMonth() + 1}`;
                              }
                              return 'N/A';
                            })()}
                          </div>
                        </div>
                        <p className="text-base text-indigo-600 mt-2">
                          Your highest mood was recorded on this day
                        </p>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-4">
                        <h3 className="text-xl font-semibold text-purple-800 mb-2">Total Entries</h3>
                        <div className="flex items-center">
                          <div className="text-4xl font-bold text-purple-600">
                            {timeframeChartData.reduce((sum, day) => sum + day.entries, 0)}
                          </div>
                        </div>
                        <p className="text-base text-purple-600 mt-2">
                          Total journal entries in this period
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 md:col-span-3">
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">Mood Insights</h3>
                        <p className="text-base leading-relaxed text-gray-700">
                          {generateMoodInsight(timeframeChartData)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>


              {/* Container for the bottom two charts */}
              <div className="flex flex-wrap justify-between gap-4">
                {/* Mood Distribution (Donut Chart) */}
                <div
                  className={getSectionClasses(SECTION_IDS.MOOD_DISTRIBUTION)}
                  onClick={() => toggleSectionExpansion(SECTION_IDS.MOOD_DISTRIBUTION)}
                >
                  <div className="w-full flex flex-col rounded-xl text-gray-700 p-4 bg-white shadow-lg h-full">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-indigo-500 pb-1">
                          Your Mood Distribution
                          {isSectionExpanded(SECTION_IDS.MOOD_DISTRIBUTION) && (
                            <span className="ml-2 text-sm text-blue-500">
                              (Click to collapse)
                            </span>
                          )}
                        </h2>
                        <p className="text-sm text-gray-600">Monthly Mood Analysis</p>
                      </div>

                      {/* Month selector */}
                      {(expandedSection === null || isSectionExpanded(SECTION_IDS.MOOD_DISTRIBUTION)) && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={goToPreviousMonth}
                            className="p-1 rounded-full hover:bg-gray-200"
                            aria-label="Previous month"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 18l-6-6 6-6" />
                            </svg>
                          </button>

                          <span className="text-base font-medium">
                            {monthNames[selectedMonth]} {selectedYear}
                          </span>

                          <button
                            onClick={goToNextMonth}
                            className="p-1 rounded-full hover:bg-gray-200"
                            aria-label="Next month"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </button>

                          <button
                            onClick={goToCurrentMonth}
                            className="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-md"
                          >
                            Today
                          </button>
                        </div>
                      )}
                    </div>

                    {isLoading ? (
                      <div className="py-6 flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span className="ml-2">Loading mood data...</span>
                      </div>
                    ) : error ? (
                      <div className="py-6 flex flex-col justify-center items-center h-64">
                        <p className="text-red-500">{error}</p>
                        <Link to="/journal" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md">
                          Write a Journal Entry
                        </Link>
                      </div>
                    ) : !hasData ? (
                      <div className="py-6 flex flex-col justify-center items-center h-64">
                        <div className="text-center max-w-md">
                          <p className="text-xl font-medium text-gray-700 mb-2">No mood data for {monthNames[selectedMonth]} {selectedYear}</p>
                          <p className="text-gray-500 mb-4">
                            {selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear()
                              ? "Start journaling to see your mood trends and get personalized analytics."
                              : "Try selecting a different month or start journaling more regularly."}
                          </p>
                          <div className="flex justify-center gap-3">
                            <Link to="/journal" className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              Start Journaling
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`py-6 flex justify-center ${isSectionExpanded(SECTION_IDS.MOOD_DISTRIBUTION) ? "h-96" : "h-64"}`}>
                        <ReactApexChart
                          options={{
                            ...pieChartConfig.options,
                            title: { text: undefined } // Remove title from ApexCharts options
                          }}
                          series={pieChartConfig.series}
                          type="donut"
                          width={isSectionExpanded(SECTION_IDS.MOOD_DISTRIBUTION) ? 600 : 450}
                          height={isSectionExpanded(SECTION_IDS.MOOD_DISTRIBUTION) ? "100%" : "100%"}
                        />
                      </div>
                    )}

                    {hasData && (
                      <div className="flex flex-col gap-3 items-center">
                        <div className="flex flex-row gap-3 justify-center">
                          {legendItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></span>
                              <span className="text-gray-700 text-sm">{item.label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-sm text-gray-500">
                          Showing mood data for {monthNames[selectedMonth]} {selectedYear}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Word Cloud */}
                <div
                  className={getSectionClasses(SECTION_IDS.WORD_CLOUD)}
                  onClick={() => toggleSectionExpansion(SECTION_IDS.WORD_CLOUD)}
                >
                  <div className="w-full flex flex-col rounded-xl text-gray-700 p-4 bg-white shadow-lg h-full">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-indigo-500 pb-1">
                          Word Cloud
                          {isSectionExpanded(SECTION_IDS.WORD_CLOUD) && (
                            <span className="ml-2 text-sm text-blue-500">
                              (Click to collapse)
                            </span>
                          )}
                        </h2>
                        <p className="text-sm text-gray-600">Most common words in your journal</p>
                      </div>

                      {/* Time range selector - only show in expanded mode or when none expanded */}
                      {(expandedSection === null || isSectionExpanded(SECTION_IDS.WORD_CLOUD)) && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent expansion toggle
                              handleTimeRangeChange('week');
                            }}
                            className={`px-3 py-1 text-sm rounded-md ${timeRange === 'week'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700'}`}
                          >
                            Week
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent expansion toggle
                              handleTimeRangeChange('month');
                            }}
                            className={`px-3 py-1 text-sm rounded-md ${timeRange === 'month'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700'}`}
                          >
                            Month
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent expansion toggle
                              handleTimeRangeChange('year');
                            }}
                            className={`px-3 py-1 text-sm rounded-md ${timeRange === 'year'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700'}`}
                          >
                            Year
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent expansion toggle
                              handleTimeRangeChange('all');
                            }}
                            className={`px-3 py-1 text-sm rounded-md ${timeRange === 'all'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700'}`}
                          >
                            All Time
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={isSectionExpanded(SECTION_IDS.WORD_CLOUD) ? "h-96" : "h-80"}>
                      {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                          <span className="ml-2">Loading word cloud...</span>
                        </div>
                      ) : error ? (
                        <div className="flex flex-col justify-center items-center h-full">
                          <p className="text-red-500">{error}</p>
                          <Link to="/journal" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md">
                            Write a Journal Entry
                          </Link>
                        </div>
                      ) : wordCloudData.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-full">
                          <div className="text-center max-w-md">
                            <p className="text-xl font-medium text-gray-700 mb-2">No word data available</p>
                            <p className="text-gray-500 mb-4">
                              Start journaling to see which words you use most frequently in your entries.
                            </p>
                            <Link to="/journal" className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              Start Journaling
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-gray-500 mb-2">
                            {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} analyzed
                          </div>
                          <div className="w-full h-full flex justify-center">
                            <D3WordCloud
                              words={wordCloudData}
                              width={isSectionExpanded(SECTION_IDS.WORD_CLOUD) ? 900 : 700}
                              height={isSectionExpanded(SECTION_IDS.WORD_CLOUD) ? 500 : 300}
                              colors={wordCloudColors}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Overlay for mobile sidebar */}
          {isMobileSidebarOpen && (
            <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)} />
          )}
        </div>
      </>
    );
  };

  // Render the MoodPieChart component
  return <MoodPieChart userId={userId} />;
};

export default Mood;