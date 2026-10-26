import axios from 'axios';

// URL de l'API Django (pas le frontend admin)
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://support-platform-api-0h06.onrender.com';

// ============================================================
// JETON DE CONNEXION
// Donné par Django après vérification de l'identifiant et du mot de passe.
// Sans lui, l'API d'administration répond 401.
// ============================================================
const CLE_JETON = 'easydesk_token';

export const getToken = () => localStorage.getItem(CLE_JETON);
const setToken = (token) => localStorage.setItem(CLE_JETON, token);
const clearToken = () => localStorage.removeItem(CLE_JETON);

export const isLoggedIn = () => Boolean(getToken());

// Instance axios : ajoute le jeton à chaque requête
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

// Jeton refusé ou expiré : on efface la session et on prévient l'application
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      clearToken();
      window.dispatchEvent(new Event('easydesk:session-expiree'));
    }
    return Promise.reject(error);
  }
);

// ============================================================
// CONNEXION / DÉCONNEXION
// ============================================================
export const login = async (email, password) => {
  const res = await axios.post(`${API_BASE}/api/admin/login/`, { email, password });
  setToken(res.data.token);
  return res.data;
};

export const logout = async () => {
  try {
    await api.post('/api/admin/logout/');
  } catch {
    // Même si le serveur ne répond pas, on ferme la session côté navigateur
  }
  clearToken();
};

// ============================================================
// DONNÉES
// Les conversations sont identifiées par leur identifiant public (UUID).
// ============================================================
export const getTenants = () => api.get('/api/tenants/');

export const getConversations = () => api.get('/admin/conversations/');

export const getConversation = (id) => api.get(`/admin/conversations/${id}/`);

export const replyToConversation = (id, content) =>
  api.post(`/admin/conversations/${id}/`, { content });

export const deleteConversation = (id) => api.delete(`/admin/conversations/${id}/delete/`);