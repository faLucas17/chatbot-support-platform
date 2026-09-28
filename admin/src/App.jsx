import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom';
import { getConversations, getConversation, setUsername } from './api';
import ConversationList from './components/ConversationList';
import ConversationDetail from './components/ConversationDetail';
import './App.css';

// ============================================================
// CREDENTIALS ADMIN - via variables d'environnement
// ============================================================
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@admin.com';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'passer@12';

// URL de base de l'API
const API_BASE = import.meta.env.VITE_API_BASE || 'https://support-platform-api-0h06.onrender.com';

// Email de contact affiché dans le pied de page 
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || '';
const SUPPORT_SITE_URL = 'https://www.bakeli.tech';
const SUPPORT_SITE_LABEL = 'www.bakeli.tech';

// Couleur de marque "Easy Desk" (bleu support)
const BRAND_BLUE = '#0284C7';

// ============================================================
// HELPERS PROJETS (slug + couleur d'accent)
// ============================================================
const slugify = (name = '') =>
  String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getAccentColor = (name = '') => {
  const slug = slugify(name);
  if (slug === 'easycoop') return '#E5A93C';
  if (/^easy-?events?$/.test(slug)) return '#15AD84';
  return '#888888';
};

// ============================================================
// PAGE DE LOGIN — Design Easy Desk avec "Se souvenir de moi"
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
          <div style={{ position: 'absolute', top: '60px', right: '460px', width: '12px', height: '12px', borderRadius: '50%', background: BRAND_BLUE, opacity: 0.5 }} />
          <div style={{ position: 'absolute', top: '30px', right: '60px', width: '10px', height: '10px', borderRadius: '50%', background: '#38BDF8', opacity: 0.5 }} />
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
            <span style={{ background: BRAND_BLUE, color: 'white', padding: '2px 10px', borderRadius: '6px', fontWeight: '800' }}>Easy</span>
            <span style={{ color: isDark ? '#F5F0E8' : '#1A1A1A', fontWeight: '800' }}>Desk</span>
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
          <div style={{ position: 'absolute', top: '0px', left: '50%', transform: 'translateX(-50%)', width: '14px', height: '14px', borderRadius: '50%', background: BRAND_BLUE }} />
          <svg width="260" height="34" viewBox="0 0 300 40" style={{ display: 'inline-block' }}>
            <path d="M 0 30 Q 75 5 150 20 Q 225 35 300 15" fill="none" stroke="url(#curveGrad)" strokeWidth="6" strokeLinecap="round" />
            <defs>
              <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={BRAND_BLUE} />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: 'absolute', bottom: '0px', left: isMobile ? '20%' : '10px', width: '12px', height: '12px', borderRadius: '50%', background: '#38BDF8' }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '10px 20px 32px' : '24px 40px', width: '100%', maxWidth: isMobile ? '100%' : '520px', minWidth: 0, flexShrink: 1, marginRight: isMobile ? 0 : '10px', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', background: isDark ? '#243028' : 'white', borderRadius: '20px', padding: isMobile ? '24px 22px' : '32px 36px', boxShadow: isDark ? '0 4px 32px rgba(0,0,0,0.4)' : '0 4px 32px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginBottom: '8px' }}>
              <span style={{ background: BRAND_BLUE, color: 'white', padding: '3px 10px', borderRadius: '6px', fontSize: '18px', fontWeight: '800' }}>Easy</span>
              <span style={{ color: isDark ? '#F5F0E8' : '#1A1A1A', fontSize: '18px', fontWeight: '800' }}>Desk</span>
            </div>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: isDark ? '#F5F0E8' : '#1A1A1A', margin: '0 0 4px 0', textAlign: 'center' }}>Support Admin AI</h2>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: isDark ? '#F5F0E8' : '#1A1A1A', margin: '0 0 4px 0', textAlign: 'center' }}>Connexion</h2>
          <p style={{ fontSize: '13px', color: isDark ? '#9AB3A5' : '#888', textAlign: 'center', margin: '0 0 20px 0' }}>Connectez-vous pour accéder à votre espace</p>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '10px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><EmailIcon /></div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Entrez votre email..." required style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = BRAND_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(2,132,199,0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = isDark ? '#3A4A42' : '#E0E0E0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div style={{ marginBottom: '10px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><LockIcon /></div>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Entrez votre mot de passe..." required style={{ ...inputStyle, paddingRight: '44px' }}
                onFocus={(e) => { e.target.style.borderColor = BRAND_BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(2,132,199,0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = isDark ? '#3A4A42' : '#E0E0E0'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: isDark ? '#C5C9C6' : '#555' }}>
                <div onClick={() => setRememberMe(!rememberMe)} style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${rememberMe ? BRAND_BLUE : isDark ? '#4A5A52' : '#CCC'}`, background: rememberMe ? BRAND_BLUE : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', cursor: 'pointer', flexShrink: 0 }}>
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
              style={{ width: '100%', padding: '13px', background: loading ? '#ccc' : BRAND_BLUE, color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s, transform 0.1s', letterSpacing: '0.3px' }}
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

// ============================================================
// COMPOSANT ConversationPage (route /conversations/:id)
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
      <button onClick={() => navigate('/projets')}>Retour aux projets</button>
    </div>
  );

  return <ConversationDetail conversation={conversation} onUpdate={handleUpdate} />;
}

// ============================================================
// NAVBAR ADMIN 
// ============================================================
function AdminNavbar({ theme, setTheme, adminMenuOpen, setAdminMenuOpen, onLogout }) {
  return (
    <div className="admin-navbar-fixed">
      <div className="admin-navbar-left">
      </div>
      <div className="admin-navbar-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="theme-toggle-nav"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>

          <div
            className="admin-nav-user"
            onClick={() => setAdminMenuOpen(!adminMenuOpen)}
          >
            <UserIcon size={16} />
            <span className="admin-nav-label">Administrateur</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: adminMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {adminMenuOpen && (
          <div className="admin-dropdown-menu">
            <div className="admin-dropdown-email">admin</div>
            <button className="admin-dropdown-logout" onClick={onLogout}>
              <LogoutIcon />
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PAGE D'ACCUEIL /projets — grille de cartes 
// ============================================================
function getProjectStyle(name, isDark, base) {
  const slug = slugify(name);
  let btnBg = '#888888';
  let btnText = '#FFFFFF';
  if (slug === 'easycoop') { btnBg = '#E5A93C'; btnText = '#1A1A1A'; }          // jaune
  else if (/^easy-?events?$/.test(slug)) { btnBg = '#15AD84'; btnText = '#FFFFFF'; } // vert
  return {
    cardBg: base.cardBg, border: base.cardBorder,
    title: base.cardTitle, muted: base.textMuted, strong: base.textMain,
    iconBg: isDark ? '#2A3A32' : '#F3F4F6',
    btnBg, btnText,
  };
}

// Logo commun aux projets : /public/logos/bakeli.png (remplit toute la case)
// Si l'image est introuvable, on retombe sur l'initiale du projet.
function ProjectLogo({ tenant, bg }) {
  const [failed, setFailed] = useState(false);
  const src = `${import.meta.env.BASE_URL}logos/bakeli.png`;
  return (
    <div style={{
      width: '56px', height: '56px', borderRadius: '12px', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {failed ? (
        <span className="ps-heading" style={{ fontSize: '22px', fontWeight: 800 }}>
          {(tenant.name || '?').charAt(0).toUpperCase()}
        </span>
      ) : (
        <img
          src={src}
          alt="Logo"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      )}
    </div>
  );
}

const SocialIcon = ({ name }) => {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'facebook') return <svg {...p}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
  if (name === 'x') return <svg {...p}><path d="M4 4l11.7 16H20L8.3 4H4z"/><path d="M4.5 20l6.2-6.6M13.3 10.6L19.5 4"/></svg>;
  if (name === 'linkedin') return <svg {...p}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>;
  return <svg {...p}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
};

function ProjectsHome({ tenants, tenantsLoaded, conversations, theme, setTheme, onOpenProject, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = theme === 'dark';

  const pageBg = isDark ? '#1A2420' : '#FFFFFF';
  const bandBg = isDark ? '#141C18' : '#F4F7FD';
  const cardBg = isDark ? '#243028' : '#FFFFFF';
  const cardBorder = isDark ? '#3A4A42' : '#E8ECF2';
  const textMain = isDark ? '#F5F0E8' : '#111111';
  const textMuted = isDark ? '#9AB3A5' : '#6B7280';
  const cardTitle = isDark ? '#F5F0E8' : '#0B4F8A';
  const userBoxBg = isDark ? '#243028' : '#F3F4F6';
  const footerBg = isDark ? '#1A2420' : '#FFFFFF';
  const socialBg = isDark ? '#243028' : '#ECEDF1';
  const base = { cardBg, cardBorder, textMain, textMuted, cardTitle };

  const countFor = (tenantId) =>
    conversations.filter(c => Number(c.tenant_id) === Number(tenantId)).length;

  const socials = [
    { name: 'facebook', label: 'Facebook', href: import.meta.env.VITE_FACEBOOK_URL },
    { name: 'x', label: 'X', href: import.meta.env.VITE_X_URL },
    { name: 'linkedin', label: 'LinkedIn', href: import.meta.env.VITE_LINKEDIN_URL },
    { name: 'instagram', label: 'Instagram', href: import.meta.env.VITE_INSTAGRAM_URL },
  ];

  const Brand = ({ size, footer }) => (
    <span className="ps-heading" style={{ fontSize: size, fontWeight: 800, letterSpacing: '-0.3px' }}>
      <span style={{ color: BRAND_BLUE }}>Easy</span>{' '}
      <span style={{ color: textMain }}>Desk</span>
    </span>
  );

  return (
    <div style={{ height: '100vh', overflowY: 'scroll', background: pageBg }}>
    <div className="ps-page" style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: pageBg,
      color: textMain,
      boxSizing: 'border-box',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&display=swap');
        .ps-heading { font-family: 'Montserrat', sans-serif !important; }
        .ps-title {
          font-family: 'Montserrat', sans-serif !important;
          font-weight: 900 !important;
          color: ${textMain} !important;
          -webkit-text-fill-color: ${textMain} !important;
          background: none !important;
          opacity: 1 !important;
          text-shadow: none !important;
          margin: 0 0 6px !important;
          font-size: clamp(28px, 4.4vw, 52px);
          line-height: 1.2;
          text-align: center;
        }
        .ps-subtitle { color: ${textMain} !important; font-weight: 600; text-align: center; margin: 0; font-size: clamp(15px, 1.8vw, 20px); }
        .projects-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 640px)  { .projects-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .projects-grid { grid-template-columns: repeat(4, 1fr); } }
        .project-card { text-align: left; transition: box-shadow 0.2s, transform 0.2s; cursor: pointer; }
        .project-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,0.14); }
        .project-card:focus-visible { outline: 3px solid ${BRAND_BLUE}; outline-offset: 2px; }
        .ps-footer-grid { display: grid; grid-template-columns: 1fr; gap: 28px; }
        @media (min-width: 768px) { .ps-footer-grid { grid-template-columns: 1.4fr 1fr 1fr; } }
        .ps-footer a.ps-link { color: ${textMuted}; text-decoration: none; font-size: 15px; }
        .ps-footer a.ps-link:hover { color: ${textMain}; text-decoration: underline; }
        .ps-social:hover { filter: brightness(0.94); }
      `}</style>

      {/* Barre du haut */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px', borderBottom: `1px solid ${cardBorder}`,
      }}>
        <Brand size="24px" />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
            style={{ background: userBoxBg, border: 'none', color: textMain, borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
          <div
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', borderRadius: '10px', background: userBoxBg, cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: textMain }}
          >
            <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#1F2937', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserIcon size={16} />
            </span>
            <span>Administrateur</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          {menuOpen && (
            <div style={{ position: 'absolute', top: '52px', right: 0, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '6px 0', minWidth: '190px', zIndex: 10 }}>
              <div style={{ padding: '10px 16px', fontSize: '13px', color: textMuted, textAlign: 'center' }}>admin</div>
              <div style={{ height: '1px', background: cardBorder, margin: '0 0 4px' }} />
              <button
                onClick={onLogout}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: 'none', border: 'none', color: '#EF4444', fontSize: '14px', fontWeight: '500', padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <LogoutIcon />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Titre + trait décoratif neutre */}
      <div style={{ padding: '52px 24px 40px' }}>
        <div role="heading" aria-level="1" className="ps-title">Tous les projets support</div>
        <svg width="300" height="24" viewBox="0 0 300 24" style={{ display: 'block', margin: '6px auto 16px', maxWidth: '80%' }} aria-hidden="true">
          <path d="M 4 22 A 600 600 0 0 1 296 22" fill="none" stroke={BRAND_BLUE} strokeWidth="7" strokeLinecap="round" />
        </svg>
        <p className="ps-subtitle">Choisissez un projet pour suivre ses conversations escaladées.</p>
      </div>

      {/* Grille de cartes */}
      <div style={{ background: bandBg, padding: '28px 32px 36px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          {!tenantsLoaded ? (
            <p style={{ textAlign: 'center', color: textMuted, fontSize: '14px' }}>Chargement des projets...</p>
          ) : tenants.length === 0 ? (
            <p style={{ textAlign: 'center', color: textMuted, fontSize: '14px' }}>Aucun projet disponible pour le moment.</p>
          ) : (
            <div className="projects-grid">
              {tenants.map(t => {
                const st = getProjectStyle(t.name, isDark, base);
                const count = countFor(t.id);
                const open = () => onOpenProject(t);
                return (
                  <div
                    key={t.id}
                    className="project-card"
                    role="link"
                    tabIndex={0}
                    onClick={open}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      background: st.cardBg,
                      border: `1px solid ${st.border}`,
                      borderRadius: '14px',
                      padding: '16px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '10px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <ProjectLogo tenant={t} bg={st.iconBg} />
                    <div role="heading" aria-level="3" className="ps-heading" style={{ fontSize: '19px', fontWeight: 800, color: st.title, lineHeight: 1.25, textAlign: 'left' }}>
                      {t.name}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: st.muted, flex: 1, textAlign: 'left' }}>
                      Support et conversations escaladées de {t.name}.{' '}
                      <strong style={{ color: st.strong }}>
                        {count} conversation{count > 1 ? 's' : ''}
                      </strong>
                    </p>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: st.btnBg, color: st.btnText,
                      padding: '7px 12px', borderRadius: '8px',
                      fontSize: '13px', fontWeight: 700,
                    }}>
                      Accéder aux conversations →
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pied de page (collé en bas) */}
      <footer className="ps-footer" style={{ marginTop: 'auto', background: footerBg, color: textMain, padding: '48px 32px 24px', borderTop: `1px solid ${cardBorder}` }}>
        <div className="ps-footer-grid" style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '12px' }}><Brand size="24px" /></div>
            <p style={{ margin: '0 0 18px', color: textMuted, fontSize: '15px', lineHeight: 1.7, maxWidth: '380px' }}>
              Le centre de support intelligent de vos applications Easy : suivez les conversations, répondez et résolvez, propulsé par l'IA.
            </p>
            <div style={{ display: 'flex', gap: '14px' }}>
              {socials.map(s => (
                <a
                  key={s.name}
                  className="ps-social"
                  href={s.href || '#'}
                  target={s.href ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  style={{ width: '40px', height: '40px', borderRadius: '10px', background: socialBg, color: textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <SocialIcon name={s.name} />
                </a>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div className="ps-heading" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', color: textMain }}>Liens rapides</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li><a className="ps-link" href="/projets">Tous les projets</a></li>
              {SUPPORT_EMAIL && <li><a className="ps-link" href={`mailto:${SUPPORT_EMAIL}`}>Nous écrire</a></li>}
            </ul>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div className="ps-heading" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', color: textMain }}>Contact</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li><a className="ps-link" href={SUPPORT_SITE_URL} target="_blank" rel="noopener noreferrer">{SUPPORT_SITE_LABEL}</a></li>
              {SUPPORT_EMAIL && <li><a className="ps-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></li>}
              <li style={{ color: textMuted, fontSize: '15px' }}>Dakar, Sénégal</li>
            </ul>
          </div>
        </div>

        <div style={{ maxWidth: '1280px', margin: '32px auto 0', paddingTop: '20px', borderTop: `1px solid ${cardBorder}`, textAlign: 'center', color: textMuted, fontSize: '15px' }}>
          © {new Date().getFullYear()} Easy Desk. Tous droits réservés. Made in Sénégal .
        </div>
      </footer>
    </div>
    </div>
  );
}

// ============================================================
// LAYOUT CONVERSATIONS (sidebar + contenu) — utilisé par /projets/:slug
// ============================================================
function ConversationsShell({
  theme, setTheme, title, accent, onBack,
  conversations, selectedConversation, onSelect, onClearSelection, onRefresh,
  isMobile, sidebarOpen, setSidebarOpen,
  adminMenuOpen, setAdminMenuOpen, onLogout,
  children,
}) {
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

          {/* Bouton retour vers /projets, tout en haut de la sidebar */}
          {onBack && (
            <div style={{ padding: '10px 14px 0 14px' }}>
              <button
                onClick={onBack}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'transparent', border: '1px solid var(--line)',
                  color: 'var(--content)', borderRadius: '8px',
                  padding: '6px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                }}
                title="Retour à la liste des projets"
              >
                <ArrowLeftIcon />
                Tous les projets
              </button>
            </div>
          )}

          {/* Ligne : logo à gauche, Rafraîchir + Retour conversation à droite */}
          <div className="sidebar-header-top">
            <div className="sidebar-logo">
              <span className="logo-easy" style={{ color: BRAND_BLUE, background: 'transparent' }}>Easy</span>
              <span className="logo-event" style={{ color: 'var(--content)' }}>Desk</span>
              <span className="logo-support">· Support</span>
            </div>
            <div className="sidebar-header-icons">
              <button
                className="header-icon-btn"
                onClick={onRefresh}
                title="Rafraîchir la liste des conversations"
              >
                <RefreshIcon />
              </button>
              {selectedConversation && (
                <button
                  className="header-icon-btn"
                  onClick={onClearSelection}
                  title="Retour à la liste des conversations"
                >
                  <ArrowLeftIcon />
                </button>
              )}
            </div>
          </div>

          {/* Nom du projet */}
          <div style={{ padding: '10px 14px 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: accent || '#888888', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--content)' }}>{title}</span>
          </div>
        </div>

        {/* Liste des conversations (déjà filtrées) */}
        <ConversationList
          conversations={conversations}
          onSelect={onSelect}
          selectedId={selectedConversation?.id}
        />
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="main-content">
        <AdminNavbar
          theme={theme}
          setTheme={setTheme}
          adminMenuOpen={adminMenuOpen}
          setAdminMenuOpen={setAdminMenuOpen}
          onLogout={onLogout}
        />
        {children}
      </div>
    </div>
  );
}

// ============================================================
// PAGE PROJET /projets/:slug
// ============================================================
function ProjectPage({
  tenants, tenantsLoaded, conversations,
  selectedConversation, setSelectedConversation,
  loadConversations, onBack, shellProps,
}) {
  const { slug } = useParams();
  const tenant = tenants.find(t => slugify(t.name) === slug);

  // Changer de projet réinitialise la conversation sélectionnée
  useEffect(() => {
    setSelectedConversation(null);
  }, [slug]);

  if (!tenantsLoaded) {
    return (
      <div className={`admin-container ${shellProps.theme}`}>
        <div className="empty-state"><p>Chargement du projet...</p></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className={`admin-container ${shellProps.theme}`}>
        <div className="empty-state">
          <p>Projet introuvable</p>
          <button onClick={onBack}>Retour aux projets</button>
        </div>
      </div>
    );
  }

  const projectConversations = conversations.filter(
    c => Number(c.tenant_id) === Number(tenant.id)
  );

  return (
    <ConversationsShell
      {...shellProps}
      title={tenant.name}
      accent={getAccentColor(tenant.name)}
      onBack={onBack}
      conversations={projectConversations}
      selectedConversation={selectedConversation}
      onSelect={(conv) => {
        setSelectedConversation(conv);
        if (shellProps.isMobile) shellProps.setSidebarOpen(false);
      }}
      onClearSelection={() => setSelectedConversation(null)}
      onRefresh={loadConversations}
    >
      {selectedConversation ? (
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
      )}
    </ConversationsShell>
  );
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

  // Tenants (projets)
  const [tenants, setTenants] = useState([]);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Charger la liste des tenants au démarrage
  useEffect(() => {
    if (!isLoggedIn) return;
    fetch(`${API_BASE}/api/tenants/`)
      .then(res => res.json())
      .then(data => setTenants(Array.isArray(data) ? data : []))
      .catch(err => console.error('Erreur chargement tenants:', err))
      .finally(() => setTenantsLoaded(true));
  }, [isLoggedIn]);

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
    setSelectedConversation(null);
    setAdminMenuOpen(false);
  };

  // Navigation
  const goToProjects = () => {
    setSelectedConversation(null);
    setSidebarOpen(false);
    navigate('/projets');
  };

  const openProject = (tenant) => {
    setSelectedConversation(null);
    navigate(`/projets/${slugify(tenant.name)}`);
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} theme={theme} />;
  }

  if (loading) {
    return (
      <div className={`login-container ${theme}`}>
        <div className="login-card">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginBottom: '12px' }}>
            <span style={{ background: BRAND_BLUE, color: 'white', padding: '2px 8px', borderRadius: '5px', fontSize: '15px', fontWeight: '800' }}>Easy</span>
            <span style={{ color: 'var(--content, #1A1A1A)', fontSize: '15px', fontWeight: '800' }}>Desk</span>
          </div>
          <p style={{ color: 'var(--text-secondary, #555)', fontSize: '14px' }}>Chargement des conversations...</p>
        </div>
      </div>
    );
  }

  const shellProps = {
    theme, setTheme,
    isMobile, sidebarOpen, setSidebarOpen,
    adminMenuOpen, setAdminMenuOpen,
    onLogout: handleLogout,
  };

  return (
    <Routes>
      {/* Racine → accueil des projets (on conserve ?username=...&token=...) */}
      <Route path="/" element={<Navigate to={{ pathname: '/projets', search: location.search }} replace />} />

      {/* Page d'accueil : grille des projets */}
      <Route path="/projets" element={
        <ProjectsHome
          tenants={tenants}
          tenantsLoaded={tenantsLoaded}
          conversations={conversations}
          theme={theme}
          setTheme={setTheme}
          onOpenProject={openProject}
          onLogout={handleLogout}
        />
      } />

      {/* Page projet : conversations filtrées par tenant */}
      <Route path="/projets/:slug" element={
        <ProjectPage
          tenants={tenants}
          tenantsLoaded={tenantsLoaded}
          conversations={conversations}
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
          loadConversations={loadConversations}
          onBack={goToProjects}
          shellProps={shellProps}
        />
      } />

      {/* Route existante conservée (lien direct vers une conversation) */}
      <Route path="/conversations/:id" element={
        <ConversationsShell
          {...shellProps}
          title="Toutes les conversations"
          onBack={goToProjects}
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelect={(conv) => {
            setSelectedConversation(conv);
            if (isMobile) setSidebarOpen(false);
          }}
          onClearSelection={() => setSelectedConversation(null)}
          onRefresh={loadConversations}
        >
          <ConversationPage
            conversations={conversations}
            onUpdateConversation={(updatedConv) => {
              setSelectedConversation(updatedConv);
              loadConversations();
            }}
          />
        </ConversationsShell>
      } />

      {/* Toute autre URL → accueil des projets */}
      <Route path="*" element={<Navigate to="/projets" replace />} />
    </Routes>
  );
}

export default App;