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
  getMyAccessories: () => API.get('/users/me/accessories'),
  getAccessories: (id) => API.get(`/users/${id}/accessories`),
  addAccessory: (id, data) => API.post(`/users/${id}/accessories`, data),
  updateAccessory: (id, accessoryId, data) => API.put(`/users/${id}/accessories/${accessoryId}`, data),
  removeAccessory: (id, accessoryId) => API.delete(`/users/${id}/accessories/${accessoryId}`),
  toggleStatus: (id) => API.patch(`/users/${id}/toggle-status`),
  approveUser: (id, approved, reason) => API.patch(`/users/${id}/approve`, { approved, reason }),
  getPending: () => API.get('/users/pending'),
  updateEmployeeId: (id, employeeId) => API.patch(`/users/${id}/employee-id`, { employeeId }),
};

export const nocAPI = {
  create: (data) => API.post('/nocs', data),
  getAll: (params) => API.get('/nocs', { params }),
  review: (id, data) => API.patch(`/nocs/${id}/review`, data),
  delete: (id) => API.delete(`/nocs/${id}`),
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
  assignTeam: (id, teamId) => API.post(`/projects/${id}/teams`, { teamId }),
  removeTeam: (id, teamId) => API.delete(`/projects/${id}/teams/${teamId}`),
};

export const taskAPI = {
  create: (data) => API.post('/tasks', data),
  getAll: (params) => API.get('/tasks', { params }),
  getMy: () => API.get('/tasks/my'),
  getAssignableUsers: () => API.get('/tasks/assignable-users'),
  getById: (id) => API.get(`/tasks/${id}`),
  update: (id, data) => API.put(`/tasks/${id}`, data),
  delete: (id) => API.delete(`/tasks/${id}`),
  updateStatus: (id, status, order) => API.patch(`/tasks/${id}/status`, { status, order }),
  assign: (id, assignee) => API.patch(`/tasks/${id}/assign`, { assignee }),
  logTime: (id, data) => API.post(`/tasks/${id}/log-time`, data),
  assignSprint: (id, sprintId) => API.patch(`/tasks/${id}/sprint`, { sprintId }),
};

export const leaveAPI = {
  apply: (data) => API.post('/leaves/apply', data),
  adminCreate: (data) => API.post('/leaves/admin/create', data),
  adminDelete: (id) => API.delete(`/leaves/admin/${id}`),   // admin-only remove
  selfMark: (data) => API.post('/leaves/self-mark', data),
  getMy: () => API.get('/leaves/my'),
  getAll: (params) => API.get('/leaves', { params }),
  getBalance: () => API.get('/leaves/balance'),
  getCalendar: () => API.get('/leaves/calendar'),
  getResetSettings: () => API.get('/leaves/reset-settings'),
  updateResetSettings: (data) => API.put('/leaves/reset-settings', data),
  review: (id, data) => API.put(`/leaves/${id}/review`, data),
  cancel: (id) => API.put(`/leaves/${id}/cancel`),
};

export const sprintAPI = {
  create: (data) => API.post('/sprints', data),
  getAll: (params) => API.get('/sprints', { params }),
  update: (id, data) => API.put(`/sprints/${id}`, data),
  delete: (id) => API.delete(`/sprints/${id}`),
  start: (id) => API.patch(`/sprints/${id}/start`),
  complete: (id, body = {}) => API.patch(`/sprints/${id}/complete`, body),
  getBoard: (id) => API.get(`/sprints/${id}/board`),
  // Backlog management
  getBacklog: (projectId) => API.get('/sprints/backlog', { params: { project: projectId } }),
  moveBacklogTask: (taskId, sprintId) => API.patch(`/sprints/backlog/${taskId}/move`, { sprintId }),
};

export const commentAPI = {
  add: (data) => API.post('/comments', data),
  getTaskComments: (taskId) => API.get('/comments', { params: { task: taskId } }),
  update: (id, data) => API.put(`/comments/${id}`, data),
  delete: (id) => API.delete(`/comments/${id}`),
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

export const dailyTaskAPI = {
  submit: (data) => API.post('/daily-tasks/submit', data),
  getMyToday: () => API.get('/daily-tasks/my-today'),
  getMyStatus: () => API.get('/daily-tasks/my-status'),
  adminGetAll: () => API.get('/daily-tasks/admin/all'),
  adminGetSettings: () => API.get('/daily-tasks/admin/settings'),
  adminToggle: (userId, isRequired) => API.patch(`/daily-tasks/admin/settings/${userId}`, { isRequired }),
  adminBulkToggle: (isRequired) => API.post('/daily-tasks/admin/settings/bulk', { isRequired }),
  adminSetSelected: (userIds, isRequired) => API.post('/daily-tasks/admin/settings/selected', { userIds, isRequired }),
};

export const teamAPI = {
  create: (data) => API.post('/teams', data),
  getAll: () => API.get('/teams'),
  getById: (id) => API.get(`/teams/${id}`),
  update: (id, data) => API.put(`/teams/${id}`, data),
  delete: (id) => API.delete(`/teams/${id}`),
  addMember: (id, userId) => API.post(`/teams/${id}/members`, { userId }),
  removeMember: (id, userId) => API.delete(`/teams/${id}/members/${userId}`),
  switchMember: (data) => API.post('/teams/switch-member', data),
  assignProject: (id, projectId) => API.post(`/teams/${id}/projects`, { projectId }),
  removeProject: (id, projectId) => API.delete(`/teams/${id}/projects/${projectId}`),
  changeLead: (id, newLeadId) => API.patch(`/teams/${id}/lead`, { newLeadId }),
  getEligibleMembers: () => API.get('/teams/eligible-members'),
  getDashboard: (id) => API.get(`/teams/${id}/dashboard`),
};
