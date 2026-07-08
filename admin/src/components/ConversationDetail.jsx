import React, { useState, useEffect, useRef } from 'react';
import { getConversation, replyToConversation } from '../api';
import axios from 'axios';

const LARAVEL_BASE = 'https://api-easyevent.bakeli.tech';

// ── Avatar de l'agent ──
const AGENT_AVATAR = "/images.jpg";

const BotAvatar = () => (
  <div style={{
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    overflow: 'hidden',
    background: '#ffffff',
    border: '2px solid rgba(21, 173, 132, 0.25)',
    boxShadow: '0 2px 6px rgba(21,173,132,0.12)',
    flexShrink: 0,
  }}>
    <img
      src={AGENT_AVATAR}
      alt="Agent EasyEvent"
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  </div>
);

// ── Icône utilisateur ──────────────────────────────────────
const UserIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

// ── Parseur léger du contenu d'un message ────────────────────
const renderMessageContent = (content) => {
  if (!content) return null;

  const lines = String(content).split('\n');
  const elements = [];
  let currentList = [];
  let listKeyIndex = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul className="message-list" key={`list-${listKeyIndex++}`}>
          {currentList.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (line.startsWith('- ')) {
      currentList.push(line.slice(2).trim());
      return;
    }

    if (line === '') {
      flushList();
      return;
    }

    flushList();
    elements.push(
      <p className="message-paragraph" key={`p-${idx}`}>{line}</p>
    );
  });

  flushList();
  return elements;
};

// ── Fonction pour obtenir les initiales ──────────────────
function getInitials(name) {
  if (!name || name === 'Anonyme') return null;
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function ConversationDetail({ conversation, onUpdate }) {
  const [messages, setMessages] = useState(conversation.messages || []);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState(conversation.user_name || 'Anonyme');
  const [textareaKey, setTextareaKey] = useState(0);
  const textareaRef = useRef(null);

  // Auto-resize du textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [reply]);

  useEffect(() => {
    setMessages(conversation.messages || []);
    setUserName(conversation.user_name || 'Anonyme');
  }, [conversation]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;

    setSending(true);
    const replyContent = reply;
    const tempReplyMessage = {
      id: Date.now(),
      role: 'bot',
      content: replyContent,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempReplyMessage]);
    setReply('');
    setTextareaKey(prev => prev + 1);
    
    try {
      await replyToConversation(conversation.id, replyContent);
      
      try {
        await axios.post(`${LARAVEL_BASE}/api/chatbot/escalations/mark-resolved`, {
          conversation_id: conversation.id
        });
      } catch (laravelErr) {
        console.warn('Erreur Laravel (non bloquante):', laravelErr.message);
      }
      
      const res = await getConversation(conversation.id);
      setMessages(res.data.messages);
      
      onUpdate({ 
        ...conversation, 
        messages: res.data.messages, 
        escalated: false, 
        user_name: res.data.user_name 
      });
      
    } catch (err) {
      console.error('Erreur lors de l\'envoi de la réponse:', err);
      setMessages(prev => prev.filter(msg => msg.id !== tempReplyMessage.id));
      setReply(replyContent);
    } finally {
      setSending(false);
    }
  };

  const getAvatar = (role, msgUserName) => {
    if (role === 'user') {
      const initials = getInitials(msgUserName || userName);
      if (initials) {
        return (
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #15AD84 0%, #FF9900 100%)',
            color: 'white',
            fontSize: '14px',
            fontWeight: '700',
            flexShrink: 0,
            cursor: 'default',
          }}
          title={`Utilisateur : ${msgUserName || userName}`}
          >
            {initials}
          </div>
        );
      }
      return (
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,153,0,0.1)',
          color: '#FF9900',
          flexShrink: 0,
          cursor: 'default',
        }}
        title={`Utilisateur : ${msgUserName || userName}`}
        >
          <UserIcon size={18} />
        </div>
      );
    }
    return <BotAvatar />;
  };

  return (
    <div className="conversation-detail">
      {/* Header SUPPRIMÉ - plus de "Utilisateur : X" */}

      <div className="messages-container">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9AB3A5', padding: '20px' }}>
            Aucun message dans cette conversation
          </div>
        )}
        {messages.map((msg) => {
          const msgUserName = msg.user_name || userName;
          return (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {getAvatar(msg.role, msgUserName)}
              </div>
              <div className="message-content">
                <div className="message-text">{renderMessageContent(msg.content)}</div>
                <div className="message-time-left">
                  {new Date(msg.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zone de réponse avec auto-resize */}
      <form onSubmit={handleSendReply} className="reply-form">
        <textarea
          key={textareaKey}
          ref={textareaRef}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Écrivez votre réponse ici..."
          rows={1}
          style={{
            overflow: 'hidden',
            resize: 'none',
            minHeight: '40px',
            maxHeight: '200px',
          }}
        />
        <button type="submit" disabled={sending || !reply.trim()}>
          <SendIcon />
          <span>{sending ? 'Envoi...' : 'Envoyer'}</span>
        </button>
      </form>
    </div>
  );
}

export default ConversationDetail;