import axios from 'axios';
import { enqueueOperation } from './offlineSync';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use((response) => {
  const method = response.config.method.toUpperCase();
  const url = response.config.url;
  
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && !url.includes('/insights')) {
    localStorage.setItem('campusspend_ai_outdated', 'true');
  }
  return response;
}, async (error) => {
  if (!navigator.onLine && error.config && ['post', 'patch', 'put', 'delete'].includes(error.config.method)) {
    try {
      await enqueueOperation({
        url: error.config.url,
        method: error.config.method,
        data: error.config.data ? JSON.parse(error.config.data) : null
      });
      return Promise.resolve({ data: { success: true, offline: true, data: error.config.data ? JSON.parse(error.config.data) : null } });
    } catch(e) {
      console.error('Failed to enqueue', e);
    }
  }
  return Promise.reject(error);
});

export default api;
