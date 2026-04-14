import API from './axios';

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
  updatePassword: (data) => API.put('/auth/update-password', data),
};

export const userAPI = {
  getAll: (params) => API.get('/users', { params }),
  getById: (id) => API.get(`/users/${id}`),
  update: (id, data) => API.put(`/users/${id}`, data),
  delete: (id) => API.delete(`/users/${id}`),
  changeRole: (id, role) => API.put(`/users/${id}/role`, { role }),
  updateLeaveBalance: (id, data) => API.put(`/users/${id}/leave-balance`, data),
  getProfile: () => API.get('/users/profile'),
  updateProfile: (data) => API.put('/users/profile', data),
  toggleStatus: (id) => API.patch(`/users/${id}/toggle-status`),
};

export const projectAPI = {
  create: (data) => API.post('/projects', data),
  getAll: () => API.get('/projects'),
  getById: (id) => API.get(`/projects/${id}`),
  update: (id, data) => API.put(`/projects/${id}`, data),
  delete: (id) => API.delete(`/projects/${id}`),
  addMember: (id, data) => API.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => API.delete(`/projects/${id}/members/${userId}`),
  getStats: (id) => API.get(`/projects/${id}/stats`),
};

export const taskAPI = {
  create: (data) => API.post('/tasks', data),
  getAll: (params) => API.get('/tasks', { params }),
  getMy: () => API.get('/tasks/my'),
  getById: (id) => API.get(`/tasks/${id}`),
  update: (id, data) => API.put(`/tasks/${id}`, data),
  delete: (id) => API.delete(`/tasks/${id}`),
  updateStatus: (id, status) => API.patch(`/tasks/${id}/status`, { status }),
  assign: (id, assignee) => API.patch(`/tasks/${id}/assign`, { assignee }),
  logTime: (id, data) => API.post(`/tasks/${id}/log-time`, data),
};

export const leaveAPI = {
  apply: (data) => API.post('/leaves/apply', data),
  getMy: () => API.get('/leaves/my'),
  getAll: () => API.get('/leaves'),
  getBalance: () => API.get('/leaves/balance'),
  getCalendar: () => API.get('/leaves/calendar'),
  review: (id, data) => API.put(`/leaves/${id}/review`, data),
  cancel: (id) => API.put(`/leaves/${id}/cancel`),
};

export const sprintAPI = {
  create: (data) => API.post('/sprints', data),
  getAll: (params) => API.get('/sprints', { params }),
  getById: (id) => API.get(`/sprints/${id}`),
  update: (id, data) => API.put(`/sprints/${id}`, data),
  delete: (id) => API.delete(`/sprints/${id}`),
  start: (id) => API.patch(`/sprints/${id}/start`),
  complete: (id) => API.patch(`/sprints/${id}/complete`),
  getBoard: (id) => API.get(`/sprints/${id}/board`),
};

export const commentAPI = {
  add: (data) => API.post('/comments', data),
  getTaskComments: (taskId) => API.get(`/comments/task/${taskId}`),
  update: (id, data) => API.put(`/comments/${id}`, data),
  delete: (id) => API.delete(`/comments/${id}`),
  reply: (id, data) => API.post(`/comments/${id}/reply`, data),
};

export const notificationAPI = {
  getAll: () => API.get('/notifications'),
  getUnreadCount: () => API.get('/notifications/unread-count'),
  markRead: (id) => API.patch(`/notifications/${id}/read`),
  markAllRead: () => API.patch('/notifications/mark-all-read'),
  delete: (id) => API.delete(`/notifications/${id}`),
};

export const announcementAPI = {
  create: (data) => API.post('/announcements', data),
  getAll: () => API.get('/announcements'),
  getById: (id) => API.get(`/announcements/${id}`),
  update: (id, data) => API.put(`/announcements/${id}`, data),
  delete: (id) => API.delete(`/announcements/${id}`),
  pin: (id) => API.patch(`/announcements/${id}/pin`),
  togglePin: (id) => API.patch(`/announcements/${id}/pin`),
};

export const reportAPI = {
  getDashboard: () => API.get('/reports/dashboard'),
  getProjects: () => API.get('/reports/projects'),
  getProjectReport: () => API.get('/reports/projects'),
  getUsers: () => API.get('/reports/users'),
  getUserReport: () => API.get('/reports/users'),
  getLeaves: () => API.get('/reports/leaves'),
  getSprints: () => API.get('/reports/sprints'),
};
