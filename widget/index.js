import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './ChatWidget';

window.ChatWidget = {
  init: (config) => {
    const { apiKey, appName, position, primaryColor, theme = 'light' } = config;
    
    const container = document.createElement('div');
    container.id = 'chat-widget-root';
    document.body.appendChild(container);
    
    const root = ReactDOM.createRoot(container);
    root.render(
      React.createElement(ChatWidget, {
        apiKey: apiKey,
        appName: appName,
        position: position || 'bottom-right',
        primaryColor: primaryColor || '#0F3B2C',
        theme: theme
      })
    );
  }
};