const http = require('http');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { initSocket } = require('./socket');

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/projects',      require('./routes/projectRoutes'));
app.use('/api/tasks',         require('./routes/taskRoutes'));
app.use('/api/leaves',        require('./routes/leaveRoutes'));
app.use('/api/sprints',       require('./routes/sprintRoutes'));
app.use('/api/comments',      require('./routes/commentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/reports',       require('./routes/reportRoutes'));
app.use('/api/daily-tasks',   require('./routes/dailyTaskRoutes'));
app.use('/api/teams',         require('./routes/teamRoutes'));
app.use('/api/nocs',          require('./routes/nocRoutes'));

// Health check
app.get('/', (req, res) => res.json({ message: 'IFOA Management API Running ✅' }));

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} with WebSocket support`);

  const { processScheduledAnnouncements, deleteExpiredAnnouncements } = require('./controllers/announcementController');

  // ── Scheduled announcement publisher (runs every 60 seconds) ──
  setInterval(processScheduledAnnouncements, 60 * 1000);
  processScheduledAnnouncements();

  // ── Expired announcement cleanup (runs every 60 seconds) ──
  setInterval(deleteExpiredAnnouncements, 60 * 1000);
  deleteExpiredAnnouncements();
});
