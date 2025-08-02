import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Calendar, X, ArrowLeft,
  Download, Share2,Trash, BookOpen, BarChart2
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import './Summary.css';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Book, PieChart, Settings, LogOut, FileText } from 'react-feather';
import { Navbar, Container, Nav, Button,Modal} from 'react-bootstrap';
import { jsPDF } from "jspdf";
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://journify-deploy.onrender.com';

const debounce = (func, delay) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

const getDisplayTitle = (journal) => {
  if (!journal.title || journal.title.trim() === '') {
    return formatShortDate(journal.date);
  }
  return journal.title;
};

const Summary = () => {
  const navigate = useNavigate();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis');
  const [error, setError] = useState(null);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  // Mock userId for development
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;
      const visible = prevScrollPos > currentScrollPos || currentScrollPos < 10;

      setPrevScrollPos(currentScrollPos);
      setVisible(visible);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Check if the ID exists and is not null or undefined
        if (parsedUser && parsedUser._id) {
          setUserId(parsedUser._id);
          console.log('User ID:', parsedUser._id);

          // Immediately fetch journals now that we have the ID
          setTimeout(() => {
            fetchJournalsWithParams('', null, null);
          }, 100);
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };
  
  const fetchJournals = () => {
    fetchJournalsWithParams(searchQuery, startDate, endDate);
  };

  // Update clearDateFilter as well
  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);

    // Use setTimeout to ensure state is updated
    setTimeout(() => {
      fetchJournalsWithParams(searchQuery, null, null);
    }, 0);
  };

  const debouncedSearch = useCallback(
    debounce((query) => {
      // Capture current values of state when the debounced function runs
      const currentStartDate = startDate;
      const currentEndDate = endDate;
      fetchJournalsWithParams(query, currentStartDate, currentEndDate);
    }, 300),
    [] // Empty dependencies to avoid recreating the debounced function
  );


  // useEffect(() => {
  //   // Only fetch journals if userId is a valid string
  //   if (userId && userId !== "null") {
  //     fetchJournals();
  //   }
  // }, [userId]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
  };
  const handleSearchChange = (e) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    debouncedSearch(newQuery);
  };

  const handleDateFilter = () => {
    fetchJournalsWithParams(searchQuery, startDate, endDate);
    setShowCalendar(false);
  };

  const highlightText = (text, query) => {
    if (!query || !text) return text;

    try {
      const regex = new RegExp(`(${query})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, index) =>
        regex.test(part) ? <mark key={index} className="bg-warning">{part}</mark> : part
      );
    } catch (e) {
      // In case of invalid regex, return original text
      return text;
    }
  };

  const clearSearch = () => {
    // Update the search query state to empty
    setSearchQuery('');
    debouncedSearch('');
  };
  // Update fetchJournalsWithParams to better handle userId errors
  const fetchJournalsWithParams = async (query, start, end) => {

    // Get current userId from state
    const userData1 = localStorage.getItem('user');

    if (!userData1) {
      console.error("No user data available");
      setError("User authentication error. Please try logging in again.");
      setLoading(false);
      return;
    }
    try {
      const parsedUser1 = JSON.parse(userData1);
      const userId1 = parsedUser1._id;
      console.log("userId", userId1);

      if (!userId1 || userId1 === "null") {
        console.error("No valid userId available, skipping fetch");
        setError("User authentication error. Please try logging in again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      console.log(`Fetching journals for user: ${userId1}`);
      console.log("Search parameters:", { query, startDate: start, endDate: end });

      // Base URL
      let url = `${API_BASE_URL}/api/summaries/${userId1}`;

      // If any search parameters exist, modify the URL
      const hasSearchParams = query || start || end;
      if (hasSearchParams) {
        url = `${API_BASE_URL}/api/summaries/search/${userId1}?`;

        if (query && query.trim() !== '') {
          url += `query=${encodeURIComponent(query)}&`;
        }

        if (start) {
          // Format the date properly for the API
          const formattedStart = new Date(start).toISOString();
          url += `startDate=${formattedStart}&`;
          console.log("Using start date:", formattedStart);
        }

        if (end) {
          // For end date, set time to 23:59:59 to include the entire day
          const endWithTime = new Date(end);
          endWithTime.setHours(23, 59, 59, 999);
          const formattedEnd = endWithTime.toISOString();
          url += `endDate=${formattedEnd}`;
          console.log("Using end date:", formattedEnd);
        }
      }

      // Remove trailing & if present
      url = url.endsWith('&') ? url.slice(0, -1) : url;

      console.log(`Making request to: ${url}`);
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Error response: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch journals: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Received ${data.summaries?.length || data.results?.length || 0} journals`);
      // If we get zero results with filters, show a more specific message
      if ((data.summaries?.length === 0 || data.results?.length === 0) && (query || start || end)) {
        setError(`No entries found matching your ${query ? 'search' : ''}${query && (start || end) ? ' and ' : ''}${(start || end) ? 'date' : ''} criteria.`);
      } else {
        setError(null);
      }

      setJournals(data.summaries || data.results || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching journals:', err);
      setError('Failed to load journals. Please try again later.');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMoodEmoji = (mood) => {
    const moodEmojis = {
      'happy': '😊', 'sad': '😢', 'angry': '😠', 'anxious': '😰',
      'calm': '😌', 'excited': '🤩', 'tired': '😴', 'neutral': '😐',
      'fearful': '😨', 'confident': '😎', 'grateful': '🙏', 'frustrated': '😤',
      'lonely': '🥺', 'hopeful': '🤞', 'embarrassed': '😳', 'curious': '🧐',
      'stressed': '😫', 'overwhelmed': '😩', 'horrible': '😫'
    };

    return moodEmojis[mood.toLowerCase()] || '😶';
  };

  const generateJournalPDF = (journal) => {
    const { date, content, summary, insights } = journal;
    const doc = new jsPDF();
  
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Journal Entry", 105, 15, { align: "center" });
  
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(formatDate(date), 105, 22, { align: "center" });
  
    let y = 35;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Content:", 10, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const contentLines = doc.splitTextToSize(content || "", 190);
    y += 7;
    doc.text(contentLines, 10, y);
    y += contentLines.length * 5 + 10;
  
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Summary:", 10, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const summaryLines = doc.splitTextToSize(summary || "", 190);
    y += 7;
    doc.text(summaryLines, 10, y);
    y += summaryLines.length * 5 + 10;
  
    if (insights?.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Insights:", 10, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      y += 7;
      insights.forEach((insight) => {
        const insightLines = doc.splitTextToSize(`• ${insight}`, 185);
        doc.text(insightLines, 10, y);
        y += insightLines.length * 5;
      });
    }
  
    return doc;
  };

  const generateMarkdown = (journal) => {
    const { date, content, summary, insights } = journal;
  
    const md = `# Journal Entry\n\n` +
               `**Date:** ${formatDate(date)}\n\n` +
               `## Content\n\n${content || "_No content_"}\n\n` +
               `## Summary\n\n${summary || "_No summary_"}\n\n` +
               (insights?.length
                 ? `## Insights\n\n${insights.map(insight => `- ${insight}`).join("\n")}\n`
                 : "");
  
    return md;
  };
  
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const handleDownload = () => {
    if (!selectedJournal) return;
    setShowDownloadModal(true);
  };
    

  const [clipboardFeedback, setClipboardFeedback] = useState({
    show: false,
    message: ""
  });

  const handleShare = async () => {
    if (!selectedJournal) return;
  
    const doc = generateJournalPDF(selectedJournal);
    const fileName = `Journal_${formatShortDate(selectedJournal.date).replace(/\s/g, "_")}.pdf`;
    const pdfBlob = doc.output("blob");
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });
  
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Journal Entry",
          text: `Shared journal entry from ${formatDate(selectedJournal.date)}.`,
          files: [file],
        });
        console.log("PDF shared successfully!");
        
        // Feedback for successful sharing
        setClipboardFeedback({
          show: true,
          message: "Journal shared successfully!"
        });
        
        // Hide the feedback after 3 seconds
        setTimeout(() => {
          setClipboardFeedback({ show: false, message: "" });
        }, 3000);
      } else {
        const fallbackText = `Journal Entry\n${formatDate(selectedJournal.date)}\n\n` +
          `Content:\n${selectedJournal.content?.trim() || "No content provided."}\n\n` +
          `Summary:\n${selectedJournal.summary?.trim() || "No summary provided."}\n\n` +
          (selectedJournal.insights?.length
            ? "Insights:\n" + selectedJournal.insights.map(i => `• ${i.trim()}`).join("\n") + "\n"
            : "");
  
        await navigator.clipboard.writeText(fallbackText);
        
        // Feedback for clipboard copy
        setClipboardFeedback({
          show: true,
          message: "Entry copied to clipboard!"
        });
        
        // Hide the feedback after 3 seconds
        setTimeout(() => {
          setClipboardFeedback({ show: false, message: "" });
        }, 3000);
      }
    } catch (err) {
      console.error("Error sharing:", err);
      
      setClipboardFeedback({
        show: true,
        message: "Failed to share. Please try again."
      });
      
      // Hide the error message after 3 seconds
      setTimeout(() => {
        setClipboardFeedback({ show: false, message: "" });
      }, 3000);
    }
  };

  const handleDelete = async () => {
    if (!selectedJournal) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');      
      console.log("Trying to delete journal with ID:", selectedJournal._id || selectedJournal.id);
      
      // Make sure we're using the correct ID (either _id or id)
      const journalId = selectedJournal._id || selectedJournal.id;
      
      // Fix the URL by using chat route
      const response = await axios.delete(`${API_BASE_URL}/api/chat/del/${journalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        // Remove the deleted journal from the journals state
        setJournals(journals.filter(journal => 
          (journal._id || journal.id) !== journalId
        ));
        
        // Clear the selected journal
        setSelectedJournal(null);
        
        // Show success feedback
        setClipboardFeedback({
          show: true,
          message: "Journal entry deleted successfully"
        });
      } else {
        throw new Error(response.data.message || "Failed to delete journal");
      }
      
      setTimeout(() => {
        setClipboardFeedback({ show: false, message: "" });
      }, 3000);
      
    } catch (error) {
      console.error('Error deleting journal:', error);
      
      // Show error feedback
      setClipboardFeedback({
        show: true,
        message: `Failed to delete journal: ${error.response?.data?.message || error.message}`
      });
      
      setTimeout(() => {
        setClipboardFeedback({ show: false, message: "" });
      }, 3000);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };
  
  return (
    <>
      {/* Navigation */}
      <Navbar bg="white" expand="lg" className="border-bottom shadow-sm" style={{
        transition: 'top 0.3s',
        top: visible ? '0' : '-60px'
      }}>
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
              <Nav.Link as={Link} to="/summary" active className="d-flex align-items-center">
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

    {clipboardFeedback.show && (
        <div 
          className="position-fixed bottom-0 end-0 p-3" 
          style={{ zIndex: 1050 }}
        >
          <div 
            className="toast show align-items-center text-white bg-success border-0" 
            role="alert" 
            aria-live="assertive" 
            aria-atomic="true"
          >
            <div className="d-flex">
              <div className="toast-body">
                {clipboardFeedback.message}
              </div>
              <button 
                type="button" 
                className="btn-close btn-close-white me-2 m-auto" 
                onClick={() => setClipboardFeedback({ show: false, message: "" })}
              ></button>
            </div>
          </div>
        </div>
      )}
      
      {showDeleteConfirmation && (
        <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }}>
          <div className="modal-backdrop fade show" onClick={() => !isDeleting && setShowDeleteConfirmation(false)} style={{ opacity: 0.5, zIndex: 1040, position: 'fixed', top: 0,left: 0,right: 0,bottom: 0 ,pointerEvents: 'none' }}></div>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content"  style={{ pointerEvents: 'auto' }}>
              <div className="modal-header">
                <h5 className="modal-title">Delete Journal Entry</h5>
                <button type="button" className="btn-close" disabled={isDeleting} onClick={() => setShowDeleteConfirmation(false)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this journal entry? This action cannot be undone.</p>
                <p className="text-muted small">Entry from: {selectedJournal && formatDate(selectedJournal.date)}</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirmation(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  disabled={isDeleting} 
                  onClick={handleDelete}  // Should look like this
                >
                  {isDeleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Deleting...
                    </>
                  ) : (
                    'Delete Entry'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Main content container */}
      <div className="container-fluid p-0" style={{ paddingTop: '56px' }}>
        <div className="row g-0">
          {/* Left sidebar */}
          <div className="col-md-4 col-lg-3 bg-light sidebar">
            <div className="p-3">
              <div className="search-container mb-4">
                {/* Remove the onSubmit handler from the form */}
                <form className="d-flex align-items-center">
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0"
                      title="Search across all journal content, summaries, insights, and emotions">
                      <Search size={18} />
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Search across all content..."
                      value={searchQuery}
                      onChange={handleSearchChange} // Change from (e) => setSearchQuery(e.target.value)
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-start-0"
                        onClick={clearSearch}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </form>
                <small className="text-muted mt-1 d-block">
                  Search in conversations, summaries, insights, emotions and themes
                </small>
              </div>

              <div className="date-filter mb-4">
                <button
                  className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-between"
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <div className="d-flex align-items-center">
                    <Calendar size={18} className="me-2" />
                    <span>
                      {startDate || endDate
                        ? `${startDate ? formatShortDate(startDate) : ''} - ${endDate ? formatShortDate(endDate) : ''}`
                        : 'Filter by date'}
                    </span>
                  </div>
                  {(startDate || endDate) && (
                    <X size={16} onClick={(e) => {
                      e.stopPropagation();
                      clearDateFilter();
                    }} />
                  )}
                </button>

                {showCalendar && (
                  <div className="calendar-popup shadow p-3 mt-2 bg-white rounded">
                    <div className="date-picker-container">
                      <div className="mb-3">
                        <label className="form-label">Start Date</label>
                        <DatePicker
                          selected={startDate}
                          onChange={date => setStartDate(date)}
                          selectsStart
                          startDate={startDate}
                          endDate={endDate}
                          className="form-control"
                          placeholderText="Select start date"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">End Date</label>
                        <DatePicker
                          selected={endDate}
                          onChange={date => setEndDate(date)}
                          selectsEnd
                          startDate={startDate}
                          endDate={endDate}
                          minDate={startDate}
                          className="form-control"
                          placeholderText="Select end date"
                        />
                      </div>
                      <div className="d-flex justify-content-end">
                        <button
                          className="btn btn-outline-secondary me-2"
                          onClick={() => setShowCalendar(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={handleDateFilter}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <h6 className="text-uppercase text-muted mb-3 fw-bold">Journal Entries</h6>

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="alert alert-danger">{error}</div>
              ) : journals.length === 0 ? (
                <div className="text-center py-4">
                  <div className="no-data-icon mb-3">📝</div>
                  <p className="text-muted">No entries found</p>
                  <p className="text-muted mb-2">No journal entries found</p>
                  <Link to="/journal" className="btn btn-sm btn-primary">
                    Create your first journal entry
                  </Link>
                </div>
              ) : (
                <div className="journal-list">
                  {journals.map((journal) => (
                    <div
                      key={journal.id}
                      className={`journal-item p-3 mb-2 rounded ${selectedJournal && selectedJournal.id === journal.id ? 'active' : ''}`}
                      onClick={() => setSelectedJournal(journal)}
                    >
                      {/* Title section with mood emoji */}
                      <div className="d-flex align-items-center mb-2">
                        <div className="mood-emoji me-2">
                          {journal.moods && journal.moods[0] ? getMoodEmoji(journal.moods[0]) : '📝'}
                        </div>
                        <h6 className="mb-0 text-truncate">
                          {searchQuery ? highlightText(getDisplayTitle(journal), searchQuery) : getDisplayTitle(journal)}
                        </h6>
                      </div>
                      {/* Date and emotions tags */}
                      <div className="d-flex align-items-center mb-2">
                        <small className="text-muted me-2">
                          {formatShortDate(journal.date)}
                        </small>
                        {journal.emotions && journal.emotions.slice(0, 2).map((emotion, idx) => (
                          <small key={idx} className="badge bg-light text-dark me-1" style={{ fontSize: '0.7rem' }}>
                            {emotion}
                          </small>
                        ))}
                        {journal.emotions && journal.emotions.length > 2 && (
                          <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                            +{journal.emotions.length - 2}
                          </small>
                        )}
                      </div>
                      {/* Summary preview */}
                      <p className="small summary-text text-truncate mb-0">
                        {searchQuery ? highlightText(journal.summary, searchQuery) : journal.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="col-md-8 col-lg-9 main-content">
            {selectedJournal ? (
              <div className="journal-detail">
                <div className="journal-header p-4 border-bottom">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center">
                      <div className="mood-emoji fs-4 me-3">
                        {selectedJournal.moods && selectedJournal.moods[0] ? getMoodEmoji(selectedJournal.moods[0]) : '📝'}
                      </div>
                      {/* Title highlighting with improved styling */}
                      <h2 className="mb-0 fw-bold" style={{ color: '#4a6fa5' }}>
                        {searchQuery
                          ? highlightText(getDisplayTitle(selectedJournal), searchQuery)
                          : getDisplayTitle(selectedJournal)}
                      </h2>
                    </div>
                    <div className="d-flex">
                    <button className="btn btn-outline-secondary me-2" onClick={handleDownload}>
                      <Download size={18} />
                    </button>
                    <Modal show={showDownloadModal} onHide={() => setShowDownloadModal(false)} centered>
                      <Modal.Header closeButton className="border-0">
                        <Modal.Title className="text-xl fw-semibold">Download Journal</Modal.Title>
                      </Modal.Header>
                      <Modal.Body className="text-center">
                        <p className="text-muted mb-4">Choose a format to download your journal entry:</p>
                        <div className="d-grid gap-3">
                          <Button 
                            variant="primary" 
                            onClick={() => {
                              const doc = generateJournalPDF(selectedJournal);
                              const fileName = `Journal_${formatShortDate(selectedJournal.date).replace(/\s/g, "_")}.pdf`;
                              doc.save(fileName);
                              setShowDownloadModal(false);
                            }} 
                            className="d-flex align-items-center justify-content-center gap-2"
                          >
                            <i className="bi bi-file-earmark-pdf-fill"></i>
                            Download as PDF
                          </Button>
                          <Button 
                            variant="outline-secondary" 
                            onClick={() => {
                              const mdContent = generateMarkdown(selectedJournal);
                              const blob = new Blob([mdContent], { type: "text/markdown" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `Journal_${formatShortDate(selectedJournal.date).replace(/\s/g, "_")}.md`;
                              a.click();
                              URL.revokeObjectURL(url);
                              setShowDownloadModal(false);
                            }} 
                            className="d-flex align-items-center justify-content-center gap-2"
                          >
                            <i className="bi bi-file-earmark-text"></i>
                            Download as Markdown
                          </Button>
                        </div>
                      </Modal.Body>
                      <Modal.Footer className="border-0 justify-content-center">
                        <Button variant="link" className="text-muted" onClick={() => setShowDownloadModal(false)}>
                          Cancel
                        </Button>
                      </Modal.Footer>
                    </Modal>
                    <button className="btn btn-outline-secondary" onClick={handleShare}>
                      <Share2 size={18} />
                    </button>
                    <button className="btn btn-outline-danger" onClick={() => setShowDeleteConfirmation(true)}>
                      <Trash size={18} />
                    </button>                    
                  </div>
                  </div>
                  {/* Keep the date display below the title */}
                  <p className="text-muted mb-0">{formatDate(selectedJournal.date)}</p>
                </div>

                <div className="journal-tabs border-bottom">
                  <ul className="nav nav-tabs">
                    <li className="nav-item">
                      <button
                        className={`nav-link ${activeTab === 'analysis' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analysis')}
                      >
                        <BarChart2 size={18} className="me-2" />
                        Analysis
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        className={`nav-link ${activeTab === 'entry' ? 'active' : ''}`}
                        onClick={() => setActiveTab('entry')}
                      >
                        <BookOpen size={18} className="me-2" />
                        Entry
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="journal-content p-4">
                  {activeTab === 'analysis' ? (
                    <div className="analysis-content">
                      <div className="mb-4">
                        <h4 className="mb-3">Entry Reflection</h4>
                        <div className="card">
                          <div className="card-body">
                            <p className="mb-0">
                              {searchQuery ? highlightText(selectedJournal.summary, searchQuery) : selectedJournal.summary}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="mb-3">Feelings</h4>
                        {/* Feelings/Moods highlighting */}
                        <div className="mood-tags">
                          {selectedJournal.moods && selectedJournal.moods.map((mood, index) => (
                            <span key={index} className="badge bg-light text-dark me-2 mb-2 py-2 px-3">
                              {getMoodEmoji(mood)} {searchQuery ? highlightText(mood, searchQuery) : mood}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="mb-3">Insights</h4>
                        <div className="card">
                          <div className="card-body">
                            {/* Insights highlighting */}
                            <ul className="list-group list-group-flush">
                              {selectedJournal.insights && selectedJournal.insights.map((insight, index) => (
                                <li key={index} className="list-group-item">
                                  {searchQuery ? highlightText(insight, searchQuery) : insight}
                                </li>
                              ))}
                            </ul>

                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="mb-3">Keywords</h4>
                        {/* Themes/Keywords highlighting */}
                        <div className="theme-tags">
                          {selectedJournal.themes && selectedJournal.themes.map((theme, index) => (
                            <span key={index} className="badge bg-secondary me-2 mb-2">
                              {searchQuery ? highlightText(theme, searchQuery) : theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    < div className="entry-content">
                      <div className="card">
                        <div className="card-body">
                          {selectedJournal.content && selectedJournal.content.split("\n\n").map((paragraph, index) => (
                            <div key={index} className={`message-bubble ${index % 2 === 0 ? 'user-message' : 'assistant-message'}`}>
                              <div className={`message-header ${index % 2 === 0 ? 'text-primary' : 'text-success'}`}>
                                {index % 2 === 0 ? 'You' : 'Assistant'}
                              </div>
                              <p>{searchQuery ? highlightText(paragraph, searchQuery) : paragraph}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  )}
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column justify-content-center align-items-center h-100 text-center p-4">
                <div className="empty-state-icon mb-4">📓</div>
                <h3>Select a journal entry</h3>
                <p className="text-muted">Choose an entry from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      </div >
    </>
  );
};

export default Summary;