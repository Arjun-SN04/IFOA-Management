import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize backend responses:
// Backend uses varied keys (user, users, project, projects, task, tasks, leave, leaves, etc.)
// Frontend expects everything under .data.data — this interceptor normalizes that.
const META_KEYS = new Set(['success', 'message', 'token', 'total', 'page', 'count']);

API.interceptors.response.use(
  (res) => {
    if (res.data && typeof res.data === 'object' && res.data.success !== undefined) {
      const raw = res.data;
      // If 'data' key already exists, leave it alone (announcements, notifications)
      if (raw.data !== undefined) return res;

      // Find the first key that is the actual payload
      for (const key of Object.keys(raw)) {
        if (!META_KEYS.has(key)) {
          raw.data = raw[key];
          break;
        }
      }
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;
