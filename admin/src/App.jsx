import React, { useState, useEffect } from 'react';
import { Routes, Route, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { getConversations, getConversation, setUsername } from './api';
import ConversationList from './components/ConversationList';
import ConversationDetail from './components/ConversationDetail';
import './App.css';

// ============================================================
// CREDENTIALS ADMIN - via variables d'environnement
// ============================================================
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@admin.com';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'passer@12';

// ============================================================
// PAGE DE LOGIN — Design EasyEvent avec "Se souvenir de moi"
// ============================================================
function LoginPage({ onLogin, theme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDark = theme === 'dark';

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        localStorage.setItem('support_admin_logged', 'true');
        if (rememberMe) {
          localStorage.setItem('support_remember_email', email);
        } else {
          localStorage.removeItem('support_remember_email');
        }
        onLogin();
      } else {
        setError('Email ou mot de passe incorrect.');
      }
      setLoading(false);
    }, 600);
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem('support_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

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

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15AD84" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
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

  return (
    <div style={{
      width: '100vw',
      height: isMobile ? 'auto' : '100vh',
      minHeight: '100vh',
      background: isDark ? '#1A2420' : '#F7F3EE',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: isMobile ? 'auto' : 'hidden',
      boxSizing: 'border-box',
    }}>
      {!isMobile && (
        <>
          <div style={{ position: 'absolute', top: '60px', right: '460px', width: '12px', height: '12px', borderRadius: '50%', background: '#15AD84', opacity: 0.5 }} />
          <div style={{ position: 'absolute', top: '30px', right: '60px', width: '10px', height: '10px', borderRadius: '50%', background: '#FF9900', opacity: 0.5 }} />
        </>
      )}

      <div style={{
        flex: isMobile ? 'none' : '1 1 0%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: isMobile ? 'center' : 'flex-start',
        padding: isMobile ? '36px 24px 20px' : '40px 30px 40px 80px',
        overflow: 'hidden',
        boxSizing: 'border-box',
        textAlign: isMobile ? 'center' : 'left',
      }}>
        <h1 style={{ fontSize: isMobile ? 'clamp(24px, 6.5vw, 32px)' : 'clamp(30px, 3.2vw, 44px)', fontWeight: '900', color: isDark ? '#F5F0E8' : '#1A1A1A', margin: '0 0 18px 0', lineHeight: '1.25', maxWidth: '100%' }}>
          Espace Support Admin AI {' '}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle' }}>
            <span style={{ background: '#FF9900', color: 'white', padding: '2px 10px', borderRadius: '6px', fontWeight: '800' }}>Easy</span>
            <span style={{ color: '#15AD84', fontWeight: '800' }}>Event</span>
          </span>
          !
        </h1>
        <p style={{ fontSize: isMobile ? '15px' : '19px', fontWeight: '700', color: isDark ? '#F5F0E8' : '#1A1A1A', margin: '0 0 16px 0', lineHeight: '1.5', maxWidth: isMobile ? '100%' : '620px' }}>
          Votre espace d'administration intelligent, propulsé par l'IA.
        </p>
        <p style={{ fontSize: isMobile ? '14px' : '18px', color: isDark ? '#9AB3A5' : '#555', margin: '0 0 28px 0', lineHeight: '1.7', maxWidth: isMobile ? '100%' : '620px' }}>
          Suivez les conversations, répondez à vos utilisateurs et pilotez tout votre support client depuis une seule interface pensée pour les administrateurs.
        </p>
        <div style={{ position: 'relative', width: isMobile ? '100%' : '340px', maxWidth: '100%', textAlign: 'center', paddingTop: '14px', paddingBottom: '14px' }}>
          <div style={{ position: 'absolute', top: '0px', left: '50%', transform: 'translateX(-50%)', width: '14px', height: '14px', borderRadius: '50%', background: '#15AD84' }} />
          <svg width="260" height="34" viewBox="0 0 300 40" style={{ display: 'inline-block' }}>
            <path d="M 0 30 Q 75 5 150 20 Q 225 35 300 15" fill="none" stroke="url(#curveGrad)" strokeWidth="6" strokeLinecap="round" />
            <defs>
              <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#15AD84" />
                <stop offset="100%" stopColor="#FF9900" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: 'absolute', bottom: '0px', left: isMobile ? '20%' : '10px', width: '12px', height: '12px', borderRadius: '50%', background: '#FF9900' }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '10px 20px 32px' : '24px 40px', width: '100%', maxWidth: isMobile ? '100%' : '520px', minWidth: 0, flexShrink: 1, marginRight: isMobile ? 0 : '10px', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', background: isDark ? '#243028' : 'white', borderRadius: '20px', padding: isMobile ? '24px 22px' : '32px 36px', boxShadow: isDark ? '0 4px 32px rgba(0,0,0,0.4)' : '0 4px 32px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginBottom: '8px' }}>
              <span style={{ background: '#FF9900', color: 'white', padding: '3px 10px', borderRadius: '6px', fontSize: '18px', fontWeight: '800' }}>Easy</span>
              <span style={{ color: '#15AD84', fontSize: '18px', fontWeight: '800' }}>Event</span>
            </div>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: isDark ? '#F5F0E8' : '#1A1A1A', margin: '0 0 4px 0', textAlign: 'center' }}>Support Admin AI</h2>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: isDark ? '#F5F0E8' : '#1A1A1A', margin: '0 0 4px 0', textAlign: 'center' }}>Connexion</h2>
          <p style={{ fontSize: '13px', color: isDark ? '#9AB3A5' : '#888', textAlign: 'center', margin: '0 0 20px 0' }}>Connectez-vous pour accéder à votre espace</p>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '10px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><EmailIcon /></div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Entrez votre email..." required style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#15AD84'; e.target.style.boxShadow = '0 0 0 3px rgba(21,173,132,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = isDark ? '#3A4A42' : '#E0E0E0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div style={{ marginBottom: '10px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><LockIcon /></div>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Entrez votre mot de passe..." required style={{ ...inputStyle, paddingRight: '44px' }}
                onFocus={(e) => { e.target.style.borderColor = '#15AD84'; e.target.style.boxShadow = '0 0 0 3px rgba(21,173,132,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = isDark ? '#3A4A42' : '#E0E0E0'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: isDark ? '#C5C9C6' : '#555' }}>
                <div onClick={() => setRememberMe(!rememberMe)} style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${rememberMe ? '#15AD84' : isDark ? '#4A5A52' : '#CCC'}`, background: rememberMe ? '#15AD84' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', cursor: 'pointer', flexShrink: 0 }}>
                  {rememberMe && <CheckIcon />}
                </div>
                Se souvenir de moi
              </label>
            </div>
            {error && (
              <div style={{ background: isDark ? '#3A1A1A' : '#FFF0F0', border: `1px solid ${isDark ? '#5A2A2A' : '#FFCDD2'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#FF6B6B', textAlign: 'center' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? '#ccc' : '#15AD84', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s, transform 0.1s', letterSpacing: '0.3px' }}
              onMouseEnter={(e) => { if (!loading) e.target.style.opacity = '0.92'; }}
              onMouseLeave={(e) => { if (!loading) e.target.style.opacity = '1'; }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ICÔNES SVG pour le header post-login
// ============================================================
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const UserIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

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
  // Menu déroulant du bloc Administration (révèle le bouton Se déconnecter)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const [searchParams] = useSearchParams();

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
    if (selectedConversation) return;
    const timer = setTimeout(() => { loadConversations(); }, 150);
    const interval = setInterval(loadConversations, 30000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [isLoggedIn, selectedConversation]);

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

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} theme={theme} />;
  }

  if (loading) {
    return (
      <div className={`login-container ${theme}`}>
        <div className="login-card">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginBottom: '12px' }}>
            <span style={{ background: '#FF9900', color: 'white', padding: '2px 8px', borderRadius: '5px', fontSize: '15px', fontWeight: '800' }}>Easy</span>
            <span style={{ color: '#15AD84', fontSize: '15px', fontWeight: '800' }}>Event</span>
          </div>
          <p style={{ color: 'var(--text-secondary, #555)', fontSize: '14px' }}>Chargement des conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-container ${theme}`}>

      {/* Bouton menu mobile */}
      {isMobile && (
        <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>
      )}

      {/* ── SIDEBAR ── */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">

          {/* Ligne unique : logo à gauche, Rafraîchir + Retour en icônes seules à droite
              (gain de place : la barre de recherche et la liste remontent) */}
          <div className="sidebar-header-top">
            <div className="sidebar-logo">
              <span className="logo-easy">Easy</span>
              <span className="logo-event">Event</span>
              <span className="logo-support">· Support</span>
            </div>
            <div className="sidebar-header-icons">
              <button
                className="header-icon-btn"
                onClick={loadConversations}
                title="Rafraîchir la liste des conversations"
              >
                <RefreshIcon />
              </button>
              {selectedConversation && (
                <button
                  className="header-icon-btn"
                  onClick={() => setSelectedConversation(null)}
                  title="Retour à la liste des conversations"
                >
                  <ArrowLeftIcon />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Liste des conversations */}
        <ConversationList
          conversations={conversations}
          onSelect={(conv) => {
            setSelectedConversation(conv);
            if (isMobile) setSidebarOpen(false);
          }}
          selectedId={selectedConversation?.id}
        />

        {/* ── BARRE ADMINISTRATION — fixée en bas, toujours visible ── */}
        <div className="sidebar-footer">
          <button
            className="theme-toggle-mini"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>

          <div
            className={`admin-mini ${adminMenuOpen ? 'open' : ''}`}
            onClick={() => setAdminMenuOpen(!adminMenuOpen)}
            role="button"
            tabIndex={0}
          >
            {adminMenuOpen && (
              <div className="admin-mini-menu">
                <button
                  className="logout-btn-inline"
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                >
                  <LogoutIcon />
                  <span>Se déconnecter</span>
                </button>
              </div>
            )}
            <div className="admin-mini-row">
              <span className="admin-mini-avatar">
                <UserIcon size={12} />
              </span>
              <span className="admin-mini-label">Administration</span>
              <span className={`admin-mini-chevron ${adminMenuOpen ? 'rotated' : ''}`}>
                <ChevronDownIcon />
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="main-content">
        <Routes>
          <Route path="/" element={
            selectedConversation ? (
              <ConversationDetail
                conversation={selectedConversation}
                onUpdate={(updatedConv) => {
                  setSelectedConversation(updatedConv);
                  loadConversations();
                }}
              />
            ) : (
              // Aucun texte centré parasite — état vide propre
              <div className="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ color: 'var(--border)' }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Sélectionnez une conversation
                </p>
              </div>
            )
          } />
          <Route path="/conversations/:id" element={
            <ConversationPage
              conversations={conversations}
              onUpdateConversation={(updatedConv) => {
                setSelectedConversation(updatedConv);
                loadConversations();
              }}
            />
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;