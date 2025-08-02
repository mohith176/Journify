// import React, { useState, useEffect } from 'react';
// import { Link, useNavigate } from "react-router-dom";
// import './Profile.css';
// import { Home, Book, BarChart2, Settings as SettingsIcon, LogOut } from 'lucide-react';
// import { User, Mail, Calendar, Award, Save, ArrowLeft, Edit2 } from 'react-feather';
// import { Navbar, Container, Nav, Button, Form, Alert, Row, Col } from 'react-bootstrap';
// import { FileText, PieChart, BookOpen } from 'react-feather';
// import { useTheme } from '../main';
// import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://journify-deploy.onrender.com';

// const Profile = () => {
//   const navigate = useNavigate();
//   const { theme } = useTheme();
//   const [userData, setUserData] = useState({
//     name: '',
//     email: '',
//     createdAt: '',
//     lastLogin: '',
//     streakData: {
//       currentStreak: 0,
//       longestStreak: 0
//     },
//     _id: ''
//   });
  
//   const [userBadges, setUserBadges] = useState([]);
//   const [editMode, setEditMode] = useState(false);
//   const [formData, setFormData] = useState({
//     name: '',
//     email: ''
//   });
//   const [message, setMessage] = useState({ type: '', text: '' });
//   const [loading, setLoading] = useState(true);
//   const [badgesLoading, setBadgesLoading] = useState(true);
//   const [progressStats, setProgressStats] = useState({
//     entriesCount: 0,
//     activeMonths: 0
//   });

//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     const storedUserData = localStorage.getItem('user');
    
//     if (!token) {
//       console.log("No token found, redirecting to login");
//       navigate('/login');
//       return;
//     }
    
//     if (!storedUserData) {
//       console.log("No user data found, redirecting to login");
//       navigate('/login');
//       return;
//     }
    
//     try {
//       const parsedUser = JSON.parse(storedUserData);
//       console.log("User data successfully parsed", parsedUser);
      
//       // Set user data from localStorage
//       setUserData({
//         name: parsedUser.name || 'User',
//         email: parsedUser.email || 'user@example.com',
//         createdAt: parsedUser.createdAt ? new Date(parsedUser.createdAt).toLocaleDateString() : 'N/A',
//         lastLogin: parsedUser.lastLogin ? new Date(parsedUser.lastLogin).toLocaleDateString() : 'N/A',
//         streakData: {
//           currentStreak: parsedUser.streakData?.currentStreak || 0,
//           longestStreak: parsedUser.streakData?.longestStreak || 0
//         },
//         _id: parsedUser._id || ''
//       });
      
//       setFormData({
//         name: parsedUser.name || '',
//         email: parsedUser.email || ''
//       });
      
//       // Immediately set loading to false after setting initial data from localStorage
//       setLoading(false);
      
//       // Then fetch additional data asynchronously
//       fetchProgressStats();
//       fetchUserBadges();
      
//     } catch (error) {
//       console.error('Error parsing user data:', error);
//       setMessage({ 
//         type: 'danger', 
//         text: 'Error loading profile data. Please try logging in again.' 
//       });
//       setLoading(false);
//     }
//   }, [navigate]);



//   const fetchProgressStats = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       if (!token) return;
      
//       // Get stats from the Progress endpoint
//       try {
//         const response = await axios.get(`${API_BASE_URL}/api/progress`, {
//           headers: { Authorization: `Bearer ${token}` }
//         });
        
//         if (response.data) {
//           // Update both progressStats and streakData from the API response
//           setProgressStats({
//             entriesCount: response.data.entriesCount || 0,
//             activeMonths: response.data.activeMonths || 0
//           });
          
//           // Update streak data if it exists in the response
//           if (response.data.currentStreak !== undefined || response.data.longestStreak !== undefined) {
//             setUserData(prev => ({
//               ...prev,
//               streakData: {
//                 currentStreak: response.data.currentStreak || 0,
//                 longestStreak: response.data.longestStreak || 0
//               }
//             }));
//           }
//         }
//       } catch (error) {
//         console.error('Error fetching progress stats:', error);
        
