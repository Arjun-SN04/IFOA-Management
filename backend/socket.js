const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // JWT middleware — verify token and load user role
  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;
    if (!token) return next(new Error('Unauthorized: no token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;

      // Look up role from DB (JWT only stores id)
      const user = await User.findById(decoded.id).select('role').lean();
      socket.userRole = user?.role || 'user';

      next();
    } catch {
      next(new Error('Unauthorized: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Personal room — push events to a specific user
    socket.join(`user:${socket.userId}`);

    // Admin/manager room — org-wide broadcasts
    if (socket.userRole === 'admin' || socket.userRole === 'manager') {
      socket.join('admin');
    }

    console.log(`🔌 Socket connected: userId=${socket.userId} role=${socket.userRole}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: userId=${socket.userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialised — call initSocket(server) first');
  return io;
};

module.exports = { initSocket, getIO };
