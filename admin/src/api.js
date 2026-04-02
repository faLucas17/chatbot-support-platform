import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

export const getConversations = async () => {
  return axios.get(`${API_BASE}/admin/conversations/`);
};

export const getConversation = async (id) => {
  return axios.get(`${API_BASE}/admin/conversations/${id}/`);
};

export const replyToConversation = async (id, content) => {
  return axios.post(`${API_BASE}/admin/conversations/${id}/`, { content });
};