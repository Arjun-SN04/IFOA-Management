import API from './axios';

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
  updatePassword: (data) => API.put('/auth/update-password', data),
  forgotPassword: (data) => API.post('/auth/forgot-password', data),
  resetPassword: (token, data) => API.put(`/auth/reset-password/${token}`, data),
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
  // FIX: registered as PATCH in updated userRoutes.js
  toggleStatus: (id) => API.patch(`/users/${id}/toggle-status`),
};

export const projectAPI = {
  create: (data) => API.post('/projects', data),
  getAll: (params) => API.get('/projects', { params }),
  getById: (id) => API.get(`/projects/${id}`),
  update: (id, data) => API.put(`/projects/${id}`, data),
  archive: (id) => API.delete(`/projects/${id}`),
  addMember: (id, data) => API.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => API.delete(`/projects/${id}/members/${userId}`),
  getStats: (id) => API.get(`/projects/${id}/stats`),
};

export const taskAPI = {
  create: (data) => API.post('/tasks', data),
  getAll: (params) => API.get('/tasks', { params }),
  // FIX: backend route is /tasks/my (matches router.get('/my', ...))
  getMy: () => API.get('/tasks/my'),
  getById: (id) => API.get(`/tasks/${id}`),
  update: (id, data) => API.put(`/tasks/${id}`, data),
  delete: (id) => API.delete(`/tasks/${id}`),
  updateStatus: (id, status, order) => API.patch(`/tasks/${id}/status`, { status, order }),
  assign: (id, assignee) => API.patch(`/tasks/${id}/assign`, { assignee }),
  logTime: (id, data) => API.post(`/tasks/${id}/log-time`, data),
};

export const leaveAPI = {
  apply: (data) => API.post('/leaves/apply', data),
  getMy: () => API.get('/leaves/my'),
  getAll: (params) => API.get('/leaves', { params }),
  getBalance: () => API.get('/leaves/balance'),
  getCalendar: () => API.get('/leaves/calendar'),
  review: (id, data) => API.put(`/leaves/${id}/review`, data),
  cancel: (id) => API.put(`/leaves/${id}/cancel`),
};

export const sprintAPI = {
  create: (data) => API.post('/sprints', data),
  getAll: (params) => API.get('/sprints', { params }),
  update: (id, data) => API.put(`/sprints/${id}`, data),
  start: (id) => API.patch(`/sprints/${id}/start`),
  complete: (id) => API.patch(`/sprints/${id}/complete`),
  getBoard: (id) => API.get(`/sprints/${id}/board`),
};

export const commentAPI = {
  add: (data) => API.post('/comments', data),
  // FIX: backend uses query param ?task=id, not path /comments/task/:id
  getTaskComments: (taskId) => API.get('/comments', { params: { task: taskId } }),
  update: (id, data) => API.put(`/comments/${id}`, data),
  delete: (id) => API.delete(`/comments/${id}`),
  // FIX: no /reply route on backend — replies are just comments with a parentComment field
  reply: (parentId, data) => API.post('/comments', { ...data, parentComment: parentId }),
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
  togglePin: (id) => API.patch(`/announcements/${id}/pin`),
};

export const reportAPI = {
  getDashboard: () => API.get('/reports/dashboard'),
  getProjectReport: () => API.get('/reports/projects'),
  getUserReport: () => API.get('/reports/users'),
  getLeaveReport: () => API.get('/reports/leaves'),
  getSprintReport: () => API.get('/reports/sprints'),
};
