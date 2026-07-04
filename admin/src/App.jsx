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
// PAGE DE LOGIN — Design EasyEvent identique à l'image
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

  // SVG icons pour les inputs
  const EmailIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );

  const LockIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );

  const EyeIcon = ({ open }) => open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  // SVG logos sociaux réels
  const GoogleLogo = () => (
    <svg width="22" height="22" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );

  const LinkedInLogo = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#0077B5">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );

  const GitHubLogo = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={isDark ? '#F5F0E8' : '#333'}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );

  const inputStyle = {
    width: '100%',
    padding: '13px 16px 13px 44px',
    border: `1.5px solid ${isDark ? '#3A4A42' : '#E0E0E0'}`,
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    color: isDark ? '#F5F0E8' : '#333',
    background: isDark ? '#2A3A32' : 'white',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const socialBtnStyle = {
    flex: 1,
    padding: '10px 0',
    border: `1.5px solid ${isDark ? '#3A4A42' : '#E0E0E0'}`,
    borderRadius: '8px',
    background: isDark ? '#2A3A32' : 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark ? '#1A2420' : '#F7F3EE',
      display: 'flex',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Décoration bulles fond */}
      <div style={{
        position: 'absolute', top: '60px', right: '420px',
        width: '12px', height: '12px', borderRadius: '50%',
        background: '#15AD84', opacity: 0.5,
      }} />
      <div style={{
        position: 'absolute', top: '30px', right: '60px',
        width: '10px', height: '10px', borderRadius: '50%',
        background: '#FF9900', opacity: 0.5,
      }} />

      {/* ========== COLONNE GAUCHE ========== */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        maxWidth: '55%',
      }}>
        <h1 style={{
          fontSize: '42px',
          fontWeight: '800',
          color: isDark ? '#F5F0E8' : '#1A1A1A',
          margin: '0 0 20px 0',
          lineHeight: '1.2',
        }}>
          Bienvenue sur{' '}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
          }}>
            <span style={{
              background: '#FF9900',
              color: 'white',
              padding: '2px 10px',
              borderRadius: '6px',
              fontWeight: '800',
            }}>Easy</span>
            <span style={{
              color: '#15AD84',
              fontWeight: '800',
            }}>Event</span>
          </span>
          !
        </h1>

        <p style={{
          fontSize: '16px',
          color: isDark ? '#9AB3A5' : '#555',
          margin: '0 0 24px 0',
          lineHeight: '1.6',
          maxWidth: '420px',
        }}>
          Gérez tous vos événements en quelques clics.
        </p>

        <p style={{
          fontSize: '16px',
          color: isDark ? '#9AB3A5' : '#555',
          margin: '0 0 48px 0',
          lineHeight: '1.8',
          maxWidth: '420px',
        }}>
          Parcourez l'univers EasyEvent, gérez vos places et participez à
          des événements exclusifs, directement depuis votre espace
          personnel.
        </p>

        {/* Courbe décorative */}
        <svg width="300" height="40" viewBox="0 0 300 40">
          <path
            d="M 0 30 Q 75 5 150 20 Q 225 35 300 15"
            fill="none"
            stroke="url(#curveGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#15AD84" />
              <stop offset="100%" stopColor="#FF9900" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ========== COLONNE DROITE — FORMULAIRE ========== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        minWidth: '420px',
        maxWidth: '480px',
      }}>
        <div style={{
          width: '100%',
          background: isDark ? '#243028' : 'white',
          borderRadius: '20px',
          padding: '40px 36px',
          boxShadow: isDark ? '0 4px 32px rgba(0,0,0,0.4)' : '0 4px 32px rgba(0,0,0,0.08)',
        }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              marginBottom: '14px',
            }}>
              <span style={{
                background: '#FF9900',
                color: 'white',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '18px',
                fontWeight: '800',
              }}>Easy</span>
              <span style={{
                color: '#15AD84',
                fontSize: '18px',
                fontWeight: '800',
              }}>Event</span>
            </div>
          </div>

          {/* Titre */}
          <h2 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: isDark ? '#F5F0E8' : '#1A1A1A',
            margin: '0 0 6px 0',
            textAlign: 'center',
          }}>Connexion</h2>
          <p style={{
            fontSize: '13px',
            color: isDark ? '#9AB3A5' : '#888',
            textAlign: 'center',
            margin: '0 0 28px 0',
          }}>Connectez-vous pour accéder à votre espace</p>

          {/* Formulaire */}
          <form onSubmit={handleSubmit}>

            {/* Email */}
            <div style={{ marginBottom: '14px', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)', pointerEvents: 'none',
              }}>
                <EmailIcon />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Entrez votre email..."
                required
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = '#15AD84';
                  e.target.style.boxShadow = '0 0 0 3px rgba(21,173,132,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDark ? '#3A4A42' : '#E0E0E0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '10px', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)', pointerEvents: 'none',
              }}>
                <LockIcon />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe..."
                required
                style={{ ...inputStyle, paddingRight: '44px' }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#15AD84';
                  e.target.style.boxShadow = '0 0 0 3px rgba(21,173,132,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDark ? '#3A4A42' : '#E0E0E0';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: '4px',
                }}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            {/* Mot de passe oublié */}
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <a href="#" style={{
                fontSize: '13px',
                color: '#FF9900',
                textDecoration: 'none',
                fontWeight: '500',
              }}>Mot de passe oublié ?</a>
            </div>

            {/* Erreur */}
            {error && (
              <div style={{
                background: isDark ? '#3A1A1A' : '#FFF0F0',
                border: `1px solid ${isDark ? '#5A2A2A' : '#FFCDD2'}`,
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#FF6B6B',
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            {/* Bouton Se connecter */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? '#ccc' : '#15AD84',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s, transform 0.1s',
                letterSpacing: '0.3px',
              }}
              onMouseEnter={(e) => { if (!loading) e.target.style.opacity = '0.92'; }}
              onMouseLeave={(e) => { if (!loading) e.target.style.opacity = '1'; }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            {/* Divider OU */}
            <div style={{
              display: 'flex', alignItems: 'center',
              margin: '20px 0', gap: '12px',
            }}>
              <div style={{ flex: 1, height: '1px', background: isDark ? '#3A4A42' : '#E0E0E0' }} />
              <span style={{ fontSize: '13px', color: isDark ? '#9AB3A5' : '#999', fontWeight: '500' }}>OU</span>
              <div style={{ flex: 1, height: '1px', background: isDark ? '#3A4A42' : '#E0E0E0' }} />
            </div>

            {/* Boutons sociaux — vrais logos SVG */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button type="button" style={socialBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#15AD84'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? '#3A4A42' : '#E0E0E0'; }}
              >
                <GoogleLogo />
              </button>
              <button type="button" style={socialBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#15AD84'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? '#3A4A42' : '#E0E0E0'; }}
              >
                <LinkedInLogo />
              </button>
              <button type="button" style={socialBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#15AD84'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? '#3A4A42' : '#E0E0E0'; }}
              >
                <GitHubLogo />
              </button>
            </div>

            {/* Créer un compte */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '14px', color: isDark ? '#9AB3A5' : '#666' }}>
                Vous n'avez pas de compte ?{' '}
                <a href="#" style={{
                  color: '#FF9900',
                  textDecoration: 'none',
                  fontWeight: '600',
                }}>Créer un compte</a>
              </span>
            </div>

          </form>
        </div>
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