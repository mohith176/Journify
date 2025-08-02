import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import axios from 'axios';
import {
  Container, Row, Col, Navbar, Nav, Form, Button,
  InputGroup, Card, Modal, Badge, Spinner, Alert, Placeholder
} from 'react-bootstrap';
import {
  Send, Home, Book, PieChart,
  Settings, LogOut, Award, FileText, RefreshCw
} from 'react-feather';
import { BarChart2 } from 'lucide-react';
import BadgeNotification from '../components/BadgeNotification';
import { useTheme } from '../main';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://journify-deploy.onrender.com';
const API_URL = `${API_BASE_URL}/api`;
const Journal = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [messages, setMessages] = useState([
    { text: "What's on your mind? Share with me.", sender: 'bot', isDefault: true }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [typingComplete, setTypingComplete] = useState(true);
  const [currentTypingMessage, setCurrentTypingMessage] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [journalTitle, setJournalTitle] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isMoodTracking, setIsMoodTracking] = useState(false);
  const [moodTrackingSuccess, setMoodTrackingSuccess] = useState(false);
  const [highlightMoodSection, setHighlightMoodSection] = useState(false);
  const [newBadges, setNewBadges] = useState([]);
  const [journalingPrompts, setJournalingPrompts] = useState([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptsError, setPromptsError] = useState(null);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [journalMode, setJournalMode] = useState('conversation'); // 'conversation' or 'longform'
  const chatRef = useRef(null);
  const textareaRef = useRef(null);

  // Get the current user ID from local storage
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      // Set the height to the scrollHeight to fit all content
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Effect to get the user ID when component mounts
  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token) {
      // If no token is found, redirect to login
      navigate('/login');
      return;
    }

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Assuming the user object has an _id field from MongoDB
        setUserId(parsedUser._id);
      } catch (error) {
        console.error('Error parsing user data:', error);
        // Redirect to login if user data is invalid
        navigate('/login');
      }
    } else {
      // No user data found, redirect to login
      navigate('/login');
    }
  }, [navigate]);

  // Effect to fetch journaling prompts when the component mounts
  useEffect(() => {
    const fetchPrompts = async () => {
      if (!userId) return;

      setLoadingPrompts(true);
      setPromptsError(null);

      try {
        const response = await axios.get(`${API_URL}/chat/prompts/${userId}?count=4`);
        if (response.data.success) {
          setJournalingPrompts(response.data.prompts);
        } else {
          console.error('Error in prompt response:', response.data);
          setPromptsError('Failed to load prompts');
        }
      } catch (error) {
        console.error('Error fetching journaling prompts:', error);
        setPromptsError('Failed to load prompts');
      } finally {
        setLoadingPrompts(false);
      }
    };

    fetchPrompts();
  }, [userId]);

  // Function to refresh prompts
  const handleRefreshPrompts = async () => {
    if (!userId || loadingPrompts) return;

    setLoadingPrompts(true);
    setPromptsError(null);

    try {
      const response = await axios.get(`${API_URL}/chat/prompts/${userId}?count=4`);
      if (response.data.success) {
        setJournalingPrompts(response.data.prompts);
      } else {
        setPromptsError('Failed to refresh prompts');
      }
    } catch (error) {
      console.error('Error refreshing journaling prompts:', error);
      setPromptsError('Failed to refresh prompts');
    } finally {
      setLoadingPrompts(false);
    }
  };

  // Function to handle prompt selection/deselection
  const handleUsePrompt = async (prompt) => {
    // Check if this is the first message (no user messages sent yet)
    const isFirstMessage = messages.length === 1 && messages[0].sender === 'bot';
    // If this prompt is already selected, deselect it
    // If this prompt is already selected, deselect it (only if we're at first message)
    if (selectedPrompt?.id === prompt.id && isFirstMessage) {
      setSelectedPrompt(null);
      setInput(''); // Clear the input
      // Reset to default message
      setMessages([
        { text: "What's on your mind? Share with me.", sender: 'bot', isDefault: true }
      ]);
      return;
    }
    // If we've already started a conversation (user has sent messages), start a new chat
    if (!isFirstMessage) {
      // Start a new conversation
      handleNewChat();

      // Small delay to ensure state is updated properly before setting the new prompt
      setTimeout(() => {
        // Set the selected prompt
        setSelectedPrompt(prompt);

        // Set the new prompt message
        setMessages([
          {
            text: `Let's reflect on this: "${prompt.text}" What are your thoughts?`,
            sender: 'bot',
            isDefault: false,
            promptId: prompt.id
          }
        ]);
      }, 100);

      return;
    }

    // Set the selected prompt
    setSelectedPrompt(prompt);



    setMessages([
      {
        text: `Let's reflect on this: "${prompt.text}" What are your thoughts?`,
        sender: 'bot',
        isDefault: false,
        promptId: prompt.id
      }
    ]);
  };

  // Handle logout functionality
  const handleLogout = () => {
    // Remove JWT token and user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Redirect to homepage
    navigate('/');
  };

  // Handle sending a message
