import React, { useState, useEffect } from 'react';
import { Routes, Route, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { getConversations, getConversation, setUsername } from './api';
import ConversationList from './components/ConversationList';
import ConversationDetail from './components/ConversationDetail';
import './App.css';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@admin.com';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'passer@12';
const API_BASE = import.meta.env.VITE_API_BASE || 'https://support-platform-api-0h06.onrender.com';

// ============================================================
// ICÔNES SVG
// ============================================================
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const UserIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const GridIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const CoopIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18"/>
    <path d="M5 21V7l7-4 7 4v14"/>
    <path d="M9 21v-6h6v6"/>
  </svg>
);

// Icônes par projet
const getProjectIcon = (apiKey) => {
  if (apiKey?.includes('easycoop')) return <CoopIcon />;
  if (apiKey?.includes('easy-event')) return <CalendarIcon />;
  return <ChatIcon />;
};

// Couleurs par projet
const getProjectColor = (apiKey) => {
  if (apiKey?.includes('easycoop')) return { bg: '#E5A93C20', border: '#E5A93C', text: '#E5A93C' };
  if (apiKey?.includes('easy-event')) return { bg: '#15AD8420', border: '#15AD84', text: '#15AD84' };
  return { bg: '#88888820', border: '#888888', text: '#888888' };
};

