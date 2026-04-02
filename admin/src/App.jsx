import React, { useState, useEffect } from 'react';
import { getConversations } from './api';
import ConversationList from './components/ConversationList';
import ConversationDetail from './components/ConversationDetail';
import './App.css';

function App() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      const res = await getConversations();
      setConversations(res.data);
    } catch (err) {
      console.error('Erreur chargement conversations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleUpdateConversation = (updatedConv) => {
    setSelectedConversation(updatedConv);
    loadConversations();
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return (
      <div className={`login-container ${theme}`}>
        <div className="login-card">
          <h1>Support AI</h1>
          <p>Chargement des conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-container ${theme}`}>
      {isMobile && (
        <button className="menu-toggle" onClick={toggleSidebar}>
          {sidebarOpen ? '✕' : '☰'}
        </button>
      )}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Support AI</h2>
          <p>Agent</p>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
        <ConversationList 
          conversations={conversations}
          onSelect={handleSelectConversation} 
          selectedId={selectedConversation?.id} 
        />
      </div>
      <div className="main-content">
        {selectedConversation ? (
          <ConversationDetail 
            conversation={selectedConversation} 
            onUpdate={handleUpdateConversation} 
          />
        ) : (
          <div className="empty-state">
            <p>Sélectionnez une conversation pour répondre</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;