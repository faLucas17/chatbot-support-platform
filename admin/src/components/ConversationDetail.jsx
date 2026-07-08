import React, { useState, useEffect } from 'react';
import { getConversation, replyToConversation } from '../api';
import axios from 'axios';

const LARAVEL_BASE = 'https://api-easyevent.bakeli.tech';

// ── Avatar de l'agent (photo Bakeli School of Technology intégrée en base64) ──
// Aucun fichier supplémentaire à ajouter : l'image est directement encodée ici.
const AGENT_AVATAR = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCABgAGADASIAAhEBAxEB/8QAHQAAAgEFAQEAAAAAAAAAAAAAAAEGAgQFBwgJA//EADMQAAEDAwMDAgUDAwUBAAAAAAECAxEABAUGEiEHMUETUQgUImGBMkJxFVLBFiMzQ2KR/8QAGQEBAAMBAQAAAAAAAAAAAAAAAAMEBQEC/8QAIBEAAgICAwADAQAAAAAAAAAAAAECAxESBCExEyJBUf/aAAwDAQACEQMRAD8A7I9pEUhE/emP80vBIoBzAnzQKSTx2oPA54oB8zyBSVECsNndW6WwJT/W9SYjGSsIHzd620dx8QogzzWnuq3xR6A0mh20087/AKryiSUhuzXttkH/ANPwQf4QFfiuNpenVFvw33+KO57VyxoH4xcFkMizZay029hGV8KvrV83LSD4KkbQsD7jd/Fbv6XdVdGdSXco3pPIO3Zxi0Jf9S3U1KVztWkK5KTtUJ47VxST8OuDXqJwZiaPxSSpK0ygyCJBHY054mvR5F9xTmB2pTxxTExQCUSKfjigzRBmgA9p7Vw98UnxBagyWrHNL6Kv8xp2zw9w6xePtulh+6fSrYR9JkNpgwJBMyRwK6S+KPUWR0t0UzmWw+fGEybYaFo+Nu9ay4mWkBQP1KTu7CRyfE15t5O+vMnkrnI5C6du7y6dU8++6rct1ajKlKPkk81FbJpYRNTDPbPldPO3V07dXTq37h1RW666orWtR7lSjySfc1RRRVbstBV5jcpk8YLkY3JXlkLpos3Hy76m/VbPJQraRuT9jVnRTOAdGfCT1wyWmdS2OjtVZq4d0xcJ+WskKY9VVq+taQ2AofWGzKhHIBI4Amu7ifEV5F2F3dY++Yv7F9bF3bOpeYdQfqQ4khSVD7ggGvVXpxnLXUmhsNm7PLNZdu6tG1qvG2/TDy9oC1bP2HcFSn9pkeKs1SysMq3Rw8okHijzNEEfxSkzxzUpCOPvNISDT7RSHvNAap+K+w0pd9EM7daut1u29g169mppRS43dmW2Sk/dSwkzxBM15uNoWtaG0iVqISAPJPFer2vsM9qHReYwduu0Q9fWTrDS7pj1mkLUkhKlI/cAYMfavN7CaIuMV1SvtMZtxhx3B3Ck3JZUVIcWhQAgkAlMkHtPFV7+lks8bt6kp0XoDH4+wDuatWLy9c5KVplLQ/tHv9zWSvNBaWunvUVjENHyGlKQD+Aa+juoMx82v0tIZV+2CoDiVoCz9/TJke8d6y2IyVtlLZT1ul5soUUONvNFtbavYg1lydi7ZrRVb6RjLbRWlrdJSjDWy57lyVn/AOk1DOpOhrOzxpymDtnUFpX++wiVJCIJKx7Af5qdZbUVnYXZskW1/f3iUhSreztlOqSD23EcCqcTnUZNTtrcYrI2DmwkIu2YDifMESJ9wea7GVi+34ckq5fX9Oeh3r0n+E5q7a6AaVF3bY+3C7UuMps0qSFNqUSla5/7FclRHBJ4riLoT0q1D1M1chOKsmRh7G7aVkrl9UNNt75LY8rWUgwkfkgV6WsMtMMoZYbQ002kIQ2hICUpAgAAcAAeK1aljsyL5J9FcEUx/NISO5oInipiAOB9qI4gmggHvTETFAICBXE/VhGIyPXbKak05uYavWfQu1LAlVw2dpdQj+1QR58pk/qiu2VED+a5r649JV4jJP62w9wyMcm49e5tVqIWyXFbV+nAhSCpYMGCk+SIAr8lScHgs8WUVP7ECvlf1TSmO08b0WbNpeC7fEAKulfTG89lQUAg9xJHavvnlpyl9eXdilm0bZl5SGRvQgLcSlLYJ7xNYq4eYYQFXLzTKCoJ3OLCUye0k8D81eqx2pPln2sXb3SRcoQ26BYqfCkpXvTASJBnyPFZqsnOOH4abrjCWyKkJRdaVv8AGMeizf3CEti6VEtDcr1JQQd29JgHunxVOo7hD9tj2rYMIesrFq2uHUyoXBbRt3rP959x2gTMmvjqDH5jA463vMrgcmlD7gZaLlqUKec2lUJCo8JUfYRzVpcqUuxPotrWtxAS02ByVHsmPeTEUlZPXVoKuDlsmbk+C44bE6JutPWzbqcq5cOZK6UoApcStQSjaR4SgIBB8mfNb/4iJg1pz4ZOnd7pDAv5XOsrZzF8kNlpcBTTSTP1AGNyjzHgBI8GtxQO9a9e2q2Me3XZ6gRxE0x4FEz4mgkDivZGHc0p5iKftNKRzMCKADHfmsVq7Cs6j01kMHcuLZavLdTRcT+pBPZQ+4MH8VcN5nEuMh5rKWK2yNwUH0kESRPftKVD8H2ptZXGOsG4byNoprmVh5O3gFR5n2BP8AmjWQng5G1hpXM6ZvjjNQWSIcBS28lO5i6T5KSft3SeR7RzUt6fdVXNE6Ibwlywcim1cWiyU/fPep6Z5S0AlpfCP0iVD6QB4rfWcGldR4u5xeTusbe2ikAutl9P0SAUqkGUnkEK4PIrR2W6RXruTUjSWqMHk7VYC0NXNzsfQkiRJQFBYjmYTxVB0WVSzV5/DQXIrtjraRXqFrK/1lfWl7kba2s2rJtYaabcUsJKo3rK1wSYAHYQJ96mXRLpveZXJ2Wqs2wq3xlssP2LCxCrpY5S4QezYPInlRg9u+U6e9M9OWD4y+q9Q4fKKtodTasPg2rX1Qlbij+s7hABATPgmtxtZrDurS23lrFa1AlKRcJJIBgkCeYPH4r1Vx5OXyW+ni3kxUfjq8MgBAFFWKMxiVuNtt5WxU47/wAaU3CCViQOBPPJHb3FIZ3CFW3+sY8qlXHzKJ+kwrz4PBq6Ui/BEnxQY70AgiQKJPigHzHbtVCxvbUkgkEQaqM+DToCDWnS/TVv6KknIqUwUFoqujCShRWggAAApUSocdyZmsjY6Jxdna/LIeu124a9MNLKCmPTW3MbeTsWRzIPEipREgGjie9AQ89O9PuWyLd83r7aCS2HbiShSo3KBiZO0d5+0DivvjdD4rG5Bq9tn771Ub53upUFhclwEbf3E7jEc9oHFSgGeY7U0k+aAjmK0fiMczdtMi4Wq7DaXnHHJUoI/SOwAjjx4q0V0/wS7f5V1V27bFW5TSnRtJ3qUCYTMgrVHP8AM1LqXbuYoCHW3TrAWrvqWS762Wl5L6djwIDqYKVgFJAggmO0qUSOeK2enuAbc3kXbgJSVIcelKilSSiRHO3YkD7e55qXEwaDPagCeO0UCn4ooD//2Q==";

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

function ConversationDetail({ conversation, onUpdate }) {
  const [messages, setMessages] = useState(conversation.messages || []);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [userName, setUserName] = useState(conversation.user_name || 'Anonyme');
  const [textareaKey, setTextareaKey] = useState(0);

  // Nouvelle fonction pour obtenir le titre de la conversation
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
        {/* Ligne principale : titre à gauche, actions à droite */}
        <div className="detail-header-main">
          <h2>{getConversationTitle(messages, conversation.id)}</h2>
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
        </div>

        {/* Ligne secondaire : info utilisateur alignée à droite */}
        <div className="detail-header-user">
          <UserIcon size={13} />
          <span>Utilisateur : <strong>{userName}</strong></span>
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