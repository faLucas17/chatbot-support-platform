import React, { useState, useEffect } from 'react';
import { Routes, Route, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { getConversations, getConversation, setUsername } from './api';
import ConversationList from './components/ConversationList';
import ConversationDetail from './components/ConversationDetail';
import './App.css';

// Composant pour la page de détail d'une conversation (accès direct via URL Discord/Filament)
function ConversationPage({ conversations, onUpdateConversation }) {
  const { id } = useParams();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;

    // 1. Chercher dans la liste déjà chargée
    const existing = conversations.find(c => String(c.id) === String(id));
    if (existing) {
      setConversation(existing);
      setLoading(false);
      return;
    }

    // 2. Sinon charger depuis Django directement
    loadConversation();
  }, [id, conversations]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const res = await getConversation(id);
      setConversation(res.data);
      console.log(`✅ Conversation ${id} chargée depuis l'API`);
    } catch (err) {
      console.error('Erreur chargement conversation:', err);
      setConversation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (updatedConv) => {
    setConversation(updatedConv);
    if (onUpdateConversation) onUpdateConversation(updatedConv);
  };

  if (loading) {
    return (
      <div className="empty-state">
        <p>Chargement de la conversation...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="empty-state">
        <p>Conversation non trouvée</p>
        <button onClick={() => navigate('/')}>Retour à l'accueil</button>
      </div>
    );
  }

  return (
    <ConversationDetail
      conversation={conversation}
      onUpdate={handleUpdate}
    />
  );
}

function App() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [searchParams] = useSearchParams();

  // ✅ Lire username depuis l'URL EN PREMIER
  // Si username = "Anonyme" → on le stocke quand même pour que Django
  // retourne toutes les conversations escaladées (comportement voulu)
  useEffect(() => {
    const username = searchParams.get('username');
    const token = searchParams.get('token');

    if (username) {
      // ✅ On accepte TOUS les usernames y compris "Anonyme"
      setUsername(username);
      console.log(`✅ Username stocké: ${username}`);
    }

    if (token) {
      localStorage.setItem('sanctum_token', token);
      console.log(`✅ Token Sanctum stocké`);
    }
  }, [searchParams]);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Délai pour laisser le useEffect du username s'exécuter en premier
    const timer = setTimeout(() => {
      loadConversations();
    }, 150);

    const interval = setInterval(loadConversations, 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const loadConversations = async () => {
    try {
      const res = await getConversations();
      setConversations(res.data);
      console.log(`📋 ${res.data.length} conversations chargées`);
    } catch (err) {
      console.error('Erreur chargement conversations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    if (isMobile) setSidebarOpen(false);
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
        <Routes>
          <Route path="/" element={
            selectedConversation ? (
              <ConversationDetail
                conversation={selectedConversation}
                onUpdate={handleUpdateConversation}
              />
            ) : (
              <div className="empty-state">
                <p>Sélectionnez une conversation pour répondre</p>
              </div>
            )
          } />
          <Route path="/conversations/:id" element={
            <ConversationPage
              conversations={conversations}
              onUpdateConversation={handleUpdateConversation}
            />
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;