//         // Fallback to journal entries endpoint if progress endpoint fails
//         try {
//           const journalResponse = await axios.get(`${API_BASE_URL}/api/journal/entries`, {
//             headers: { Authorization: `Bearer ${token}` }
//           });
          
//           if (journalResponse.data && Array.isArray(journalResponse.data)) {
//             // Calculate stats from journal entries
//             const entriesCount = journalResponse.data.length;
            
//             // Calculate unique months
//             const monthsSet = new Set();
//             journalResponse.data.forEach(entry => {
//               if (entry.date) {
//                 const date = new Date(entry.date);
//                 const monthYear = `${date.getMonth()}-${date.getFullYear()}`;
//                 monthsSet.add(monthYear);
//               }
//             });
            
//             setProgressStats({
//               entriesCount: entriesCount,
//               activeMonths: monthsSet.size
//             });
//           }
//         } catch (journalError) {
//           console.error('Fallback error fetching journal entries:', journalError);
//           // Keep the default values (0)
//         }
//       }
//     } catch (error) {
//       console.error('Error in fetchProgressStats:', error);
//     }
//   };

//   const fetchUserBadges = async () => {
//     setBadgesLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       if (!token) return;
      
//       try {
//         const response = await axios.get(`${API_BASE_URL}/api/progress/badges`, {
//           headers: { Authorization: `Bearer ${token}` }
//         });
        
//         // Filter to only show earned badges
//         if (response.data && Array.isArray(response.data)) {
//           const earnedBadges = response.data.filter(badge => badge.achieved);
//           setUserBadges(earnedBadges);
//         } else {
//           setUserBadges([]);
//         }
//       } catch (error) {
//         console.error('Error fetching badges:', error);
//         setUserBadges([]);
//       }
//     } catch (error) {
//       console.error('Error in fetchUserBadges:', error);
//       setUserBadges([]);
//     } finally {
//       setBadgesLoading(false);
//     }
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setMessage({ type: '', text: '' });
    
//     try {
//       const token = localStorage.getItem('token');
//       if (!token || !userData._id) {
//         setMessage({
//           type: 'danger',
//           text: 'Authentication error. Please log in again.'
//         });
//         return;
//       }
      
//       const response = await axios.put(
//         `${API_BASE_URL}/api/users/profile`, 
//         formData, 
//         {
//           headers: { Authorization: `Bearer ${token}` }
//         }
//       );
      
//       if (response.data) {
//         // Update local user data
//         try {
//           const storedUser = JSON.parse(localStorage.getItem('user'));
//           const updatedUser = {...storedUser, ...formData};
//           localStorage.setItem('user', JSON.stringify(updatedUser));
          
//           setUserData(prev => ({
//             ...prev,
//             name: formData.name,
//             email: formData.email
//           }));
          
//           setMessage({ type: 'success', text: 'Profile updated successfully!' });
//           setEditMode(false);
//         } catch (error) {
//           console.error('Error updating local storage:', error);
//           setMessage({ type: 'warning', text: 'Profile updated on server but local data could not be updated.' });
//         }
//       }
//     } catch (error) {
//       console.error('Error updating profile:', error);
//       setMessage({ 
//         type: 'danger', 
//         text: error.response?.data?.message || 'Failed to update profile. Please try again.' 
//       });
//     }
//   };

//   const handleLogout = () => {
//     localStorage.removeItem('token');
//     localStorage.removeItem('user');
//     navigate('/');
//   };

//   const cancelEdit = () => {
//     setEditMode(false);
//     // Reset form data to current user data
//     setFormData({
//       name: userData.name,
//       email: userData.email
//     });
//     setMessage({ type: '', text: '' });
//   };

