import React, { useState, useEffect } from 'react';
import { Routes, Route, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { getConversations, getConversation, setUsername } from './api';
import ConversationList from './components/ConversationList';
import ConversationDetail from './components/ConversationDetail';
import './App.css';

// ============================================================
// CREDENTIALS ADMIN (à changer en variables d'environnement en prod)
// ============================================================
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'passer@12';

// ============================================================
// PAGE DE LOGIN — Design EasyEvent (style premium)
// ============================================================
function LoginPage({ onLogin, theme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isDark = theme === 'dark';

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        localStorage.setItem('support_admin_logged', 'true');
        onLogin();
      } else {
        setError('Email ou mot de passe incorrect.');
      }
      setLoading(false);
    }, 600);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: isDark ? '#1A2420' : '#F5F0E8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px',
    },
    card: {
      background: isDark ? '#1E2A24' : 'white',
      borderRadius: '24px',
      padding: '48px 40px',
      width: '100%',
      maxWidth: '420px',
      boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.4)' : '0 20px 60px rgba(0,0,0,0.08)',
    },
    logoContainer: {
      textAlign: 'center',
      marginBottom: '32px',
    },
    logoWrapper: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '64px',
      height: '64px',
      borderRadius: '18px',
      background: 'linear-gradient(135deg, #15AD84 0%, #FF9900 100%)',
      marginBottom: '16px',
    },
    logoText: {
      fontSize: '24px',
      fontWeight: '800',
      color: 'white',
      letterSpacing: '-1px',
    },
    title: {
      margin: '0 0 4px 0',
      fontSize: '24px',
      fontWeight: '700',
      color: isDark ? '#F5F0E8' : '#1A1A1A',
    },
    subtitle: {
      margin: 0,
      fontSize: '14px',
      color: '#9AB3A5',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      color: isDark ? '#F5F0E8' : '#2D3E35',
      marginBottom: '8px',
    },
    inputWrapper: {
      position: 'relative',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: `1.5px solid ${isDark ? '#3A4A42' : '#E8E0D5'}`,
      borderRadius: '12px',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
      color: isDark ? '#F5F0E8' : '#1A1A1A',
      background: isDark ? '#2A3A32' : '#F5F0E8',
      transition: 'border-color 0.2s',
    },
    inputFocus: {
      borderColor: '#15AD84',
    },
    passwordToggle: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '18px',
      color: isDark ? '#9AB3A5' : '#999',
      padding: '4px',
    },
    errorBox: {
      background: isDark ? '#3A1A1A' : '#FFF0F0',
      border: `1px solid ${isDark ? '#5A2A2A' : '#FFCDD2'}`,
      borderRadius: '10px',
      padding: '12px 16px',
      marginBottom: '20px',
      fontSize: '13px',
      color: '#FF6B6B',
    },
    button: {
      width: '100%',
      padding: '14px',
      background: loading ? '#ccc' : 'linear-gradient(135deg, #15AD84 0%, #FF9900 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: '700',
      cursor: loading ? 'not-allowed' : 'pointer',
      transition: 'opacity 0.2s',
    },
    footer: {
      textAlign: 'center',
      marginTop: '24px',
      fontSize: '12px',
      color: '#9AB3A5',
    },
    inputGroup: {
      marginBottom: '20px',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <div style={styles.logoWrapper}>
            <span style={styles.logoText}>EE</span>
          </div>
          <h1 style={styles.title}>Support Admin</h1>
          <p style={styles.subtitle}>Connectez-vous pour accéder aux conversations</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@admin.com"
              required
              style={styles.input}
              onFocus={(e) => e.target.style.borderColor = '#15AD84'}
              onBlur={(e) => e.target.style.borderColor = isDark ? '#3A4A42' : '#E8E0D5'}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Mot de passe</label>
            <div style={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={styles.input}
                onFocus={(e) => e.target.style.borderColor = '#15AD84'}
                onBlur={(e) => e.target.style.borderColor = isDark ? '#3A4A42' : '#E8E0D5'}
              />
              <button
                type="button"
                style={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p style={styles.footer}>
          EasyEvent Support Platform © 2026
        </p>
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT ConversationPage
// ============================================================
function ConversationPage({ conversations, onUpdateConversation }) {
  const { id } = useParams();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    const existing = conversations.find(c => String(c.id) === String(id));
    if (existing) {
      setConversation(existing);
      setLoading(false);
      return;
    }
    loadConversation();
  }, [id, conversations]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const res = await getConversation(id);
      setConversation(res.data);
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

  if (loading) return <div className="empty-state"><p>Chargement de la conversation...</p></div>;
  if (!conversation) return (
    <div className="empty-state">
      <p>Conversation non trouvée</p>
      <button onClick={() => navigate('/')}>Retour à l'accueil</button>
    </div>
  );

  return <ConversationDetail conversation={conversation} onUpdate={handleUpdate} />;
}

// ============================================================
// APP PRINCIPALE
// ============================================================
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('support_admin_logged') === 'true';
  });
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [searchParams] = useSearchParams();

  // Lire username depuis l'URL (Discord/Filament)
  useEffect(() => {
    const username = searchParams.get('username');
    const token = searchParams.get('token');
    if (username) {
      setUsername(username);
      console.log(`✅ Username stocké: ${username}`);
    }
    if (token) {
      localStorage.setItem('sanctum_token', token);
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
    if (!isLoggedIn) return;
    const timer = setTimeout(() => { loadConversations(); }, 150);
    const interval = setInterval(loadConversations, 5000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [isLoggedIn]);

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

  const handleLogin = () => setIsLoggedIn(true);

  const handleLogout = () => {
    localStorage.removeItem('support_admin_logged');
    localStorage.removeItem('support_username');
    setIsLoggedIn(false);
    setConversations([]);
  };

  // ✅ Si pas connecté → page de login
  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} theme={theme} />;
  }

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
        <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '✕' : '☰'}
        </button>
      )}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Support AI</h2>
          <p>Agent</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              onClick={handleLogout}
              title="Se déconnecter"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: 'white',
                borderRadius: '8px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
        <ConversationList
          conversations={conversations}
          onSelect={(conv) => { setSelectedConversation(conv); if (isMobile) setSidebarOpen(false); }}
          selectedId={selectedConversation?.id}
        />
      </div>
      <div className="main-content">
        <Routes>
          <Route path="/" element={
            selectedConversation ? (
              <ConversationDetail
                conversation={selectedConversation}
                onUpdate={(updatedConv) => { setSelectedConversation(updatedConv); loadConversations(); }}
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
              onUpdateConversation={(updatedConv) => { setSelectedConversation(updatedConv); loadConversations(); }}
            />
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;