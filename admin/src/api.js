import axios from 'axios';

// ✅ URL de production Render
const API_BASE = import.meta.env.VITE_API_BASE || 'https://support-platform-api-0h06.onrender.com';

// Gestion du username pour le filtrage
export const setUsername = (username) => {
  if (username) {
    localStorage.setItem('support_username', username);
  } else {
    localStorage.removeItem('support_username');
  }
};

export const setSupportUsername = setUsername;

export const getUsername = () => {
  return localStorage.getItem('support_username');
};

// Instance axios avec header username automatique
const axiosInstance = axios.create({ baseURL: API_BASE });

axiosInstance.interceptors.request.use((config) => {
  const username = getUsername();
  if (username) {
    config.headers['X-Support-Username'] = username;
  }
  return config;
});

export const getConversations = async () => {
  try {
    const response = await axiosInstance.get('/admin/conversations/');
    console.log('Conversations chargées:', response.data.length);
    return response;
  } catch (error) {
    console.error('Erreur getConversations:', error);
    throw error;
  }
};

export const getConversation = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/conversations/${id}/`);
    console.log(`✅ Conversation ${id} chargée`);
    return response;
  } catch (error) {
    console.error('Erreur getConversation:', error);
    throw error;
  }
};

export const replyToConversation = async (id, content) => {
  try {
    const response = await axiosInstance.post(`/admin/conversations/${id}/`, { content });
    console.log(`✅ Réponse envoyée pour la conversation ${id}`);
    return response;
  } catch (error) {
    console.error('Erreur replyToConversation:', error);
    throw error;
  }
};