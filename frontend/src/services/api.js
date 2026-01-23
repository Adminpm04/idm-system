import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue requests while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });
          const newToken = response.data.access_token;
          localStorage.setItem('access_token', newToken);
          if (response.data.refresh_token) {
            localStorage.setItem('refresh_token', response.data.refresh_token);
          }
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          if (window.location.pathname !== '/login') {
            window.location.assign('/login');
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        localStorage.removeItem('access_token');
        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  getMe: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
};

export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get('/users/' + id),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put('/users/' + id, data),
  delete: (id) => api.delete('/users/' + id),
  changePassword: (id, data) => api.post('/users/' + id + '/change-password', data),
};

export const systemsAPI = {
  list: (params) => api.get('/systems', { params }),
  get: (id) => api.get('/systems/' + id),
  getRoles: (id) => api.get('/systems/' + id + '/roles'),
  create: (data) => api.post('/systems', data),
  update: (id, data) => api.put('/systems/' + id, data),
  delete: (id) => api.delete('/systems/' + id),
};

export const requestsAPI = {
  myRequests: (params) => api.get('/requests/my-requests', { params }),
  myApprovals: (params) => api.get('/requests/my-approvals', { params }),
  myDecisions: (params) => api.get('/requests/my-decisions', { params }),
  get: (id) => api.get('/requests/' + id),
  create: (data) => api.post('/requests', data),
  submit: (id) => api.post('/requests/' + id + '/submit'),
  approve: (id, data) => api.post('/requests/' + id + '/approve', data),
  addComment: (id, data) => api.post('/requests/' + id + '/comments', data),
  statistics: () => api.get('/requests/statistics'),
  searchSuggestions: (q) => api.get('/requests/search/suggestions', { params: { q } }),
  globalSearch: (params) => api.get('/requests/search/global', { params }),
};

export const adminAPI = {
  roles: {
    list: () => api.get('/admin/roles'),
    create: (data) => api.post('/admin/roles', data),
    delete: (id) => api.delete('/admin/roles/' + id),
  },
  permissions: {
    list: () => api.get('/admin/permissions'),
  },
  auditLogs: {
    list: (params) => api.get('/admin/audit-logs', { params }),
  },
};

export default api;

export const subsystemsAPI = {
  list: (systemId) => api.get('/systems/' + systemId + '/subsystems'),
  create: (data) => api.post('/subsystems', data),
  update: (id, data) => api.put('/subsystems/' + id, data),
  delete: (id) => api.delete('/subsystems/' + id),
};

export const approvalChainAPI = {
  listBySystem: (systemId) => api.get('/systems/' + systemId + '/approval-chain'),
  create: (data) => api.post('/approval-chain', data),
  delete: (id) => api.delete('/approval-chain/' + id),
};
