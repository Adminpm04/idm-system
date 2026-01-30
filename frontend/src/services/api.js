import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Debug logging
  if (config.url?.includes('verify-2fa')) {
    console.log('[AXIOS DEBUG] Request config:', {
      url: config.url,
      method: config.method,
      data: config.data,
      dataStringified: JSON.stringify(config.data)
    });
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
  verify2fa: (sessionToken, code) => {
    const payload = { session_token: String(sessionToken), code: String(code) };
    console.log('[DEBUG] verify2fa payload:', payload);
    return api.post('/auth/verify-2fa', payload);
  },
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
  bulk: (data) => api.post('/requests/bulk', data),
  submit: (id) => api.post('/requests/' + id + '/submit'),
  approve: (id, data) => api.post('/requests/' + id + '/approve', data),
  addComment: (id, data) => api.post('/requests/' + id + '/comments', data),
  statistics: () => api.get('/requests/statistics'),
  searchSuggestions: (q) => api.get('/requests/search/suggestions', { params: { q } }),
  globalSearch: (params) => api.get('/requests/search/global', { params }),
  getRecommendations: (params) => api.get('/requests/recommendations', { params }),
  // Attachments
  listAttachments: (requestId) => api.get('/requests/' + requestId + '/attachments'),
  uploadAttachment: (requestId, file, description, attachmentType) => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    if (attachmentType) formData.append('attachment_type', attachmentType);
    return api.post('/requests/' + requestId + '/attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  downloadAttachment: (requestId, attachmentId) =>
    api.get('/requests/' + requestId + '/attachments/' + attachmentId + '/download', { responseType: 'blob' }),
  deleteAttachment: (requestId, attachmentId) =>
    api.delete('/requests/' + requestId + '/attachments/' + attachmentId),
};

export const adminAPI = {
  // Demo Users
  demoUsers: {
    list: () => api.get('/admin/demo-users'),
    create: (data) => api.post('/admin/demo-users', data),
    extend: (userId, minutes) => api.put('/admin/demo-users/' + userId + '/extend', { minutes }),
    delete: (userId) => api.delete('/admin/demo-users/' + userId),
    cleanup: () => api.post('/admin/demo-users/cleanup'),
  },
  roles: {
    list: () => api.get('/admin/roles'),
    get: (id) => api.get('/admin/roles/' + id),
    create: (data) => api.post('/admin/roles', data),
    update: (id, data) => api.put('/admin/roles/' + id, data),
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

export const exportAPI = {
  pdf: () => api.get('/export/pdf', { responseType: 'blob' }),
  word: () => api.get('/export/word', { responseType: 'blob' }),
  excel: () => api.get('/export/excel', { responseType: 'blob' }),
};

export const dashboardCardsAPI = {
  list: () => api.get('/dashboard-cards'),
  listAll: () => api.get('/dashboard-cards/all'),
  get: (id) => api.get('/dashboard-cards/' + id),
  create: (data) => api.post('/dashboard-cards', data),
  update: (id, data) => api.put('/dashboard-cards/' + id, data),
  delete: (id) => api.delete('/dashboard-cards/' + id),
  uploadIcon: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/dashboard-cards/upload-icon', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  reorder: (order) => api.post('/dashboard-cards/reorder', order),
};

// Segregation of Duties API
export const sodAPI = {
  // Check for SoD violations
  check: (userId, roleId) => api.post('/sod/check', { user_id: userId, role_id: roleId }),
  checkBulk: (userId, roleIds) => api.post('/sod/check-bulk', { user_id: userId, role_ids: roleIds }),
  getUserViolations: (userId) => api.get('/sod/user/' + userId + '/violations'),

  // Admin: Conflict rule management
  listConflicts: (params) => api.get('/sod/conflicts', { params }),
  createConflict: (data) => api.post('/sod/conflicts', data),
  updateConflict: (id, data) => api.put('/sod/conflicts/' + id, data),
  deleteConflict: (id) => api.delete('/sod/conflicts/' + id),
};
