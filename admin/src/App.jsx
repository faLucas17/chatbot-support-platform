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
  // ... (gardez votre LoginPage inchangé)
}

// ============================================================
// ICÔNES SVG
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
  // ... (gardez votre ConversationPage inchangé)
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

          {/* Ligne unique : logo à gauche, Rafraîchir + Retour en icônes seules à droite */}
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

        {/* ── BARRE ADMINISTRATION — fixée en bas de la sidebar (pour l'instant) ── */}
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

        {/* ✅ NAVBAR FIXÉE EN HAUT - visible TOUT LE TEMPS */}
        <div className="admin-navbar-fixed">
          <div className="admin-navbar-left">
            <button
              className="theme-toggle-nav"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
          <div className="admin-navbar-right">
            <div
              className="admin-nav-user"
              onClick={() => setAdminMenuOpen(!adminMenuOpen)}
            >
              <UserIcon size={16} />
              <span className="admin-nav-label">Administrateur</span>
              <span className="admin-nav-email">admin</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: adminMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {adminMenuOpen && (
              <button
                className="logout-nav-btn"
                onClick={handleLogout}
                title="Se déconnecter"
              >
                <LogoutIcon />
              </button>
            )}
          </div>
        </div>

        {/* Contenu principal (liste ou conversation) */}
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