const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const env = require('./config/env');
const pool = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

const apiRouter = express.Router();

// TODO: mount auth routes here.
// Contract:
// POST /api/auth/signup
// POST /api/auth/login
// POST /api/auth/logout
// GET  /api/auth/me

// TODO: mount skills routes here.
// Contract:
// GET /api/skills

// TODO: mount discover routes here.
// Contract:
// GET /api/discover

// TODO: mount messages routes here.
// Contract:
// GET /api/conversations
// GET /api/conversations/:id/messages

// TODO: mount sessions routes here.
// Contract:
// GET   /api/sessions
// POST  /api/sessions
// PATCH /api/sessions/:id

app.use('/api', apiRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', () => {
  //TODO: register chat and video signaling sockets in later tasks.
});

async function startServer() {
  try {
    await pool.query('SELECT 1');
    server.listen(env.port, () => {
      console.log(`SkillSwap server listening on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start SkillSwap server:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, io };
