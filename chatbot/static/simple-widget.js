(function() {
    let config = {};
    let conversationId = null;
    let messages = [];
    let pollingInterval = null;
    let conversations = [];
    let currentTheme = 'light';
    let searchQuery = '';
    let isChatOpen = false;
    let attachedFile = null;
    
    const API_BASE = 'http://127.0.0.1:8000';
    
    const themes = {
        light: {
            bg: '#F7F7F8',
            card: '#FFFFFF',
            text: '#1F1F1F',
            textSecondary: '#6E6E6E',
            border: '#E5E5E5',
            bubbleUser: '#C9A87C',
            bubbleBot: '#FFFFFF',
            headerBg: '#FFFFFF',
            activeBg: '#F0F0F0',
            hoverBg: '#F9F9F9',
            iconColor: '#888888',
            iconColorHover: '#555555',
            sidebarBg: '#FFFFFF',
            timeColor: '#999999'
        },
        dark: {
            bg: '#1E1E1E',
            card: '#2A2A2A',
            text: '#EDEDED',
            textSecondary: '#A0A0A0',
            border: '#3A3A3A',
            bubbleUser: '#C9A87C',
            bubbleBot: '#2A2A2A',
            headerBg: '#2A2A2A',
            activeBg: '#3A3A3A',
            hoverBg: '#333333',
            iconColor: '#888888',
            iconColorHover: '#AAAAAA',
            sidebarBg: '#2A2A2A',
            timeColor: '#666666'
        }
    };
    
    function t(key) { return themes[currentTheme][key]; }
    
    function formatTime(date) {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            background: ${isError ? '#E07A5F' : '#C9A87C'};
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 12px;
            z-index: 10001;
            animation: fadeOut 2s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
    
    function updateStyles() {
        let style = document.getElementById('claude-widget-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'claude-widget-styles';
            document.head.appendChild(style);
        }
        
        style.textContent = `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            .claude-fab {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, #C9A87C 0%, #B8965A 100%);
                color: white;
                border: none;
                cursor: pointer;
                font-size: 24px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9998;
                transition: all 0.2s;
            }
            .claude-fab:hover { transform: scale(1.05); }
            
            .claude-chat-panel {
                position: fixed;
                top: 0;
                right: -400px;
                width: 100%;
                max-width: 400px;
                height: 100%;
                background: ${t('bg')};
                z-index: 9999;
                transition: right 0.3s ease;
                display: flex;
                flex-direction: column;
                box-shadow: -2px 0 8px rgba(0,0,0,0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .claude-chat-panel.open { right: 0; }
            
            .claude-chat-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px;
                background: ${t('headerBg')};
                border-bottom: 1px solid ${t('border')};
            }
            .claude-chat-header-left {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .claude-menu-btn, .claude-close-btn, .claude-theme-btn {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: ${t('iconColor')};
                padding: 8px;
            }
            .claude-chat-title {
                font-weight: 600;
                font-size: 17px;
                color: ${t('text')};
            }
            
            .claude-sidebar {
                position: fixed;
                top: 0;
                left: -280px;
                width: 280px;
                height: 100%;
                background: ${t('sidebarBg')};
                z-index: 10000;
                transition: left 0.3s ease;
                display: flex;
                flex-direction: column;
                box-shadow: 2px 0 8px rgba(0,0,0,0.1);
            }
            .claude-sidebar.open { left: 0; }
            
            .claude-sidebar-header {
                padding: 20px;
                border-bottom: 1px solid ${t('border')};
            }
            .claude-new-chat {
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, #C9A87C 0%, #B8965A 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
            }
            .claude-search {
                padding: 12px 16px;
                border-bottom: 1px solid ${t('border')};
            }
            .claude-search input {
                width: 100%;
                padding: 10px 12px;
                background: ${t('bg')};
                border: 1px solid ${t('border')};
                border-radius: 10px;
                color: ${t('text')};
                font-size: 14px;
                outline: none;
            }
            .claude-search input::placeholder { color: ${t('textSecondary')}; }
            
            .claude-conversations {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
            }
            .claude-conv-item {
                padding: 12px;
                border-radius: 10px;
                cursor: pointer;
                margin-bottom: 4px;
                transition: background 0.2s;
            }
            .claude-conv-item:hover { background: ${t('hoverBg')}; }
            .claude-conv-item.active { background: ${t('activeBg')}; }
            .claude-conv-title {
                font-size: 14px;
                font-weight: 500;
                color: ${t('text')};
                margin-bottom: 4px;
            }
            .claude-conv-preview {
                font-size: 12px;
                color: ${t('textSecondary')};
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .claude-conv-date {
                font-size: 10px;
                color: ${t('textSecondary')};
                margin-top: 4px;
            }
            
            .claude-chat-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .claude-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }
            
            .claude-message-wrapper {
                display: flex;
                flex-direction: column;
                margin-bottom: 24px;
            }
            .claude-message-wrapper.user { align-items: flex-end; }
            .claude-message-wrapper.bot { align-items: flex-start; }
            
            .claude-message-bubble {
                max-width: 85%;
                padding: 10px 14px;
                border-radius: 18px;
                font-size: 14px;
                line-height: 1.4;
                word-wrap: break-word;
                white-space: pre-wrap;
            }
            .claude-message-wrapper.user .claude-message-bubble {
                background: linear-gradient(135deg, #C9A87C 0%, #B8965A 100%);
                color: white;
            }
            .claude-message-wrapper.bot .claude-message-bubble {
                background: ${t('bubbleBot')};
                color: ${t('text')};
                border: 1px solid ${t('border')};
            }
            
            .claude-message-time {
                font-size: 10px;
                color: ${t('timeColor')};
                margin-top: 4px;
                margin-bottom: 4px;
            }
            .claude-message-wrapper.user .claude-message-time {
                text-align: right;
            }
            .claude-message-wrapper.bot .claude-message-time {
                text-align: left;
            }
            
            .claude-message-actions {
                display: flex;
                gap: 12px;
                margin-top: 4px;
                opacity: 0;
                transition: opacity 0.2s;
            }
            .claude-message-wrapper.user .claude-message-actions {
                justify-content: flex-end;
            }
            .claude-message-wrapper.bot .claude-message-actions {
                justify-content: flex-start;
            }
            .claude-message-wrapper:hover .claude-message-actions {
                opacity: 1;
            }
            .claude-action-btn {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 14px;
                padding: 4px;
                border-radius: 4px;
                color: ${t('iconColor')};
                transition: all 0.2s;
            }
            .claude-action-btn:hover {
                color: ${t('iconColorHover')};
                transform: scale(1.05);
            }
            
            .claude-input-area {
                padding: 12px;
                border-top: 1px solid ${t('border')};
                background: ${t('card')};
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .claude-input-row {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .claude-attach-btn {
                background: none;
                border: none;
                font-size: 22px;
                cursor: pointer;
                color: ${t('iconColor')};
                padding: 8px;
                border-radius: 50%;
                transition: all 0.2s;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .claude-attach-btn:hover {
                background: ${t('hoverBg')};
                color: ${t('iconColorHover')};
            }
            .claude-input {
                flex: 1;
                padding: 10px 14px;
                border: 1px solid ${t('border')};
                border-radius: 24px;
                font-size: 14px;
                outline: none;
                background: ${t('bg')};
                color: ${t('text')};
            }
            .claude-send {
                padding: 8px 20px;
                background: linear-gradient(135deg, #C9A87C 0%, #B8965A 100%);
                color: white;
                border: none;
                border-radius: 24px;
                cursor: pointer;
                font-weight: 600;
            }
            .claude-send:disabled { opacity: 0.5; }
            
            .claude-attached-file {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: ${t('bg')};
                border-radius: 20px;
                font-size: 12px;
                color: ${t('text')};
                border: 1px solid ${t('border')};
                margin-bottom: 8px;
            }
            .claude-remove-file {
                background: none;
                border: none;
                cursor: pointer;
                color: ${t('iconColor')};
                font-size: 14px;
            }
            
            .claude-attach-menu {
                position: absolute;
                bottom: 70px;
                left: 20px;
                background: ${t('card')};
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                overflow: hidden;
                z-index: 10002;
                display: none;
            }
            .claude-attach-menu.show {
                display: block;
            }
            .claude-attach-menu-item {
                padding: 12px 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                transition: background 0.2s;
                color: ${t('text')};
                font-size: 14px;
            }
            .claude-attach-menu-item:hover {
                background: ${t('hoverBg')};
            }
            
            .claude-loader {
                text-align: center;
                padding: 8px;
                color: ${t('textSecondary')};
                font-size: 12px;
            }
            
            .file-input {
                display: none;
            }
            
            .claude-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9998;
                display: none;
            }
            .claude-overlay.visible { display: block; }
            
            @keyframes fadeOut {
                0% { opacity: 1; }
                70% { opacity: 1; }
                100% { opacity: 0; visibility: hidden; }
            }
        `;
    }
    
    // ==================== FONCTIONS DES ICÔNES ====================
    
    function copyMessage(text) {
        navigator.clipboard.writeText(text);
        showToast('✓ Message copié');
    }
    
    function editMessage(index, oldContent) {
        const newContent = prompt('Modifier votre message :', oldContent);
        if (newContent && newContent.trim() !== oldContent && newContent.trim() !== '') {
            const loader = document.getElementById('claude-loader');
            if (loader) loader.style.display = 'block';
            
            fetch(`${API_BASE}/api/message/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    api_key: config.apiKey, 
                    conversation_id: conversationId, 
                    content: newContent.trim() 
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.conversation_id) conversationId = data.conversation_id;
                if (loader) loader.style.display = 'none';
                loadMessages();
                loadConversations();
            })
            .catch(err => { console.error(err); if (loader) loader.style.display = 'none'; });
        }
    }
    
    function regenerateResponse() {
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        if (lastUserMessage) {
            const loader = document.getElementById('claude-loader');
            if (loader) loader.style.display = 'block';
            
            fetch(`${API_BASE}/api/message/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    api_key: config.apiKey, 
                    conversation_id: conversationId, 
                    content: lastUserMessage.content 
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.conversation_id) conversationId = data.conversation_id;
                if (loader) loader.style.display = 'none';
                loadMessages();
                loadConversations();
            })
            .catch(err => { console.error(err); if (loader) loader.style.display = 'none'; });
        }
    }
    
    window.copyMessage = copyMessage;
    window.editMessage = editMessage;
    window.regenerateResponse = regenerateResponse;
    
    // ==================== FONCTIONS UPLOAD ====================
    
    function attachFile(file) {
        if (!file) return;
        
        const allowedTypes = ['.txt', '.pdf', '.png', '.jpg', '.jpeg'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExt)) {
            showToast('❌ Format non supporté. Utilisez TXT, PDF ou image.', true);
            return;
        }
        
        attachedFile = file;
        
        const attachContainer = document.getElementById('claude-attached-container');
        if (attachContainer) {
            attachContainer.innerHTML = `
                <div class="claude-attached-file">
                    <span>📄 ${file.name}</span>
                    <button class="claude-remove-file" onclick="removeAttachedFile()">✕</button>
                </div>
            `;
        }
        
        showToast(`📎 ${file.name} attaché`);
    }
    
    function removeAttachedFile() {
        attachedFile = null;
        const attachContainer = document.getElementById('claude-attached-container');
        if (attachContainer) {
            attachContainer.innerHTML = '';
        }
    }
    
    function uploadAttachedFile() {
        if (!attachedFile) return;
        
        const formData = new FormData();
        formData.append('api_key', config.apiKey);
        formData.append('title', attachedFile.name);
        formData.append('file', attachedFile);
        
        showToast('📤 Upload du document...');
        
        fetch(`${API_BASE}/api/documents/upload/`, {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast(`✓ Document "${data.title}" uploadé avec succès !`);
                removeAttachedFile();
                loadConversations();
            } else {
                showToast('❌ Erreur lors de l\'upload', true);
            }
        })
        .catch(err => {
            console.error(err);
            showToast('❌ Erreur lors de l\'upload', true);
        });
    }
    
    function takePhoto() {
        const cameraInput = document.createElement('input');
        cameraInput.type = 'file';
        cameraInput.accept = 'image/*';
        cameraInput.capture = 'environment';
        cameraInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                attachFile(e.target.files[0]);
            }
        };
        cameraInput.click();
    }
    
    window.removeAttachedFile = removeAttachedFile;
    window.uploadAttachedFile = uploadAttachedFile;
    
    // ==================== FONCTIONS PRINCIPALES ====================
    
    function loadConversations() {
        fetch(`${API_BASE}/admin/conversations/`)
            .then(res => res.json())
            .then(data => {
                conversations = data;
                renderConversations();
            })
            .catch(err => console.error(err));
    }
    
    function renderConversations() {
        const container = document.getElementById('claude-conv-list');
        if (!container) return;
        
        let filtered = conversations;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = conversations.filter(conv => {
                const lastMsg = conv.messages?.[conv.messages.length-1]?.content || '';
                return lastMsg.toLowerCase().includes(q) || `#${conv.id}`.includes(q);
            });
        }
        
        if (filtered.length === 0) {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:#9AB3A5">Aucune discussion</div>';
            return;
        }
        
        container.innerHTML = filtered.map(conv => `
            <div class="claude-conv-item ${conv.id === conversationId ? 'active' : ''}" onclick="window.switchConv(${conv.id})">
                <div class="claude-conv-title">Conversation ${conv.id}</div>
                <div class="claude-conv-preview">${(conv.messages?.[conv.messages.length-1]?.content || 'Nouvelle discussion').substring(0, 45)}</div>
                <div class="claude-conv-date">${new Date(conv.created_at).toLocaleDateString()}</div>
            </div>
        `).join('');
    }
    
    window.switchConv = function(id) {
        conversationId = id;
        loadMessages();
        renderConversations();
        closeSidebar();
    };
    
    function newChat() {
        conversationId = null;
        messages = [];
        renderMessages();
        closeSidebar();
    }
    
    function loadMessages() {
        if (!conversationId) return;
        fetch(`${API_BASE}/api/conversation/${conversationId}/?api_key=${config.apiKey}`)
            .then(res => res.json())
            .then(data => {
                messages = data.messages || [];
                renderMessages();
            })
            .catch(err => console.error(err));
    }
    
    function renderMessages() {
    const container = document.getElementById('claude-messages');
    if (!container) return;
    container.innerHTML = '';
    if (messages.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#9AB3A5;margin-top:40px"><p>👋 Comment puis-je vous aider ?</p></div>';
    return;
}
    
    messages.forEach((msg, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = `claude-message-wrapper ${msg.role}`;
        
        // Bulle avec le message
        const bubble = document.createElement('div');
        bubble.className = 'claude-message-bubble';
        bubble.innerHTML = `<div style="white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(msg.content)}</div>`;
        
        // Heure
        const timeDiv = document.createElement('div');
        timeDiv.className = 'claude-message-time';
        timeDiv.textContent = formatTime(msg.created_at);
        
        // Conteneur des actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'claude-message-actions';
        
        // Bouton Copier (fonctionne pour tous)
        const copyBtn = document.createElement('button');
        copyBtn.className = 'claude-action-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.title = 'Copier';
        copyBtn.onclick = (function(content) {
            return function() { copyMessage(content); };
        })(msg.content);
        actionsDiv.appendChild(copyBtn);
        
        if (msg.role === 'user') {
            // Bouton Modifier (pour user)
            const editBtn = document.createElement('button');
            editBtn.className = 'claude-action-btn';
            editBtn.innerHTML = '✏️';
            editBtn.title = 'Modifier';
            editBtn.onclick = (function(content, index) {
                return function() { editMessage(index, content); };
            })(msg.content, idx);
            actionsDiv.appendChild(editBtn);
        } else {
            // Bouton Régénérer (pour bot)
            const regenBtn = document.createElement('button');
            regenBtn.className = 'claude-action-btn';
            regenBtn.innerHTML = '🔄';
            regenBtn.title = 'Régénérer';
            regenBtn.onclick = function() { regenerateResponse(); };
            actionsDiv.appendChild(regenBtn);
        }
        
        wrapper.appendChild(bubble);
        wrapper.appendChild(timeDiv);
        wrapper.appendChild(actionsDiv);
        container.appendChild(wrapper);
    });
    
    container.scrollTop = container.scrollHeight;
}
    
    function escapeHtml(t) {
        const div = document.createElement('div');
        div.textContent = t;
        return div.innerHTML;
    }
    
    function sendMessage() {
    const textarea = document.getElementById('claude-input');
    let msg = textarea.value.trim();
    
    if (attachedFile) {
        uploadAttachedFile();
        setTimeout(() => {
            if (msg) {
                sendTextMessage(msg);
                textarea.value = '';
                textarea.style.height = 'auto';
            }
        }, 1500);
    } else if (msg) {
        sendTextMessage(msg);
        textarea.value = '';
        textarea.style.height = 'auto';
    }
}
    
    function sendTextMessage(msg) {
        const loader = document.getElementById('claude-loader');
        if (loader) loader.style.display = 'block';
        
        messages.push({ id: Date.now(), role: 'user', content: msg, created_at: new Date().toISOString() });
        renderMessages();
        
        fetch(`${API_BASE}/api/message/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: config.apiKey, conversation_id: conversationId, content: msg })
        })
        .then(res => res.json())
        .then(data => {
            if (data.conversation_id) conversationId = data.conversation_id;
            if (data.bot_message) messages.push(data.bot_message);
            renderMessages();
            if (loader) loader.style.display = 'none';
            loadMessages();
            loadConversations();
        })
        .catch(err => { console.error(err); if (loader) loader.style.display = 'none'; });
    }
    
    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(() => {
            if (conversationId) loadMessages();
            loadConversations();
        }, 4000);
    }
    
    function toggleTheme() {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        updateStyles();
        const btn = document.getElementById('claude-theme-btn');
        if (btn) btn.textContent = currentTheme === 'light' ? '🌙' : '☀️';
        const panel = document.getElementById('claude-chat-panel');
        if (panel) panel.style.background = t('bg');
    }
    
    function openChat() {
    // Rediriger vers le dashboard complet
    window.location.href = '/dashboard/full/';
}
    
    function closeChat() {
        const panel = document.getElementById('claude-chat-panel');
        const fab = document.getElementById('claude-fab');
        if (panel) {
            panel.classList.remove('open');
            isChatOpen = false;
            if (fab) fab.style.display = 'flex';
            if (pollingInterval) clearInterval(pollingInterval);
        }
        closeSidebar();
    }
    
    function toggleSidebar() {
        const sidebar = document.getElementById('claude-sidebar');
        const overlay = document.getElementById('claude-overlay');
        if (sidebar) {
            const isOpen = sidebar.classList.contains('open');
            if (isOpen) {
                sidebar.classList.remove('open');
                overlay.classList.remove('visible');
            } else {
                sidebar.classList.add('open');
                overlay.classList.add('visible');
            }
        }
    }
    
    function closeSidebar() {
        const sidebar = document.getElementById('claude-sidebar');
        const overlay = document.getElementById('claude-overlay');
        if (sidebar) {
            sidebar.classList.remove('open');
            overlay.classList.remove('visible');
        }
    }
    
    // ==================== INITIALISATION ====================
    
    window.ChatWidget = {
        init: function(cfg) {
            config = cfg;
            currentTheme = cfg.theme || 'light';
            updateStyles();
            
            const fab = document.createElement('button');
            fab.id = 'claude-fab';
            fab.className = 'claude-fab';
            fab.innerHTML = '💬';
            fab.onclick = openChat;
            document.body.appendChild(fab);
            
            const overlay = document.createElement('div');
            overlay.id = 'claude-overlay';
            overlay.className = 'claude-overlay';
            overlay.onclick = closeSidebar;
            document.body.appendChild(overlay);
            
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'claude-file-input';
            fileInput.className = 'file-input';
            fileInput.accept = '.txt,.pdf,.png,.jpg,.jpeg';
            fileInput.onchange = (e) => {
                if (e.target.files && e.target.files[0]) {
                    attachFile(e.target.files[0]);
                    fileInput.value = '';
                }
                document.getElementById('claude-attach-menu').classList.remove('show');
            };
            document.body.appendChild(fileInput);
            
            const chatPanel = document.createElement('div');
            chatPanel.id = 'claude-chat-panel';
            chatPanel.className = 'claude-chat-panel';
            chatPanel.innerHTML = `
                <div class="claude-sidebar" id="claude-sidebar">
                    <div class="claude-sidebar-header">
                        <button class="claude-new-chat" id="claude-new-btn">+ Nouvelle discussion</button>
                    </div>
                    <div class="claude-search">
                        <input type="text" id="claude-search" placeholder="Rechercher..." autocomplete="off">
                    </div>
                    <div id="claude-conv-list" class="claude-conversations"></div>
                </div>
                <div class="claude-chat-header">
                    <div class="claude-chat-header-left">
                        <button class="claude-menu-btn" id="claude-menu-toggle">☰</button>
                        <span class="claude-chat-title">${config.appName || 'Support IA'}</span>
                    </div>
                    <div>
                        <button class="claude-theme-btn" id="claude-theme-btn">${currentTheme === 'light' ? '🌙' : '☀️'}</button>
                        <button class="claude-close-btn" id="claude-close-btn">✕</button>
                    </div>
                </div>
                <div class="claude-chat-content">
                    <div id="claude-messages" class="claude-messages"></div>
                    <div id="claude-loader" class="claude-loader" style="display:none">🤖 Réfléchit...</div>
                    <div class="claude-input-area">
                        <div id="claude-attached-container"></div>
                        <div class="claude-input-row">
                            <button class="claude-attach-btn" id="claude-attach-btn" title="Ajouter un fichier">+</button>
                            <div class="claude-attach-menu" id="claude-attach-menu">
                                <div class="claude-attach-menu-item" id="attach-document-btn">📄 Upload document</div>
                                <div class="claude-attach-menu-item" id="attach-photo-btn">📸 Prendre une photo</div>
                            </div>
                            <textarea id="claude-input" class="claude-input" placeholder="Posez votre question..." rows="1" style="resize: none; overflow-y: hidden;"></textarea>
                            <button id="claude-send" class="claude-send">Envoyer</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(chatPanel);

// Auto-resize du textarea
const textarea = document.getElementById('claude-input');
if (textarea) {
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });
}
            
            document.getElementById('claude-close-btn').onclick = closeChat;
            document.getElementById('claude-send').onclick = sendMessage;
            document.getElementById('claude-input').onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
            document.getElementById('claude-menu-toggle').onclick = toggleSidebar;
            document.getElementById('claude-new-btn').onclick = () => newChat();
            document.getElementById('claude-theme-btn').onclick = toggleTheme;
            
            const attachBtn = document.getElementById('claude-attach-btn');
            const attachMenu = document.getElementById('claude-attach-menu');
            
            attachBtn.onclick = (e) => {
                e.stopPropagation();
                attachMenu.classList.toggle('show');
            };
            
            document.getElementById('attach-document-btn').onclick = () => {
                document.getElementById('claude-file-input').click();
                attachMenu.classList.remove('show');
            };
            
            document.getElementById('attach-photo-btn').onclick = () => {
                takePhoto();
                attachMenu.classList.remove('show');
            };
            
            document.addEventListener('click', (e) => {
                if (!attachBtn.contains(e.target) && !attachMenu.contains(e.target)) {
                    attachMenu.classList.remove('show');
                }
            });
            
            const search = document.getElementById('claude-search');
            if (search) {
                search.oninput = (e) => {
                    searchQuery = e.target.value;
                    renderConversations();
                };
            }
            
            console.log('✅ Widget initialisé !');
        }
    };
})();