const handleSend = async () => {
  if (input.trim() === '' || isThinking || sessionEnded || !userId) return;

  // Add user message immediately
  const userMessage = { text: input, sender: 'user' };
  setMessages(prevMessages => [...prevMessages, userMessage]);
  setInput('');
  
  // Reset textarea height
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
  }
  
  // Show thinking indicator
  setIsThinking(true);

  try {
    // Send message to backend with prompt context if appropriate
    const payload = {
      userId,
      message: input,
    };
    
    // Add the prompt context if a prompt is selected
    if (selectedPrompt) {
      payload.promptContext = selectedPrompt.text;
      payload.promptId = selectedPrompt.id;
    }

    const response = await axios.post(`${API_URL}/chat/send`, payload);

    // If a prompt was used, mark it as used
    if (selectedPrompt && !selectedPrompt.isUsed) {
      try {
        await axios.put(`${API_URL}/chat/prompts/${selectedPrompt.id}/use`);
        
        // Update local state to mark as used
        setJournalingPrompts(prevPrompts => 
          prevPrompts.map(p => 
            p.id === selectedPrompt.id ? { ...p, isUsed: true } : p
          )
        );
      } catch (error) {
        console.error('Error marking prompt as used:', error);
      }
    }
    
    // Clear selected prompt after first user message
    // This prevents the user from changing prompts mid-conversation
    if (messages.length === 1) {
      setSelectedPrompt(null);
    }

    // Hide thinking indicator
    setIsThinking(false);

    // Add bot message and start typing effect
    const botMessage = { text: response.data.message, sender: 'bot' };
    setMessages(prevMessages => [...prevMessages, botMessage]);
    setCurrentTypingMessage(botMessage);
    setTypingText('');
    setTypingComplete(false);
  } catch (error) {
    console.error('Error sending message:', error);
    setIsThinking(false);
    // Add error message
    setMessages(prevMessages => [
      ...prevMessages,
      { text: "Sorry, I'm having trouble responding right now. Please try again.", sender: 'bot' }
    ]);
  }
};

  const handleEndSession = async () => {
    if (messages.length <= 1 || sessionEnded || !userId) return;

    // Check if a mood has been selected
    if (selectedMood === null) {
      // Add a message prompting the user to select a mood
      setMessages(prevMessages => [
        ...prevMessages,
        {
          text: "Before we finish, could you please select your mood using the options above? This helps us understand how you're feeling and provide better insights.",
          sender: 'bot'
        }
      ]);

      // Highlight the mood selection section
      setHighlightMoodSection(true);

      // Remove the highlight after 5 seconds
      setTimeout(() => {
        setHighlightMoodSection(false);
      }, 5000);

      // Scroll to the new message
      setTimeout(() => {
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
      }, 100);

      return; // Exit the function without ending the session
    }

    try {
      // Show loading state
      setIsThinking(true);

      // End session and get analysis
      const response = await axios.post(`${API_URL}/chat/end`, {
        userId,
        title: journalTitle || undefined,
        // Include the mood in the request
        mood: selectedMood ? moodOptions.find(m => m.rating === selectedMood)?.label : null
      });

      // Hide loading state
      setIsThinking(false);

      // Set session as ended and show analysis
      setSessionEnded(true);
      setAnalysis(response.data.analysis);

      // Set the journal title from the response if it exists
      if (response.data.title) {
        setJournalTitle(response.data.title);
      }

      // Check if any badges were earned during this journal entry
      if (response.data.newBadges && response.data.newBadges.length > 0) {
        setNewBadges(response.data.newBadges);
      }

      setShowAnalysisModal(true);
    } catch (error) {
      console.error('Error ending session:', error);
      setIsThinking(false);
      // Add error message
      setMessages(prevMessages => [
        ...prevMessages,
        { text: "Sorry, I couldn't save our conversation. Please try again.", sender: 'bot' }
      ]);
    }
  };

  // Handle typing animation for the latest bot message
  useEffect(() => {
    if (currentTypingMessage && !typingComplete) {
      if (typingText.length < currentTypingMessage.text.length) {
        const timeoutId = setTimeout(() => {
          setTypingText(currentTypingMessage.text.substring(0, typingText.length + 1));
        }, 20); // Faster typing speed

        return () => clearTimeout(timeoutId);
      } else {
        setTypingComplete(true);
        setCurrentTypingMessage(null);
      }
    }
  }, [currentTypingMessage, typingText, typingComplete]);

  // Scroll to the bottom when messages change
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, typingText, isThinking]);

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Function to render message content with typing animation
  const renderMessageContent = (message) => {
    if (currentTypingMessage === message && !typingComplete) {
      return typingText;
    }
    return message.text;
  };

  // Then update handleMoodSelect
  const handleMoodSelect = async (rating) => {
    setSelectedMood(rating);

    // Only proceed if we have a userId
    if (!userId) return;

    setIsMoodTracking(true);

    try {
      // Get the mood label from the rating
      const selectedMoodOption = moodOptions.find(m => m.rating === rating);

      // Send mood data to backend
      await axios.post(`${API_URL}/mood/track`, {
        userId,
        mood: selectedMoodOption.label,
        time: new Date()
      });

      setMoodTrackingSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setMoodTrackingSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error tracking mood:', error);
    } finally {
      setIsMoodTracking(false);
    }
  };

  // Mood options
  const moodOptions = [
    { emoji: "😔", rating: 1, label: "Horrible" },
    { emoji: "😕", rating: 2, label: "Sad" },
    { emoji: "😐", rating: 3, label: "Neutral" },
    { emoji: "🙂", rating: 4, label: "Good" },
    { emoji: "😄", rating: 5, label: "Great" }
  ];

  // Start a new chat
  const handleNewChat = () => {
    // Reset selection state first
    setSelectedPrompt(null);

    // Reset messages to default initial message
    setMessages([
      { text: "What's on your mind? Share with me.", sender: 'bot', isDefault: true }
    ]);

    // Reset other states

    setInput('');
    setTypingText('');
    setTypingComplete(true);
    setCurrentTypingMessage(null);
    setSessionEnded(false);
    setAnalysis(null);
    setJournalTitle('');
    setSelectedMood(null);
    setShowAnalysisModal(false);
    setIsMoodTracking(false);
    setMoodTrackingSuccess(false);
    setHighlightMoodSection(false);

    // Refresh prompts
    handleRefreshPrompts();

  };

  // Add this function to handle switching modes
  const handleSwitchMode = () => {
    // If we're in the middle of a conversation, confirm before switching
    if (journalMode === 'conversation' && messages.length > 1 && !sessionEnded) {
      if (window.confirm('Switching modes will reset your current journal session. Continue?')) {
        handleNewChat();
        setJournalMode(journalMode === 'conversation' ? 'longform' : 'conversation');
      }
    } else {
      // Safe to switch without confirmation
      if (journalMode === 'longform' && input.trim() !== '') {
        if (window.confirm('Switching modes will clear your current entry. Continue?')) {
          setInput('');
          setJournalMode(journalMode === 'conversation' ? 'longform' : 'conversation');
        }
      } else {
        setJournalMode(journalMode === 'conversation' ? 'longform' : 'conversation');
      }
    }
  };

  // Add a new function to handle submitting the long form journal
