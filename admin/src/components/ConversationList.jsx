import React, { useState } from 'react';

// ── Icônes SVG réelles ─────────────────────────────────────
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

const AlertIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// ── Helpers (identiques à votre logique d'origine) ──────────
function getConversationTitle(messages) {
  if (!messages || messages.length === 0) return 'Nouvelle conversation';
  const firstUserMessage = messages.find(msg => msg.role === 'user');
  if (firstUserMessage) {
    const content = firstUserMessage.content.trim();
    return content.length > 45 ? content.substring(0, 45) + '…' : content;
  }
  const firstMessage = messages[0];
  if (firstMessage) {
    const content = firstMessage.content.trim();
    return content.length > 45 ? content.substring(0, 45) + '…' : content;
  }
  return 'Nouvelle conversation';
}

function getPreview(messages) {
  if (!messages || messages.length === 0) return 'Aucun message';
  const lastMessage = messages[messages.length - 1];
  const text = lastMessage.content || '';
  return text.length > 55 ? text.substring(0, 55) + '…' : text;
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

// Couleur d'avatar déterministe selon le nom
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
export default function ConversationList({ conversations = [], onSelect, selectedId }) {
  const [search, setSearch] = useState('');
  const [expandedUsers, setExpandedUsers] = useState({});

  // Filtre sur le titre ou le nom utilisateur
  const filtered = conversations.filter(conv => {
    if (!search) return true;
    const q = search.toLowerCase();
    const title = getConversationTitle(conv.messages).toLowerCase();
    const user = (conv.user_name || 'Anonyme').toLowerCase();
    return title.includes(q) || user.includes(q);
  });

  // Grouper par utilisateur — même logique que votre code d'origine
  const grouped = filtered.reduce((acc, conv) => {
    const userName = conv.user_name || 'Anonyme';
    if (!acc[userName]) acc[userName] = [];
    acc[userName].push(conv);
    return acc;
  }, {});

  const toggleUser = (name) =>
    setExpandedUsers(prev => ({ ...prev, [name]: !prev[name] }));

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
          const isOpen = expandedUsers[userName] !== false; // ouvert par défaut

          return (
            <div key={userName} style={{ marginBottom: '6px' }}>

              {/* En-tête utilisateur */}
              <div
                onClick={() => toggleUser(userName)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background 0.15s',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  marginBottom: '4px',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
              >
                {/* Avatar utilisateur */}
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isAnon
                    ? 'rgba(21,173,132,0.1)'
                    : `linear-gradient(135deg, ${c1}, ${c2})`,
                  color: isAnon ? '#15AD84' : 'white',
                  fontSize: '10px',
                  fontWeight: '700',
                }}>
                  {isAnon ? <UserIcon size={13} /> : initials}
                </div>

                {/* Nom */}
                <span style={{ flex: 1, fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userName}
                </span>

                {/* Badge nombre de conversations */}
                <span style={{
                  background: 'rgba(21,173,132,0.12)',
                  color: '#15AD84',
                  border: '1px solid rgba(21,173,132,0.2)',
                  borderRadius: '20px',
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '1px 7px',
                  flexShrink: 0,
                }}>
                  {userConvs.length}
                </span>

                {/* Chevron */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              {/* Conversations de cet utilisateur */}
              {isOpen && userConvs.map(conv => {
                const isSelected = String(selectedId) === String(conv.id);
                const title = getConversationTitle(conv.messages);
                const preview = getPreview(conv.messages);
                const dateStr = formatDate(conv.created_at);

                return (
                  <div
                    key={conv.id}
                    onClick={() => onSelect(conv)}
                    style={{
                      padding: '8px 10px 8px 14px',
                      marginBottom: '2px',
                      marginLeft: '8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      background: isSelected ? 'var(--bg-active)' : 'transparent',
                      border: isSelected
                        ? '1px solid rgba(21,173,132,0.25)'
                        : '1px solid transparent',
                      borderLeft: isSelected
                        ? '2px solid #15AD84'
                        : '2px solid transparent',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Titre + date */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: isSelected ? '700' : '600',
                        color: isSelected ? '#15AD84' : 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}>
                        {title}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, marginTop: '1px' }}>
                        {dateStr}
                      </span>
                    </div>

                    {/* Aperçu */}
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: conv.escalated ? '5px' : '0',
                    }}>
                      {preview}
                    </div>

                    {/* Badge escaladé — compact */}
                    {conv.escalated && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        background: 'rgba(255,153,0,0.1)',
                        color: '#CC7A00',
                        border: '1px solid rgba(255,153,0,0.25)',
                        borderRadius: '20px',
                        fontSize: '9px',
                        fontWeight: '700',
                        padding: '1px 6px',
                      }}>
                        <AlertIcon />
                        Escaladée
                      </span>
                    )}
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