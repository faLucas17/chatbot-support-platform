import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

function ChatWidget({ apiKey, appName, position = 'bottom-right', primaryColor = '#0F3B2C', theme = 'light' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [showConversations, setShowConversations] = useState(false);
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  // Mode sombre/clair
  const isDark = theme === 'dark';
  
  // Styles dynamiques selon le thème
  const styles = {
    container: {
      position: 'fixed',
      ...(position === 'bottom-right' ? { right: '20px' } : { left: '20px' }),
      bottom: '20px',
      zIndex: 9999
    },
    button: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor === '#C9A87C' ? '#B8965A' : '#2D5A4A'} 100%)`,
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      fontSize: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transition: 'transform 0.2s'
    },
    window: {
      position: 'fixed',
      ...(position === 'bottom-right' ? { right: '20px' } : { left: '20px' }),
      bottom: '90px',
      width: '380px',
      height: '550px',
      background: isDark ? '#1A2420' : 'white',
      borderRadius: '16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },
    header: {
      background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor === '#C9A87C' ? '#B8965A' : '#2D5A4A'} 100%)`,
      color: 'white',
      padding: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    messagesContainer: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px',
      background: isDark ? '#1A2420' : '#F5F0E8'
    },
    messageUser: {
      justifyContent: 'flex-end'
    },
    messageBot: {
      justifyContent: 'flex-start'
    },
    bubbleUser: {
      maxWidth: '75%',
      padding: '10px 14px',
      borderRadius: '18px',
      background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor === '#C9A87C' ? '#B8965A' : '#2D5A4A'} 100%)`,
      color: 'white'
    },
    bubbleBot: {
      maxWidth: '75%',
      padding: '10px 14px',
      borderRadius: '18px',
      background: isDark ? '#2A3A32' : 'white',
      color: isDark ? '#F5F0E8' : '#2D3E35',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    },
    inputArea: {
      padding: '12px',
      borderTop: `1px solid ${isDark ? '#2A3A32' : '#E8E0D5'}`,
      display: 'flex',
      gap: '8px',
      background: isDark ? '#1E2A24' : 'white'
    },
    input: {
      flex: 1,
      padding: '10px 14px',
      border: `1px solid ${isDark ? '#3A4A42' : '#E8E0D5'}`,
      borderRadius: '24px',
      fontSize: '14px',
      outline: 'none',
      background: isDark ? '#2A3A32' : '#F5F0E8',
      color: isDark ? '#F5F0E8' : '#2D3E35'
    },
    sendButton: {
      padding: '8px 20px',
      background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor === '#C9A87C' ? '#B8965A' : '#2D5A4A'} 100%)`,
      color: 'white',
      border: 'none',
      borderRadius: '24px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600'
    },
    conversationList: {
      position: 'absolute',
      bottom: '70px',
      left: '20px',
      width: '280px',
      maxHeight: '300px',
      background: isDark ? '#1E2A24' : 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      overflowY: 'auto',
      zIndex: 10000
    },
    conversationItem: {
      padding: '12px',
      borderBottom: `1px solid ${isDark ? '#2A3A32' : '#E8E0D5'}`,
      cursor: 'pointer'
    }
  };

  // Charger l'historique des conversations
  useEffect(() => {
    if (conversationId) {
      loadConversation();
      loadConversationsList();
    }
  }, [conversationId]);

  // Polling toutes les 4 secondes
  useEffect(() => {
    if (conversationId && isOpen) {
      pollingRef.current = setInterval(() => {
        loadConversation();
        loadConversationsList();
      }, 4000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [conversationId, isOpen]);

  // Scroll automatique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversationsList = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/conversations/`);
      setConversations(res.data);
    } catch (err) {
      console.error('Erreur chargement conversations', err);
    }
  };

  const loadConversation = async () => {
    if (!conversationId) return;
    try {
      const res = await axios.get(`${API_BASE}/api/conversation/${conversationId}/`, {
        params: { api_key: apiKey }
      });
      setMessages(res.data.messages);
    } catch (err) {
      console.error('Erreur chargement conversation', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const tempUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const res = await axios.post(`${API_BASE}/api/message/`, {
        api_key: apiKey,
        conversation_id: conversationId,
        content: userMessage
      });

      if (res.data.conversation_id) {
        setConversationId(res.data.conversation_id);
      }

      if (res.data.bot_message) {
        setMessages(prev => [...prev, res.data.bot_message]);
      }
    } catch (err) {
      console.error('Erreur envoi message', err);
    } finally {
      setIsLoading(false);
      loadConversationsList();
    }
  };

  const switchConversation = (convId) => {
    setConversationId(convId);
    setShowConversations(false);
  };

  const getAvatar = (role) => role === 'user' ? '👤' : '🤖';

  return (
    <div style={styles.container}>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={styles.button}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          💬
        </button>
      )}

      {isOpen && (
        <div style={styles.window}>
          <div style={styles.header}>
            <div>
              <strong style={{ fontSize: '16px' }}>Support Client</strong>
              <p style={{ fontSize: '12px', margin: '4px 0 0 0', opacity: 0.8 }}>{appName}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowConversations(!showConversations)}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer' }}
                title="Historique des conversations"
              >
                📋
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          </div>

          {showConversations && (
            <div style={styles.conversationList}>
              <div style={{ padding: '12px', fontWeight: 'bold', borderBottom: `1px solid ${isDark ? '#2A3A32' : '#E8E0D5'}` }}>
                Conversations récentes
              </div>
              {conversations.length === 0 && (
                <div style={{ padding: '12px', textAlign: 'center', color: '#9AB3A5' }}>
                  Aucune conversation
                </div>
              )}
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  style={styles.conversationItem}
                  onClick={() => switchConversation(conv.id)}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '12px' }}>#{conv.id}</div>
                  <div style={{ fontSize: '12px', color: '#9AB3A5' }}>
                    {new Date(conv.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.messages?.[conv.messages.length - 1]?.content?.substring(0, 40) || '...'}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={styles.messagesContainer}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9AB3A5', marginTop: '40px' }}>
                <p>👋 Bonjour ! Comment puis-je vous aider ?</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', ...(msg.role === 'user' ? styles.messageUser : styles.messageBot), marginBottom: '12px' }}>
                <div style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot}>
                  <div style={{ fontSize: '14px', lineHeight: '1.4' }}>{msg.content}</div>
                  <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
                <div style={styles.bubbleBot}>
                  <div style={{ fontSize: '14px' }}>🤖 Bot est en train d'écrire...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} style={styles.inputArea}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrivez votre message..."
              style={styles.input}
            />
            <button type="submit" disabled={isLoading || !input.trim()} style={styles.sendButton}>
              Envoyer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ChatWidget;