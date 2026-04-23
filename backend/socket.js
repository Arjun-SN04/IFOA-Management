const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Team = require('./models/Team');

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

  // JWT middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Unauthorized: no token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      const user = await User.findById(decoded.id).select('role').lean();
      socket.userRole = user?.role || 'employee';
      next();
    } catch {
      next(new Error('Unauthorized: invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    // Personal room — push events to a specific user
    socket.join(`user:${socket.userId}`);

    // Admin/manager/HR all join the 'admin' broadcast room for org-wide events
    if (['admin', 'manager', 'hr'].includes(socket.userRole)) {
      socket.join('admin');
    }

    // Join team rooms so team-level broadcasts reach the right members
    try {
      const teams = await Team.find({
        $or: [{ members: socket.userId }, { teamLead: socket.userId }],
      }).select('_id').lean();
      teams.forEach(t => socket.join(`team:${t._id}`));
    } catch {}

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