// ============================================================
// LOGIN PAGE
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
        if (rememberMe) localStorage.setItem('support_remember_email', email);
        else localStorage.removeItem('support_remember_email');
        onLogin();
      } else {
        setError('Email ou mot de passe incorrect.');
      }
      setLoading(false);
    }, 600);
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem('support_remember_email');
    if (savedEmail) { setEmail(savedEmail); setRememberMe(true); }
  }, []);

  const inputStyle = {
    width: '100%', padding: '13px 16px 13px 44px',
    border: `1.5px solid ${isDark ? '#3A4A42' : '#E0E0E0'}`,
    borderRadius: '8px', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box',
    color: isDark ? '#F5F0E8' : '#333',
    background: isDark ? '#2A3A32' : 'white',
  };

  return (
    <div style={{
      width: '100vw', minHeight: '100vh',
      background: isDark ? '#1A2420' : '#F7F3EE',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '440px', background: isDark ? '#243028' : 'white', borderRadius: '20px', padding: '36px', boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            <span style={{ background: '#FF9900', color: 'white', padding: '3px 10px', borderRadius: '6px', fontSize: '18px', fontWeight: '800' }}>Easy</span>
            <span style={{ color: '#15AD84', fontSize: '18px', fontWeight: '800' }}>Suite</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: isDark ? '#F5F0E8' : '#1A1A1A', margin: '0 0 4px 0' }}>Support Admin</h2>
          <p style={{ fontSize: '13px', color: isDark ? '#9AB3A5' : '#888', margin: 0 }}>Connectez-vous à votre espace</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required style={inputStyle} />
          </div>
          <div style={{ marginBottom: '12px', position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" required style={{ ...inputStyle, paddingRight: '44px' }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {error && (
            <div style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#FF6B6B', textAlign: 'center' }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#ccc' : '#15AD84', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// PAGE D'ACCUEIL - LISTE DES PROJETS
// ============================================================
function HomePage({ tenants, onSelectTenant, theme }) {
  const isDark = theme === 'dark';

  return (
    <div style={{
      padding: '40px 60px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '800',
          color: isDark ? '#F5F0E8' : '#1A1A1A',
          margin: '0 0 12px 0',
          letterSpacing: '-0.5px',
        }}>
          Tous les projets <span style={{ color: '#15AD84' }}>support</span>
        </h1>
        <p style={{
          fontSize: '16px',
          color: isDark ? '#9AB3A5' : '#666',
          margin: 0,
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          Sélectionnez un projet pour consulter et répondre aux conversations escaladées.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px',
      }}>
        {tenants.map(t => {
          const colors = getProjectColor(t.api_key);
          return (
            <div
              key={t.id}
              onClick={() => onSelectTenant(t)}
              style={{
                background: isDark ? '#1E2A24' : 'white',
                borderRadius: '16px',
                padding: '28px',
                border: `1.5px solid ${isDark ? '#2A3A32' : '#E8E0D5'}`,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 12px 32px ${colors.border}33`;
                e.currentTarget.style.borderColor = colors.border;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isDark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = isDark ? '#2A3A32' : '#E8E0D5';
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: colors.bg,
                border: `1.5px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.text,
                marginBottom: '18px',
              }}>
                {getProjectIcon(t.api_key)}
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: isDark ? '#F5F0E8' : '#1A1A1A',
                margin: '0 0 8px 0',
              }}>
                {t.name}
              </h3>
              <p style={{
                fontSize: '13px',
                color: isDark ? '#9AB3A5' : '#888',
                margin: 0,
                lineHeight: 1.5,
              }}>
                Espace de support client — conversations escaladées
              </p>
              <div style={{
                marginTop: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: '600',
                color: colors.text,
              }}>
                Accéder aux conversations
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// APP PRINCIPALE
// ============================================================
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('support_admin_logged') === 'true');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // Vue active : 'home' (projets) ou 'project' (conversations d'un projet)
  const [view, setView] = useState('home');
  const [selectedTenant, setSelectedTenant] = useState(null);

  const [tenants, setTenants] = useState([]);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const username = searchParams.get('username');
    const token = searchParams.get('token');
    if (username) { setUsername(username); }
    if (token) { localStorage.setItem('sanctum_token', token); }
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

  // Charger tenants + conversations
  useEffect(() => {
    if (!isLoggedIn) return;
    fetch(`${API_BASE}/api/tenants/`)
      .then(res => res.json())
      .then(data => setTenants(data))
      .catch(err => console.error('Erreur tenants:', err));
    loadConversations();
  }, [isLoggedIn]);

  const loadConversations = async () => {
    try {
      const res = await getConversations();
      setConversations(res.data);
    } catch (err) {
      console.error('Erreur conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Polling des conversations quand on est sur un projet
  useEffect(() => {
    if (!isLoggedIn || view !== 'project') return;
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, view]);

  const handleLogin = () => setIsLoggedIn(true);

  const handleLogout = () => {
    localStorage.removeItem('support_admin_logged');
    localStorage.removeItem('support_username');
    setIsLoggedIn(false);
    setConversations([]);
    setView('home');
    setSelectedTenant(null);
  };

  const handleSelectTenant = (tenant) => {
    setSelectedTenant(tenant);
    setView('project');
    setSelectedConversation(null);
    if (isMobile) setSidebarOpen(false);
  };

  const handleBackToHome = () => {
    setView('home');
    setSelectedTenant(null);
    setSelectedConversation(null);
  };

  const filteredConversations = selectedTenant
    ? conversations.filter(c => c.tenant_id === selectedTenant.id)
    : [];

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} theme={theme} />;
  }

  if (loading) {
    return (
      <div className={`login-container ${theme}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="login-card">
          <p style={{ color: 'var(--text-secondary, #555)', fontSize: '14px' }}>Chargement...</p>
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

      {/* ── SIDEBAR (visible uniquement quand on est dans un projet) ── */}
      {view === 'project' && (
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-header-top">
              <div className="sidebar-logo" onClick={handleBackToHome} style={{ cursor: 'pointer' }}>
                <span className="logo-easy">Easy</span>
                <span className="logo-event">Suite</span>
                <span className="logo-support">· Support</span>
              </div>
              <div className="sidebar-header-icons">
                <button className="header-icon-btn" onClick={loadConversations} title="Rafraîchir">
                  <RefreshIcon />
                </button>
                <button className="header-icon-btn" onClick={handleBackToHome} title="Retour aux projets">
                  <ArrowLeftIcon />
                </button>
              </div>
            </div>

            <div style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--content)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid var(--line)',
            }}>
              {selectedTenant && getProjectIcon(selectedTenant.api_key)}
              <span>{selectedTenant?.name}</span>
            </div>
          </div>

          <ConversationList
            conversations={filteredConversations}
            onSelect={(conv) => {
              setSelectedConversation(conv);
              if (isMobile) setSidebarOpen(false);
            }}
            selectedId={selectedConversation?.id}
          />
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="main-content" style={{ marginLeft: view === 'home' ? 0 : undefined }}>
        <div className="admin-navbar-fixed">
          <div className="admin-navbar-left" />
          <div className="admin-navbar-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button className="theme-toggle-nav" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
              </button>
              <div className="admin-nav-user" onClick={() => setAdminMenuOpen(!adminMenuOpen)}>
                <UserIcon size={16} />
                <span className="admin-nav-label">Administrateur</span>
              </div>
            </div>
            {adminMenuOpen && (
              <div className="admin-dropdown-menu">
                <div className="admin-dropdown-email">admin</div>
                <button className="admin-dropdown-logout" onClick={handleLogout}>
                  <LogoutIcon />
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Vue Accueil */}
        {view === 'home' && (
          <HomePage
            tenants={tenants}
            onSelectTenant={handleSelectTenant}
            theme={theme}
          />
        )}

        {/* Vue Projet */}
        {view === 'project' && (
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
                <div className="empty-state">
                  <ChatIcon />
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px' }}>
                    Sélectionnez une conversation
                  </p>
                </div>
              )
            } />
          </Routes>
        )}
      </div>
    </div>
  );
}

export default App;