import React, { useState } from 'react';

// ── Icônes SVG ─────────────────────────────────────────────
const UserIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const MessageSquareIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

// ✅ AlertIcon corrigé
const AlertIcon = () => (
  <svg
    width="8"
    height="8"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const MoreIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="19" r="1.5" />
  </svg>
);

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

// ── Helpers ──────────────────────────────────────────────
function getConversationTitle(messages) {
  if (!messages || messages.length === 0) return 'Nouvelle conversation';
  const firstUserMessage = messages.find(msg => msg.role === 'user');
  if (firstUserMessage) {
    const content = firstUserMessage.content.trim();
    return content.length > 25 ? content.substring(0, 25) + '…' : content;
  }
  const firstMessage = messages[0];
  if (firstMessage) {
    const content = firstMessage.content.trim();
    return content.length > 25 ? content.substring(0, 25) + '…' : content;
  }
  return 'Nouvelle conversation';
}

function getPreview(messages) {
  if (!messages || messages.length === 0) return 'Aucun message';
  const lastMessage = messages[messages.length - 1];
  const text = lastMessage.content || '';
  return text.length > 30 ? text.substring(0, 30) + '…' : text;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'à l\'instant';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 7) return `${diffD}j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function getInitials(name) {
  if (!name || name === 'Anonyme') return null;
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  ['#15AD84', '#0D8A69'],
  ['#FF9900', '#CC7700'],
  ['#6366F1', '#4F46E5'],
  ['#EF4444', '#B91C1C'],
  ['#8B5CF6', '#6D28D9'],
  ['#0EA5E9', '#0369A1'],
];
function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Composant ──────────────────────────────────────────────
export default function ConversationList({ conversations = [], onSelect, selectedId, onDeleteConversation }) {
  const [search, setSearch] = useState('');
  const [expandedUsers, setExpandedUsers] = useState({});
  const [hoveredConvId, setHoveredConvId] = useState(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState(null);

  const filtered = conversations.filter(conv => {
    if (!search) return true;
    const q = search.toLowerCase();
    const title = getConversationTitle(conv.messages).toLowerCase();
    const user = (conv.user_name || 'Anonyme').toLowerCase();
    return title.includes(q) || user.includes(q);
  });

  const grouped = filtered.reduce((acc, conv) => {
    const userName = conv.user_name || 'Anonyme';
    if (!acc[userName]) acc[userName] = [];
    acc[userName].push(conv);
    return acc;
  }, {});

  const toggleUser = (name) =>
    setExpandedUsers(prev => ({ ...prev, [name]: !prev[name] }));

  const handleDelete = (convId, e) => {
    e.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer cette conversation ?')) {
      if (onDeleteConversation) {
        onDeleteConversation(convId);
      }
      setShowDeleteMenu(null);
    }
  };

  if (conversations.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', padding: '32px' }}>
        <MessageSquareIcon />
        <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-muted)' }}>Aucune conversation</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Recherche */}
      <div style={{ padding: '10px 10px 6px', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 30px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#15AD84'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      </div>

      {/* Compteur */}
      <div style={{ padding: '0 12px 6px', fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
        {filtered.length} conversation{filtered.length !== 1 ? 's' : ''}
        {' · '}
        {Object.keys(grouped).length} utilisateur{Object.keys(grouped).length !== 1 ? 's' : ''}
      </div>

      {/* Liste groupée */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
        {Object.entries(grouped).map(([userName, userConvs]) => {
          const isAnon = userName === 'Anonyme';
          const initials = getInitials(userName);
          const [c1, c2] = avatarColor(userName);
          const isOpen = expandedUsers[userName] !== false;

          return (
            <div key={userName} style={{ marginBottom: '4px' }}>

              {/* En-tête utilisateur */}
              <div
                onClick={() => toggleUser(userName)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background 0.15s',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  marginBottom: '3px',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isAnon ? 'rgba(21,173,132,0.1)' : `linear-gradient(135deg, ${c1}, ${c2})`,
                  color: isAnon ? '#15AD84' : 'white',
                  fontSize: '8px',
                  fontWeight: '700',
                }}>
                  {isAnon ? <UserIcon size={10} /> : initials}
                </div>

                <span style={{ flex: 1, fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userName}
                </span>

                <span style={{
                  background: 'rgba(21,173,132,0.12)',
                  color: '#15AD84',
                  border: '1px solid rgba(21,173,132,0.2)',
                  borderRadius: '20px',
                  fontSize: '8px',
                  fontWeight: '700',
                  padding: '0px 5px',
                  flexShrink: 0,
                }}>
                  {userConvs.length}
                </span>

                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              {/* Conversations */}
              {isOpen && userConvs.map(conv => {
                const isSelected = String(selectedId) === String(conv.id);
                const isHovered = hoveredConvId === conv.id;
                const title = getConversationTitle(conv.messages);
                const preview = getPreview(conv.messages);
                const dateStr = formatDate(conv.created_at);

                return (
                  <div
                    key={conv.id}
                    onMouseEnter={() => {
                      setHoveredConvId(conv.id);
                    }}
                    onMouseLeave={() => {
                      setHoveredConvId(null);
                      setShowDeleteMenu(null);
                    }}
                    onClick={() => onSelect(conv)}
                    style={{
                      padding: '4px 8px 4px 10px',
                      marginBottom: '3px',
                      marginLeft: '4px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                      background: isSelected ? 'var(--bg-active)' : 'var(--bg-card)',
                      border: isSelected 
                        ? '1px solid rgba(21,173,132,0.3)' 
                        : isHovered 
                          ? '1px solid var(--accent)' 
                          : '1px solid var(--border)',
                      borderLeft: isSelected ? '2px solid #15AD84' : '2px solid transparent',
                      boxShadow: isSelected ? 'none' : 'var(--shadow-sm)',
                      position: 'relative',
                    }}
                  >
                    {/* Date + Titre + Badge Escaladé (compact) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {dateStr}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: isSelected ? '700' : '600',
                        color: isSelected ? '#15AD84' : 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}>
                        {title}
                      </span>
                      
                      {/* ✅ Badge Escaladée avec le nouveau style */}
                      {conv.escalated && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',

                            background: '#FFF9F2',
                            color: '#CC7A00',
                            border: '1px solid #F5D8A8',

                            borderRadius: '999px',

                            fontSize: '7px',
                            fontWeight: '600',

                            height: '16px',
                            padding: '0 7px',

                            lineHeight: 1,
                            whiteSpace: 'nowrap',

                            flexShrink: 0,
                            boxSizing: 'border-box',
                          }}
                        >
                          <AlertIcon />
                          Escaladée
                        </span>
                      )}
                      
                      {/* Trois points au survol */}
                      {isHovered && (
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteMenu(showDeleteMenu === conv.id ? null : conv.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <MoreIcon />
                          </button>
                          
                          {/* Menu déroulant avec la poubelle */}
                          {showDeleteMenu === conv.id && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              marginTop: '4px',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              boxShadow: 'var(--shadow-md)',
                              zIndex: 100,
                              minWidth: '100px',
                              padding: '4px',
                            }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(conv.id, e);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  width: '100%',
                                  padding: '4px 8px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  background: 'transparent',
                                  color: '#EF4444',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  fontFamily: 'Poppins, sans-serif',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <TrashIcon />
                                Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Aperçu - ESPACE RÉDUIT */}
                    <div style={{
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: '1px',
                    }}>
                      {preview}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}