import axios from 'axios';

const BASE_URL = 'https://slashit-g2og.onrender.com/api';
export const TOKEN_KEY = 'slashit_attendant_token';
const SESSION_KEY = 'slashit_attendant_session';

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response) {
      // 401 = token expired or invalid — clear session and redirect to login
      if (err.response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(SESSION_KEY);
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      const msg =
        err.response.data?.message ||
        err.response.data?.description ||
        `Server error (${err.response.status})`;
      const normalized = new Error(msg);
      normalized.status = err.response.status;
      normalized.data = err.response.data;
      return Promise.reject(normalized);
    }
    return Promise.reject(new Error('Cannot reach server. Check your connection.'));
  }
);

export const setAuthToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearAuthToken = () => localStorage.removeItem(TOKEN_KEY);
export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);
