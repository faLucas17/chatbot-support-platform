import React, { useState, useEffect } from 'react';
import { getConversation, replyToConversation } from '../api';

function ConversationDetail({ conversation, onUpdate }) {
  const [messages, setMessages] = useState(conversation.messages || []);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMessages(conversation.messages || []);
  }, [conversation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await getConversation(conversation.id);
      setMessages(res.data.messages);
    } catch (err) {
      console.error('Erreur rafraîchissement', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;

    setSending(true);
    try {
      await replyToConversation(conversation.id, reply);
      setReply('');
      const res = await getConversation(conversation.id);
      setMessages(res.data.messages);
      onUpdate({ ...conversation, messages: res.data.messages, escalated: false });
    } catch (err) {
      console.error('Erreur envoi réponse', err);
      alert('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const getAvatar = (role) => {
    return role === 'user' ? '👤' : '🤖';
  };

  return (
    <div className="conversation-detail">
      <div className="detail-header">
        <h2>Conversation #{conversation.id}</h2>
        <button onClick={handleRefresh} disabled={refreshing} className="refresh-btn">
          {refreshing ? '↻' : '⟳'} {!isMobile && 'Rafraîchir'}
        </button>
      </div>

      <div className="messages-container">
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
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Écrivez votre réponse ici..."
          rows={3}
        />
        <button type="submit" disabled={sending || !reply.trim()}>
          {sending ? 'Envoi...' : 'Envoyer la réponse'}
        </button>
      </form>
    </div>
  );
}

export default ConversationDetail;