const handleLongFormSubmit = async () => {
  if (input.trim() === '' || isThinking || !userId) return;

  // Show thinking indicator
  setIsThinking(true);

  try {
    // Check if mood is selected
    if (selectedMood === null) {
      setHighlightMoodSection(true);
      setIsThinking(false);
      
      // Add a message
      alert("Please select your mood before submitting your journal entry.");
      
      // Remove the highlight after 5 seconds
      setTimeout(() => {
        setHighlightMoodSection(false);
      }, 5000);
      
      return;
    }

    // Send the entire long form journal entry for analysis
    const response = await axios.post(`${API_URL}/chat/longform`, {
      userId,
      content: input,
      title: journalTitle || undefined,
      mood: selectedMood ? moodOptions.find(m => m.rating === selectedMood)?.label : null
    });

    // Hide loading state
    setIsThinking(false);

    // Set session as ended and show analysis
    setSessionEnded(true);
    setAnalysis(response.data.analysis);

    // Set the journal title from the response if it exists
    if (response.data.title) {
      setJournalTitle(response.data.title);
    }

    // Check if any badges were earned
    if (response.data.newBadges && response.data.newBadges.length > 0) {
      setNewBadges(response.data.newBadges);
    }

    setShowAnalysisModal(true);
  } catch (error) {
    console.error('Error submitting long form journal:', error);
    setIsThinking(false);
    alert("Sorry, there was an error processing your journal entry. Please try again.");
  }
};

  return (
    <div className={`journal-page ${theme}`}>
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

      {/* Main Content */}
      <Container fluid className="bg-light min-vh-100 py-4">
        <Row className="justify-content-center">
          <Col xs={12} md={10} lg={8}>
            {/* Prompt Templates Section */}
            <Card className="mb-3 shadow-sm">
              <Card.Body>
                <Card.Title className="d-flex justify-content-between align-items-center mb-3">
                  <span>Journaling Prompts</span>
                  {/* <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleRefreshPrompts}
                    disabled={loadingPrompts}
                  >
                    {loadingPrompts ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                  </Button> */}
                </Card.Title>

                <p className="text-muted small mb-3">
                  These prompts are personalized based on your previous journal entries.
                  Click a prompt to use it, click again to deselect.
                </p>

                {promptsError && (
                  <Alert variant="warning" className="small py-2">
                    {promptsError} <Button variant="link" className="p-0 ms-2" size="sm" onClick={handleRefreshPrompts}>Try again</Button>
                  </Alert>
                )}

                <Row className="g-3">
                  {journalingPrompts.length > 0 ? (
                    journalingPrompts.map((prompt, index) => (
                      <Col xs={12} md={6} key={prompt.id || index}>
                        <Card
                          className={`h-100 prompt-card ${prompt.isUsed ? 'border-secondary bg-light' : 'border-primary'} ${selectedPrompt?.id === prompt.id ? 'border-2 shadow-sm' : ''}`}
                          onClick={() => !prompt.isUsed && handleUsePrompt(prompt)}
                          style={{
                            cursor: prompt.isUsed ? 'default' : 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Card.Body className="d-flex flex-column">
                            <Card.Text
                              className={`mb-0 flex-grow-1 ${prompt.isUsed ? 'text-muted' : selectedPrompt?.id === prompt.id ? 'fw-bold' : ''}`}
                              style={{ fontSize: '0.95rem' }}
                            >
                              {prompt.text}
                            </Card.Text>

                            <div className="mt-2 pt-2 border-top">
                              {prompt.themes && prompt.themes.length > 0 ? (
                                prompt.themes.slice(0, 3).map((theme, i) => (
                                  <Badge
                                    bg={prompt.isUsed ? "secondary" : selectedPrompt?.id === prompt.id ? "primary" : "info"}
                                    className="me-1 opacity-75"
                                    key={i}
                                    style={{ fontSize: '0.7rem' }}
                                  >
                                    {theme}
                                  </Badge>
                                ))
                              ) : (
                                <Badge
                                  bg={prompt.isUsed ? "secondary" : selectedPrompt?.id === prompt.id ? "primary" : "info"}
                                  className="me-1 opacity-75"
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  reflection
                                </Badge>
                              )}

                              {selectedPrompt?.id === prompt.id && (
                                <Badge bg="success" className="float-end">Selected</Badge>
                              )}

                              {prompt.isUsed && (
                                <Badge bg="secondary" className="float-end">Used</Badge>
                              )}
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))
                  ) : loadingPrompts ? (
                    // Loading placeholders
                    Array.from({ length: 4 }).map((_, index) => (
                      <Col xs={12} md={6} key={`placeholder-${index}`}>
                        <Card className="h-100 bg-light">
                          <Card.Body>
                            <Placeholder as={Card.Text} animation="glow">
                              <Placeholder xs={10} />
                              <Placeholder xs={8} />
                              <Placeholder xs={6} />
                              <Placeholder xs={12} className="mt-2" />
                            </Placeholder>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))
                  ) : (
                    <Col xs={12}>
                      <div className="text-center py-3">
                        <p className="text-muted mb-2">No prompts available yet.</p>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={handleRefreshPrompts}
                        >
                          Generate Prompts
                        </Button>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>

            {/* Mood Selection */}
            <Card
              className={`mb-3 shadow-sm ${highlightMoodSection ? 'border border-primary border-3 animate__animated animate__pulse' : ''}`}
              style={{ transition: 'all 0.3s ease' }}
            >
              <Card.Body>
                <Card.Title
                  style={{
                    color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1f2937'
                  }}
                >
                  {highlightMoodSection ? (
                    <div className="d-flex align-items-center text-primary">
                      <span>Please select your mood</span>
                      <span className="ms-2 fs-5">⬇️</span>
                    </div>
                  ) : (
                    "How are you feeling today?"
                  )}
                </Card.Title>
                <div className="d-flex justify-content-between mt-3">
                  {moodOptions.map((mood) => (
                    <Button
                      key={mood.rating}
                      variant={selectedMood === mood.rating ? "primary" : highlightMoodSection ? "outline-primary" : "light"}
                      className="d-flex flex-column align-items-center px-3 py-2"
                      onClick={() => handleMoodSelect(mood.rating)}
                      disabled={isMoodTracking}
                    >
                      <span style={{ fontSize: '1.5rem' }}>{mood.emoji}</span>
                      <span className="mt-1 small">{mood.label}</span>
                    </Button>
                  ))}
                </div>
                {isMoodTracking && (
                  <div className="text-center mt-2">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Updating mood...
                  </div>
                )}
                {moodTrackingSuccess && (
                  <div className="alert alert-success mt-2 mb-0 py-2">
                    Mood updated successfully!
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Chat Messages */}
            <Card className="mb-3 shadow-sm">
              <Card.Body>
                <Card.Title
                  className="mb-3"
                  style={{
                    color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1f2937'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span>
                      {journalMode === 'conversation' ? 'Journal Conversation' : 'Long Form Journal'}
                    </span>
                    <div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={handleSwitchMode}
                        className="me-2"
                      >
                        Switch to {journalMode === 'conversation' ? 'Long Form' : 'Conversation'} Mode
                      </Button>
                      {journalMode === 'conversation' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleNewChat}
                          className="me-2"
                        >
                          New Chat
                        </Button>
                      )}
                    </div>
                  </div>
                </Card.Title>

                {journalMode === 'conversation' ? (
                  <div
                    className="chat-messages bg-white p-3 rounded border"
                    ref={chatRef}
                    style={{ height: '400px', overflowY: 'auto' }}
                  >
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
                      >
                        {msg.sender === 'bot' && (
                          <div
                            className="avatar me-2 d-flex align-items-center justify-content-center rounded-circle bg-primary text-white"
                            style={{ width: '40px', height: '40px', minWidth: '40px' }}
                          >
                            J
                          </div>
                        )}

                        <div
                          className={`message p-3 rounded-3 ${msg.sender === 'user'
                            ? 'bg-primary text-white user'
                            : 'bg-light border bot'
                            }`}
                          style={{
                            maxWidth: '75%',
                            wordBreak: 'break-word',
                            color: msg.sender === 'user' ? '#ffffff' : document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1f2937'
                          }}
                        >
                          {renderMessageContent(msg)}
                        </div>



                        {msg.sender === 'user' && (
                          <div
                            className="avatar ms-2 d-flex align-items-center justify-content-center rounded-circle bg-secondary text-white"
                            style={{ width: '40px', height: '40px', minWidth: '40px' }}
                          >
                            U
                          </div>
                        )}
                      </div>
                    ))}

                    {isThinking && (
                      <div className="d-flex mb-3 justify-content-start">
                        <div
                          className="avatar me-2 d-flex align-items-center justify-content-center rounded-circle bg-primary text-white"
                          style={{ width: '40px', height: '40px', minWidth: '40px' }}
                        >
                          J
                        </div>
                        <div className="message p-3 rounded-3 bg-light border" style={{ maxWidth: '75%' }}>
                          <Spinner animation="grow" size="sm" className="me-1" />
                          <Spinner animation="grow" size="sm" className="me-1" />
                          <Spinner animation="grow" size="sm" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="long-form-journal bg-white p-3 rounded border mb-3">
                    <Form.Control
                      as="textarea"
                      placeholder="Write your journal entry here..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isThinking || sessionEnded}
                      className="long-form-textarea"
                      style={{
                        minHeight: '400px',
                        resize: 'vertical',
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1f2937',
                        backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#2d3748' : '#ffffff',
                        caretColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1f2937',
                      }}
                    />
                    
                    {isThinking && (
                      <div className="text-center mt-3">
                        <Spinner animation="border" role="status">
                          <span className="visually-hidden">Processing your journal entry...</span>
                        </Spinner>
                        <p className="mt-2">Analyzing your journal entry...</p>
                      </div>
                    )}
                  </div>
                )}

                {!sessionEnded && journalMode === 'conversation' && (
                  <InputGroup className="mt-3">
                    <Form.Control
                      as="textarea"
                      placeholder="Type your message here..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isThinking || sessionEnded}
                      ref={textareaRef}
                      className="auto-resize-textarea"
                      style={{
                        minHeight: '38px',
                        maxHeight: '200px',
                        resize: 'none',
                        overflow: 'hidden',
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1f2937', // Text color
                        backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#2d3748' : '#ffffff', // Background color
                        caretColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1f2937', // Caret color
                        '--placeholder-color': document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#6b7280',
                      }}
                      rows={1}
                    />
                    <Button
                      variant="primary"
                      onClick={handleSend}
                      disabled={input.trim() === '' || isThinking || sessionEnded}
                      style={{ height: 'auto' }} // Make button height adjust with textarea
                    >
                      <Send size={16} />
                    </Button>
                  </InputGroup>
                )}
              </Card.Body>
              <Card.Footer className="d-flex justify-content-end">
                {journalMode === 'conversation' ? (
                  <Button
                    variant="success"
                    onClick={handleEndSession}
                    disabled={messages.length <= 1 || isThinking || sessionEnded}
                  >
                    Finish Conversation
                  </Button>
                ) : (
                  <Button
                    variant="success"
                    onClick={handleLongFormSubmit}
                    disabled={input.trim() === '' || isThinking || sessionEnded}
                  >
                    Submit Journal Entry
                  </Button>
                )}
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Analysis Modal */}
      <Modal
        show={showAnalysisModal}
        onHide={() => setShowAnalysisModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Journal Analysis</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {analysis && (
            <>
              {/* Display the journal title at the top */}
              <div className="mb-4 text-center">
                <h3
                  className="journal-title fw-bold"
                  style={{
                    color: '#4a6fa5',
                    borderBottom: '2px solid #e9ecef',
                    paddingBottom: '0.5rem',
                    fontSize: '1.75rem'
                  }}
                >{journalTitle}</h3>
                <hr className="my-3" />
              </div>
              {analysis.emotions && analysis.emotions.length > 0 && (
                <div className="mb-4">
                  <h5>Emotions Detected</h5>
                  <div>
                    {analysis.emotions.map((emotion, index) => (
                      <Badge bg="info" className="me-2 mb-2 p-2" key={index}>
                        {emotion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {analysis.summary && (
                <div className="mb-4">
                  <h5 style={{ color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1f2937' }}>
                    Summary
                  </h5>
                  <Card>
                    <Card.Body style={{ color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1f2937' }}>
                      {analysis.summary}
                    </Card.Body>
                  </Card>
                </div>
              )}

              {analysis.insights && analysis.insights.length > 0 && (
                <div className="mb-4">
                  <h5 style={{ color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1f2937' }}>
                    Insights
                  </h5>
                  <Card>
                    <Card.Body>
                      <ul className="mb-0" style={{ color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1f2937' }}>
                        {analysis.insights.map((insight, index) => (
                          <li key={index} className="mb-2">{insight}</li>
                        ))}
                      </ul>
                    </Card.Body>
                  </Card>
                </div>
              )}

              {analysis.themes && analysis.themes.length > 0 && (
                <div className="mb-4">
                  <h5>Themes</h5>
                  <div>
                    {analysis.themes.map((theme, index) => (
                      <Badge bg="secondary" className="me-2 mb-2 p-2" key={index}>
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedMood && (
                <div className="mb-4">
                  <h5 style={{ color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1f2937' }}>
                    Mood Rating
                  </h5>
                  <Card>
                    <Card.Body style={{ color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1f2937' }}>
                      <div className="d-flex align-items-center">
                        <span style={{ fontSize: '2rem' }}>
                          {moodOptions.find(m => m.rating === selectedMood)?.emoji}
                        </span>
                        <span className="ms-3">
                          You rated your mood as <strong>{moodOptions.find(m => m.rating === selectedMood)?.label}</strong>
                        </span>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              )}

              {/* Show badge earned message if applicable */}
              {newBadges && newBadges.length > 0 && (
                <div className="mb-4 mt-4">
                  <h5 className="text-success">
                    <Award size={18} className="me-2" />
                    Achievement Unlocked!
                  </h5>
                  <Card bg="light">
                    <Card.Body>
                      <p className="mb-3">Congratulations! You earned {newBadges.length > 1 ? `${newBadges.length} new badges` : 'a new badge'}:</p>
                      <div className="d-flex flex-wrap gap-3 justify-content-center">
                        {newBadges.map((badge, index) => (
                          <div key={index} className="text-center" style={{ minWidth: '120px' }}>
                            <div
                              className={`badge-icon-preview rarity-${badge.rarity || 'common'}`}
                              style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.75rem',
                                margin: '0 auto 8px'
                              }}
                            >
                              {badge.icon || "⭐"}
                            </div>
                            <div className="badge-name fw-bold">{badge.name}</div>
                            <div className="badge-description small text-muted">{badge.description}</div>
                          </div>
                        ))}
                      </div>
                      <div className="text-center mt-3">
                        <Link to="/progress" className="btn btn-sm btn-outline-primary">
                          View all badges
                        </Link>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAnalysisModal(false)}>
            Close
          </Button>
          <Button variant="primary" as={Link} to="/summary">
            View All Journals
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Badge Notifications */}
      <div className="badge-notification-container">
        {newBadges.map((badge, index) => (
          <BadgeNotification
            key={index}
            badge={badge}
            onClose={() => {
              setNewBadges(current => current.filter((_, i) => i !== index));
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Journal;