import React, { useState, useEffect } from 'react';
import { getConversation, replyToConversation } from '../api';
import axios from 'axios';

// ── Logo EE stylisé (identique au frontend) ──────────────────
const BotAvatar = () => (
  <div style={{
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    background: '#ffffff',
    border: '2px solid rgba(21, 173, 132, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(21,173,132,0.12)',
  }}>
    <span style={{
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '-0.5px',
      background: 'linear-gradient(135deg, #15AD84 0%, #FF9900 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      lineHeight: 1,
    }}>EE</span>
  </div>
);

function ConversationDetail({ conversation, onUpdate }) {
  const [messages, setMessages] = useState(conversation.messages || []);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [userName, setUserName] = useState(conversation.user_name || 'Anonyme');
  const [textareaKey, setTextareaKey] = useState(0);

  // ✅ Nouvelle fonction pour obtenir le titre de la conversation
  const getConversationTitle = (messages, conversationId) => {
    if (!messages || messages.length === 0) {
      return `Conversation #${conversationId}`;
    }
    
    // Chercher le premier message de l'utilisateur
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      const content = firstUserMessage.content.trim();
      if (content.length > 50) {
        return content.substring(0, 50) + '...';
      }
      return content;
    }
    
    // Fallback: premier message
    const firstMessage = messages[0];
    if (firstMessage) {
      const content = firstMessage.content.trim();
      if (content.length > 50) {
        return content.substring(0, 50) + '...';
      }
      return content;
    }
    
    return `Conversation #${conversationId}`;
  };

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
      console.log(`✅ Réponse envoyée pour la conversation ${conversation.id}`);
      
      // ✅ Appel à Laravel pour marquer l'escalade comme résolue
      try {
        await axios.post('http://127.0.0.1:8000/api/chatbot/escalations/mark-resolved', {
          conversation_id: conversation.id
        });
        console.log(`✅ Escalade marquée comme résolue pour la conversation ${conversation.id}`);
      } catch (laravelErr) {
        console.warn('⚠️ Erreur Laravel (non bloquante):', laravelErr.message);
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
    return role === 'user' ? '👤' : <BotAvatar />;
  };

  return (
    <div className="conversation-detail">
      <div className="detail-header">
        <div>
          {/* ✅ MODIFICATION : Remplacer "Conversation #id" par le titre */}
          <h2>{getConversationTitle(messages, conversation.id)}</h2>
          <p className="conv-user-info">
            👤 Utilisateur: <strong>{userName}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.location.href = '/'} className="back-btn" style={{
            background: '#FF9900',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '5px 12px',
            cursor: 'pointer'
          }}>
            ← Retour
          </button>
          <button onClick={handleRefresh} disabled={refreshing} className="refresh-btn">
            {refreshing ? '↻' : '⟳'} {!isMobile && 'Rafraîchir'}
          </button>
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
              <div className="message-text">{msg.content}</div>
              <div className="message-time">{new Date(msg.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendReply} className="reply-form">
        <textarea
          key={textareaKey}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Écrivez votre réponse ici..."
          rows={3}
        />
        <button type="submit" disabled={sending || !reply.trim()}>
          {sending ? 'Envoi en cours...' : 'Envoyer la réponse'}
        </button>
      </form>
    </div>
  );
}

export default ConversationDetail;