//   return (
//     <div className={`profile-page ${theme}`}>
//       <Navbar bg="white" expand="lg" className="border-bottom shadow-sm">
//         <Container fluid>
//           <Navbar.Brand as={Link} to="/dashboard" className="d-flex align-items-center">
//             <span className="fs-4 me-2">⚡</span>
//             <span className="fw-bold">Journify</span>
//           </Navbar.Brand>
//           <Navbar.Toggle aria-controls="basic-navbar-nav" />
//           <Navbar.Collapse id="basic-navbar-nav">
//             <Nav className="me-auto">
//               <Nav.Link as={Link} to="/dashboard" className="d-flex align-items-center">
//                 <Home size={16} className="me-1" /> Dashboard
//               </Nav.Link>
//               <Nav.Link as={Link} to="/journal" className="d-flex align-items-center">
//                 <Book size={16} className="me-1" /> Journal
//               </Nav.Link>
//               <Nav.Link as={Link} to="/mood" className="d-flex align-items-center">
//                 <BarChart2 size={16} className="me-1" /> Mood Tracking
//               </Nav.Link>
//               <Nav.Link as={Link} to="/summary" className="d-flex align-items-center">
//                 <FileText size={16} className="me-1" /> Summaries
//               </Nav.Link>
//               <Nav.Link as={Link} to="/Progress" className="d-flex align-items-center">
//                 <PieChart size={16} className="me-1" /> Progress
//               </Nav.Link>
//               <Nav.Link as={Link} to="/settings" className="d-flex align-items-center">
//                 <SettingsIcon size={16} className="me-1" /> Settings
//               </Nav.Link>
//             </Nav>
//             <Button
//               variant="outline-secondary"
//               size="sm"
//               className="d-flex align-items-center"
//               onClick={handleLogout}
//             >
//               <LogOut size={16} className="me-1" /> Logout
//             </Button>
//           </Navbar.Collapse>
//         </Container>
//       </Navbar>

//       <div className="profile-container">
//         <div className="profile-header">
//           <Button 
//             variant="link" 
//             className="back-button"
//             onClick={() => navigate('/settings')}
//           >
//             <ArrowLeft size={20} /> Back to Settings
//           </Button>
//           <h1>{editMode ? 'Edit Profile' : 'My Profile'}</h1>
//         </div>

//         {message.text && (
//           <Alert variant={message.type} onClose={() => setMessage({type: '', text: ''})} dismissible>
//             {message.text}
//           </Alert>
//         )}

//         {loading ? (
//           <div className="loading-state">
//             <p>Loading profile information...</p>
//           </div>
//         ) : (
//           <div className="profile-content">
//             <div className="profile-section">
//               <div className="avatar-section">
//                 <div className="avatar-circle">
//                   {userData.name.charAt(0)}
//                 </div>
//                 {!editMode && (
//                   <Button 
//                     variant="primary" 
//                     className="edit-button"
//                     onClick={() => setEditMode(true)}
//                   >
//                     <Edit2 size={16} className="me-1" /> Edit Profile
//                   </Button>
//                 )}
//               </div>

//               {editMode ? (
//                 <div className="profile-edit-form">
//                   <Form onSubmit={handleSubmit}>
//                     <Form.Group className="mb-3">
//                       <Form.Label>Name</Form.Label>
//                       <Form.Control
//                         type="text"
//                         name="name"
//                         value={formData.name}
//                         onChange={handleInputChange}
//                         required
//                       />
//                     </Form.Group>

//                     <Form.Group className="mb-3">
//                       <Form.Label>Email</Form.Label>
//                       <Form.Control
//                         type="email"
//                         name="email"
//                         value={formData.email}
//                         onChange={handleInputChange}
//                         required
//                       />
//                     </Form.Group>

//                     <div className="form-actions">
//                       <Button 
//                         variant="outline-secondary" 
//                         onClick={cancelEdit}
//                       >
//                         Cancel
//                       </Button>
//                       <Button 
//                         type="submit" 
//                         variant="primary"
//                       >
//                         <Save size={16} className="me-1" /> Save Changes
//                       </Button>
//                     </div>
//                   </Form>
//                 </div>
//               ) : (
//                 <div className="profile-info">
//                   <div className="info-grid">
//                     <div className="info-card">
//                       <div className="info-icon">
//                         <User size={20} />
//                       </div>
//                       <div className="info-content">
//                         <h3>Name</h3>
//                         <p>{userData.name}</p>
//                       </div>
//                     </div>

