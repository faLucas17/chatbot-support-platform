import React from 'react';

function ConversationList({ conversations, onSelect, selectedId }) {
  // ✅ MODIFICATION : Obtenir le titre de la conversation (premier message utilisateur)
  const getConversationTitle = (messages) => {
    if (!messages || messages.length === 0) return 'Nouvelle conversation';
    
    // Chercher le premier message de l'utilisateur
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      const content = firstUserMessage.content.trim();
      if (content.length > 45) {
        return content.substring(0, 45) + '...';
      }
      return content;
    }
    
    // Fallback: premier message (bot ou autre)
    const firstMessage = messages[0];
    if (firstMessage) {
      const content = firstMessage.content.trim();
      if (content.length > 45) {
        return content.substring(0, 45) + '...';
      }
      return content;
    }
    
    return 'Nouvelle conversation';
  };

  const getPreview = (messages) => {
    if (!messages || messages.length === 0) return 'Aucun message';
    const lastMessage = messages[messages.length - 1];
    return lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : '');
  };

  // Grouper les conversations par utilisateur
  const groupedConversations = conversations.reduce((acc, conv) => {
    const userName = conv.user_name || 'Anonyme';
    if (!acc[userName]) {
      acc[userName] = [];
    }
    acc[userName].push(conv);
    return acc;
  }, {});

  if (conversations.length === 0) {
    return (
      <div className="conversation-list">
        <h3>Conversations</h3>
        <p>Aucune conversation</p>
      </div>
    );
  }

  return (
    <div className="conversation-list">
      <h3>Conversations</h3>
      {Object.entries(groupedConversations).map(([userName, userConversations]) => (
        <div key={userName} className="user-section">
          <div className="user-section-header">
            <span className="user-avatar">👤</span>
            <span className="user-name">{userName}</span>
            <span className="user-count">{userConversations.length} conv.</span>
          </div>
          {userConversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${selectedId === conv.id ? 'active' : ''}`}
              onClick={() => onSelect(conv)}
            >
              {/* ✅ MODIFICATION : Remplacer #{conv.id} par le titre de la conversation */}
              <div className="conv-title">{getConversationTitle(conv.messages)}</div>
              <div className="conv-preview">{getPreview(conv.messages)}</div>
              <div className="conv-date">{new Date(conv.created_at).toLocaleString()}</div>
              {conv.escalated && <span className="badge">Escaladée</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default ConversationList;