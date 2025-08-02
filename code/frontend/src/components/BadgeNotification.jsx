// NEW FILE
import React, { useState, useEffect } from 'react';
import './BadgeNotification.css';

const BadgeNotification = ({ badge, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(), 500); // Wait for fade out animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`badge-notification ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="notification-content">
        <div className={`notification-icon rarity-${badge.rarity}`}>
          {badge.icon || "⭐"}
        </div>
        <div className="notification-text">
          <h4>Badge Unlocked!</h4>
          <p className="notification-badge-name">{badge.name}</p>
          <p className="notification-badge-description">{badge.description}</p>
        </div>
        <button className="close-notification" onClick={() => setIsVisible(false)}>×</button>
      </div>
    </div>
  );
};

export default BadgeNotification;