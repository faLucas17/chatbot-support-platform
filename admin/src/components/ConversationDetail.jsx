import React, { useState, useEffect } from 'react';
import { getConversation, replyToConversation } from '../api';
import axios from 'axios';

const LARAVEL_BASE = 'https://api-easyevent.bakeli.tech';

// ── Avatar de l'agent ──
// L'image doit se trouver dans le dossier "public" de votre projet Vite :
// support_platform/public/images.jpg
// Elle sera alors automatiquement accessible via le chemin "/images.jpg".
const AGENT_AVATAR = "/images.jpg";

// ── Avatar de l'agent : cadre + image réelle (remplace l'ancien logo "EE") ──
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

// ── Icône utilisateur réelle (remplace l'emoji 👤) ──────────
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

const RefreshIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

// ── Parseur léger du contenu d'un message ────────────────────
// Transforme les lignes commençant par "- " en vraies listes à puces
// et le reste en paragraphes, sans toucher au contenu métier envoyé par le bot.
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

    // Ligne vide → on ferme la liste en cours et on ajoute un petit espace
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

function ConversationDetail({ conversation, onUpdate }) {
  const [messages, setMessages] = useState(conversation.messages || []);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [userName, setUserName] = useState(conversation.user_name || 'Anonyme');
  const [textareaKey, setTextareaKey] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMessages(conversation.messages || []);
    setUserName(conversation.user_name || 'Anonyme');
  }, [conversation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await getConversation(conversation.id);
      setMessages(res.data.messages);
      setUserName(res.data.user_name || 'Anonyme');
    } catch (err) {
      console.error('Erreur rafraîchissement:', err);
    } finally {
      setRefreshing(false);
    }
  };

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
      console.log(` Réponse envoyée pour la conversation ${conversation.id}`);
      
      // Appel à Laravel pour marquer l'escalade comme résolue
      try {
        await axios.post(`${LARAVEL_BASE}/api/chatbot/escalations/mark-resolved`, {
          conversation_id: conversation.id
        });
        console.log(` Escalade marquée comme résolue pour la conversation ${conversation.id}`);
      } catch (laravelErr) {
        console.warn(' Erreur Laravel (non bloquante):', laravelErr.message);
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
      console.error('❌ Erreur lors de l\'envoi de la réponse:', err);
      setMessages(prev => prev.filter(msg => msg.id !== tempReplyMessage.id));
      setReply(replyContent);
    } finally {
      setSending(false);
    }
  };

  const getAvatar = (role) => {
    return role === 'user' ? <UserIcon size={15} /> : <BotAvatar />;
  };

  return (
    <div className="conversation-detail">
      <div className="detail-header">
        {/* Retour + Rafraîchir + Utilisateur, tous alignés à gauche/droite (titre centré retiré) */}
        <div className="detail-header-sub-row">
          <div className="detail-header-actions">
            <button onClick={() => window.location.href = '/'} className="back-btn">
              <ArrowLeftIcon />
              <span>Retour</span>
            </button>
            <button onClick={handleRefresh} disabled={refreshing} className="refresh-btn">
              <RefreshIcon />
              {!isMobile && <span>Rafraîchir</span>}
            </button>
          </div>

          <div className="detail-header-user">
            <UserIcon size={20} />
            <span>Utilisateur : <strong>{userName}</strong></span>
          </div>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9AB3A5', padding: '20px' }}>
            Aucun message dans cette conversation
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-avatar">{getAvatar(msg.role)}</div>
            <div className="message-content">
              <div className="message-text">{renderMessageContent(msg.content)}</div>
              <div className="message-time">{new Date(msg.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Zone de réponse — réduite, bouton sur la même ligne, aucune limite de caractères */}
      <form onSubmit={handleSendReply} className="reply-form">
        <textarea
          key={textareaKey}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Écrivez votre réponse ici..."
          rows={1}
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