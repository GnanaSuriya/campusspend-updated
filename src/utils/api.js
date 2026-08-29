import axios from 'axios';
import { enqueueOperation, saveLocalData, getLocalData, getQueuedOperations, clearQueuedOperation } from './offlineSync';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
  
  if (method === 'GET' && response.data && response.data.success) {
    // Cache successful GET requests for offline use
    saveLocalData(url, response.data);
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
  } else if (!navigator.onLine && error.config && error.config.method.toLowerCase() === 'get') {
    // Serve from cache if offline
    try {
      const cachedData = await getLocalData(error.config.url);
      if (cachedData) {
        return Promise.resolve({ data: cachedData });
      }
    } catch(e) {
      console.error('Failed to read from cache', e);
    }
  }
  return Promise.reject(error);
});

export async function syncOfflineQueue() {
  if (!navigator.onLine) return;
  const queued = await getQueuedOperations();
  for (const op of queued) {
    try {
      await api({
        method: op.method,
        url: op.url,
        data: op.data
      });
      await clearQueuedOperation(op.id);
    } catch (err) {
      console.error("Failed to sync queued operation:", err);
      // If it's a 4xx error, it might be permanently invalid, so we might want to clear it eventually.
      // For now, keep it to retry later or clear if it's 400.
      if (err.response && err.response.status >= 400 && err.response.status < 500) {
          await clearQueuedOperation(op.id);
      }
    }
  }
}

export default api;
