import React from 'react';

function ConversationList({ conversations, onSelect, selectedId }) {
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
              <div className="conv-id">#{conv.id}</div>
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