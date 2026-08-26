import axios from 'axios';

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
}, (error) => {
  return Promise.reject(error);
});

export default api;
