const express = require('express');
const http = require('http');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const sessionMiddleware = session({
  secret: 'chat-app-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

const onlineUsers = new Map(); // userId -> socketId

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Please login first' });
  next();
}

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

  const hashedPassword = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users(username, password) VALUES(?, ?)', [username.trim(), hashedPassword], function(err) {
    if (err) return res.status(409).json({ error: 'Username already exists' });
    req.session.user = { id: this.lastID, username: username.trim() };
    res.json({ message: 'Account created successfully', user: req.session.user });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

  db.get('SELECT * FROM users WHERE username = ?', [username.trim()], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid username or password' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid username or password' });
    req.session.user = { id: user.id, username: user.username };
    res.json({ message: 'Login successful', user: req.session.user });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out successfully' }));
});

app.get('/api/users', requireLogin, (req, res) => {
  db.all('SELECT id, username FROM users WHERE id != ? ORDER BY username', [req.session.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Unable to load users' });
    const users = rows.map(u => ({ ...u, online: onlineUsers.has(u.id) }));
    res.json(users);
  });
});

app.get('/api/messages/room/:room', requireLogin, (req, res) => {
  db.all(`SELECT messages.*, users.username AS sender_name
          FROM messages JOIN users ON messages.sender_id = users.id
          WHERE type='room' AND room=? ORDER BY messages.id ASC LIMIT 100`,
    [req.params.room], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Unable to load room messages' });
      res.json(rows);
    });
});

app.get('/api/messages/private/:userId', requireLogin, (req, res) => {
  const myId = req.session.user.id;
  const otherId = Number(req.params.userId);
  db.all(`SELECT messages.*, users.username AS sender_name
          FROM messages JOIN users ON messages.sender_id = users.id
          WHERE type='private' AND 
          ((sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?))
          ORDER BY messages.id ASC LIMIT 100`,
    [myId, otherId, otherId, myId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Unable to load private messages' });
      res.json(rows);
    });
});

io.engine.use(sessionMiddleware);

io.on('connection', (socket) => {
  const user = socket.request.session.user;
  if (!user) {
    socket.disconnect();
    return;
  }

  onlineUsers.set(user.id, socket.id);
  socket.join(`user_${user.id}`);
  io.emit('onlineUsers', Array.from(onlineUsers.keys()));

  socket.on('joinRoom', (room) => {
    socket.join(room);
    socket.emit('systemMessage', `You joined ${room}`);
  });

  socket.on('sendRoomMessage', ({ room, message }) => {
    const cleanMessage = String(message || '').trim();
    if (!room || !cleanMessage) return;

    db.run('INSERT INTO messages(sender_id, room, message, type) VALUES(?, ?, ?, ?)',
      [user.id, room, cleanMessage, 'room'], function(err) {
        if (err) return;
        io.to(room).emit('roomMessage', {
          id: this.lastID,
          sender_id: user.id,
          sender_name: user.username,
          room,
          message: cleanMessage,
          created_at: new Date().toISOString()
        });
      });
  });

  socket.on('sendPrivateMessage', ({ receiverId, message }) => {
    const cleanMessage = String(message || '').trim();
    receiverId = Number(receiverId);
    if (!receiverId || !cleanMessage) return;

    db.run('INSERT INTO messages(sender_id, receiver_id, message, type) VALUES(?, ?, ?, ?)',
      [user.id, receiverId, cleanMessage, 'private'], function(err) {
        if (err) return;
        const payload = {
          id: this.lastID,
          sender_id: user.id,
          receiver_id: receiverId,
          sender_name: user.username,
          message: cleanMessage,
          created_at: new Date().toISOString()
        };
        socket.emit('privateMessage', payload);
        io.to(`user_${receiverId}`).emit('privateMessage', payload);
      });
  });

  socket.on('typing', ({ room, receiverId, mode }) => {
    if (mode === 'room') socket.to(room).emit('typing', { username: user.username });
    if (mode === 'private') socket.to(`user_${receiverId}`).emit('typing', { username: user.username });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(user.id);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