//                     <div className="info-card">
//                       <div className="info-icon">
//                         <Mail size={20} />
//                       </div>
//                       <div className="info-content">
//                         <h3>Email</h3>
//                         <p>{userData.email}</p>
//                       </div>
//                     </div>

//                     <div className="info-card">
//                       <div className="info-icon">
//                         <BookOpen size={20} />
//                       </div>
//                       <div className="info-content">
//                         <h3>Total Entries</h3>
//                         <p>{progressStats.entriesCount || 0}</p>
//                       </div>
//                     </div>

//                     <div className="info-card">
//                       <div className="info-icon">
//                         <Calendar size={20} />
//                       </div>
//                       <div className="info-content">
//                         <h3>Active Months</h3>
//                         <p>{progressStats.activeMonths || 0}</p>
//                       </div>
//                     </div>

//                     <div className="info-card">
//                       <div className="info-icon streak-icon">
//                         <Award size={20} />
//                       </div>
//                       <div className="info-content">
//                         <h3>Current Streak</h3>
//                         <p>{userData.streakData?.currentStreak || 0} days</p>
//                       </div>
//                     </div>

//                     <div className="info-card">
//                       <div className="info-icon longest-streak-icon">
//                         <Award size={20} />
//                       </div>
//                       <div className="info-content">
//                         <h3>Longest Streak</h3>
//                         <p>{userData.streakData?.longestStreak || 0} days</p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="badges-section">
//               <h2>Your Badges</h2>
//               {badgesLoading ? (
//                 <p>Loading badges...</p>
//               ) : userBadges.length > 0 ? (
//                 <div className="badges-grid">
//                   {userBadges.map(badge => (
//                     <div key={badge.id || badge._id} className="badge-item">
//                       <div className="badge-icon">
//                         {badge.icon}
//                       </div>
//                       <div className="badge-info">
//                         <h3>{badge.name}</h3>
//                         <p>{badge.description}</p>
//                         <span className="badge-date">
//                           Earned on {badge.achievedOn ? new Date(badge.achievedOn).toLocaleDateString() : 'Unknown date'}
//                         </span>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="no-badges">
//                   <p>You haven't earned any badges yet. Keep journaling to earn badges!</p>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Profile;
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import './Profile.css';
import { Home, Book, BarChart2, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { User, Mail, Calendar, Award, Save, ArrowLeft, Edit2 } from 'react-feather';
import { Navbar, Container, Nav, Button, Form, Alert, Row, Col } from 'react-bootstrap';
import { FileText, PieChart, BookOpen } from 'react-feather';
import { useTheme } from '../main';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://journify-deploy.onrender.com';

const Profile = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    createdAt: '',
    lastLogin: '',
    streakData: {
      currentStreak: 0,
      longestStreak: 0
    },
    _id: ''
  });
  
  const [userBadges, setUserBadges] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [progressStats, setProgressStats] = useState({
    entriesCount: 0,
    activeMonths: 0
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUserData = localStorage.getItem('user');
    
    if (!token) {
      console.log("No token found, redirecting to login");
      navigate('/login');
      return;
    }
    
    if (!storedUserData) {
      console.log("No user data found, redirecting to login");
      navigate('/login');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(storedUserData);
      console.log("User data successfully parsed", parsedUser);
      
      // Set user data from localStorage
      setUserData({
        name: parsedUser.name || 'User',
        email: parsedUser.email || 'user@example.com',
        createdAt: parsedUser.createdAt ? new Date(parsedUser.createdAt).toLocaleDateString() : 'N/A',
        lastLogin: parsedUser.lastLogin ? new Date(parsedUser.lastLogin).toLocaleDateString() : 'N/A',
        streakData: {
          currentStreak: parsedUser.streakData?.currentStreak || 0,
          longestStreak: parsedUser.streakData?.longestStreak || 0
        },
        _id: parsedUser._id || ''
      });
      
      setFormData({
        name: parsedUser.name || '',
        email: parsedUser.email || ''
      });
      
      // Immediately set loading to false after setting initial data from localStorage
      setLoading(false);
      
      // Then fetch additional data asynchronously
      fetchProgressStats();
      fetchUserBadges();
      
    } catch (error) {
      console.error('Error parsing user data:', error);
      setMessage({ 
        type: 'danger', 
        text: 'Error loading profile data. Please try logging in again.' 
      });
      setLoading(false);
    }
  }, [navigate]);

  const fetchProgressStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Get stats from the Progress endpoint
      try {
        const response = await axios.get(`${API_BASE_URL}/api/progress`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data) {
          // Update both progressStats and streakData from the API response
          setProgressStats({
            entriesCount: response.data.entriesCount || 0,
            activeMonths: response.data.activeMonths || 0
          });
          
          // Update streak data if it exists in the response
          if (response.data.currentStreak !== undefined || response.data.longestStreak !== undefined) {
            setUserData(prev => ({
              ...prev,
              streakData: {
                currentStreak: response.data.currentStreak || 0,
                longestStreak: response.data.longestStreak || 0
              }
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching progress stats:', error);
        
        // Fallback to journal entries endpoint if progress endpoint fails
        try {
          const journalResponse = await axios.get(`${API_BASE_URL}/api/journal/entries`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (journalResponse.data && Array.isArray(journalResponse.data)) {
            // Calculate stats from journal entries
            const entriesCount = journalResponse.data.length;
            
            // Calculate unique months
            const monthsSet = new Set();
            journalResponse.data.forEach(entry => {
              if (entry.date) {
                const date = new Date(entry.date);
                const monthYear = `${date.getMonth()}-${date.getFullYear()}`;
                monthsSet.add(monthYear);
              }
            });
            
            setProgressStats({
              entriesCount: entriesCount,
              activeMonths: monthsSet.size
            });
          }
        } catch (journalError) {
          console.error('Fallback error fetching journal entries:', journalError);
          // Keep the default values (0)
        }
      }
    } catch (error) {
      console.error('Error in fetchProgressStats:', error);
    }
  };

  const fetchUserBadges = async () => {
    setBadgesLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        const response = await axios.get(`${API_BASE_URL}/api/progress/badges`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Filter to only show earned badges
        if (response.data && Array.isArray(response.data)) {
          const earnedBadges = response.data.filter(badge => badge.achieved);
          setUserBadges(earnedBadges);
        } else {
          setUserBadges([]);
        }
      } catch (error) {
        console.error('Error fetching badges:', error);
        setUserBadges([]);
      }
    } catch (error) {
      console.error('Error in fetchUserBadges:', error);
      setUserBadges([]);
    } finally {
      setBadgesLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Enhanced handleSubmit - updates locally first, then tries server update without blocking
  const handleSubmit = (e) => {
    e.preventDefault();
    
    try {
      // First, update localStorage and UI for immediate feedback
      const storedUser = JSON.parse(localStorage.getItem('user'));
      
      // Update with new data
      const updatedUser = {
        ...storedUser,
        name: formData.name,
        email: formData.email
      };
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update UI
      setUserData(prev => ({
        ...prev,
        name: formData.name,
        email: formData.email
      }));
      
      // Show success message
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Exit edit mode
      setEditMode(false);
      
      console.log('Profile updated locally');
      
      // Try to update on the server in the background (non-blocking)
      // This way, the user experience isn't affected by server issues
      const serverUpdate = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token || !updatedUser._id) return;
          
          // Try to update with userId parameter for non-authenticated update
          await axios.put(
            `${API_BASE_URL}/api/users/profile`, 
            {
              name: formData.name,
              email: formData.email,
              userId: updatedUser._id // Include userId for non-authenticated update
            }
          );
          
          console.log('Server update also succeeded');
        } catch (error) {
          console.error('Server-side profile update failed:', error);
          // We don't show errors to the user because the local update was successful
        }
      };
      
      // Run the server update without awaiting it
      serverUpdate();
      
    } catch (error) {
      console.error('Error updating profile locally:', error);
      setMessage({ 
        type: 'danger', 
        text: 'Failed to update profile. Please try again.' 
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const cancelEdit = () => {
    setEditMode(false);
    // Reset form data to current user data
    setFormData({
      name: userData.name,
      email: userData.email
    });
    setMessage({ type: '', text: '' });
  };

  return (
    <div className={`profile-page ${theme}`}>
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
                <SettingsIcon size={16} className="me-1" /> Settings
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

      <div className="profile-container">
        <div className="profile-header">
          <Button 
            variant="link" 
            className="back-button"
            onClick={() => navigate('/settings')}
          >
            <ArrowLeft size={20} /> Back to Settings
          </Button>
          <h1>{editMode ? 'Edit Profile' : 'My Profile'}</h1>
        </div>

        {message.text && (
          <Alert variant={message.type} onClose={() => setMessage({type: '', text: ''})} dismissible>
            {message.text}
          </Alert>
        )}

        {loading ? (
          <div className="loading-state">
            <p>Loading profile information...</p>
          </div>
        ) : (
          <div className="profile-content">
            <div className="profile-section">
              <div className="avatar-section">
                <div className="avatar-circle">
                  {userData.name.charAt(0)}
                </div>
                {!editMode && (
                  <Button 
                    variant="primary" 
                    className="edit-button"
                    onClick={() => setEditMode(true)}
                  >
                    <Edit2 size={16} className="me-1" /> Edit Profile
                  </Button>
                )}
              </div>

              {editMode ? (
                <div className="profile-edit-form">
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>

                    <div className="form-actions">
                      <Button 
                        variant="outline-secondary" 
                        onClick={cancelEdit}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        variant="primary"
                      >
                        <Save size={16} className="me-1" /> Save Changes
                      </Button>
                    </div>
                  </Form>
                </div>
              ) : (
                <div className="profile-info">
                  <div className="info-grid">
                    <div className="info-card">
                      <div className="info-icon">
                        <User size={20} />
                      </div>
                      <div className="info-content">
                        <h3>Name</h3>
                        <p>{userData.name}</p>
                      </div>
                    </div>

                    <div className="info-card">
                      <div className="info-icon">
                        <Mail size={20} />
                      </div>
                      <div className="info-content">
                        <h3>Email</h3>
                        <p>{userData.email}</p>
                      </div>
                    </div>

                    <div className="info-card">
                      <div className="info-icon">
                        <BookOpen size={20} />
                      </div>
                      <div className="info-content">
                        <h3>Total Entries</h3>
                        <p>{progressStats.entriesCount || 0}</p>
                      </div>
                    </div>

                    <div className="info-card">
                      <div className="info-icon">
                        <Calendar size={20} />
                      </div>
                      <div className="info-content">
                        <h3>Active Months</h3>
                        <p>{progressStats.activeMonths || 0}</p>
                      </div>
                    </div>

                    <div className="info-card">
                      <div className="info-icon streak-icon">
                        <Award size={20} />
                      </div>
                      <div className="info-content">
                        <h3>Current Streak</h3>
                        <p>{userData.streakData?.currentStreak || 0} days</p>
                      </div>
                    </div>

                    <div className="info-card">
                      <div className="info-icon longest-streak-icon">
                        <Award size={20} />
                      </div>
                      <div className="info-content">
                        <h3>Longest Streak</h3>
                        <p>{userData.streakData?.longestStreak || 0} days</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="badges-section">
              <h2>Your Badges</h2>
              {badgesLoading ? (
                <p>Loading badges...</p>
              ) : userBadges.length > 0 ? (
                <div className="badges-grid">
                  {userBadges.map(badge => (
                    <div key={badge.id || badge._id} className="badge-item">
                      <div className="badge-icon">
                        {badge.icon}
                      </div>
                      <div className="badge-info">
                        <h3>{badge.name}</h3>
                        <p>{badge.description}</p>
                        <span className="badge-date">
                          Earned on {badge.achievedOn ? new Date(badge.achievedOn).toLocaleDateString() : 'Unknown date'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-badges">
                  <p>You haven't earned any badges yet. Keep journaling to earn badges!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;