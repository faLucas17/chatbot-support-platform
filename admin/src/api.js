import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

export const getConversations = async () => {
  try {
    const response = await axios.get(`${API_BASE}/admin/conversations/`);
    console.log('Conversations chargées:', response.data.length);
    return response;
  } catch (error) {
    console.error('Erreur getConversations:', error);
    throw error;
  }
};

export const getConversation = async (id) => {
  try {
    const response = await axios.get(`${API_BASE}/admin/conversations/${id}/`);
    return response;
  } catch (error) {
    console.error('Erreur getConversation:', error);
    throw error;
  }
};

export const replyToConversation = async (id, content) => {
  try {
    const response = await axios.post(`${API_BASE}/admin/conversations/${id}/`, { content });
    return response;
  } catch (error) {
    console.error('Erreur replyToConversation:', error);
    throw error;
  }
};