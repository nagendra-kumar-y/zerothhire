import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Jobs API
export const jobsAPI = {
  getAll: (params) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  getUnprocessed: () => api.get('/jobs/unprocessed/list'),
  markProcessed: (id) => api.post(`/jobs/${id}/mark-processed`),
  getStats: () => api.get('/jobs/stats/summary'),
  sendEmail: (id) => api.post(`/jobs/${id}/send-email`),
  sendBatch: (jobIds) => api.post('/jobs/send-batch', { jobIds })
};

// Companies API
export const companiesAPI = {
  getAll: (params) => api.get('/companies', { params }),
  getById: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
  findCEO: (id) => api.post(`/companies/${id}/find-ceo`)
};

// Candidates API
export const candidatesAPI = {
  getAll: (params) => api.get('/candidates', { params }),
  getById: (id) => api.get(`/candidates/${id}`),
  create: (data) => api.post('/candidates', data),
  update: (id, data) => api.put(`/candidates/${id}`, data),
  delete: (id) => api.delete(`/candidates/${id}`),
  getCurated: (params) => api.get('/candidates/curated/list', { params }),
  bulkCreate: (data) => api.post('/candidates/bulk/create', data)
};

// Email Templates API
export const emailTemplatesAPI = {
  getAll: (params) => api.get('/email-templates', { params }),
  getById: (id) => api.get(`/email-templates/${id}`),
  create: (data) => api.post('/email-templates', data),
  update: (id, data) => api.put(`/email-templates/${id}`, data),
  delete: (id) => api.delete(`/email-templates/${id}`),
  clone: (id) => api.post(`/email-templates/${id}/clone`)
};

// Automation API
export const automationAPI = {
  getStatus: () => api.get('/automation/status'),
  start: (cronSchedule) => api.post('/automation/start', { cronSchedule }),
  stop: () => api.post('/automation/stop'),
  trigger: () => api.post('/automation/trigger'),
  processJob: (jobId) => api.post(`/automation/process-job/${jobId}`),
  getStats: () => api.get('/automation/stats')
};

export default api;
