let socket;
let currentUser = null;
let mode = 'room';
let currentRoom = 'general';
let currentReceiverId = null;
let onlineIds = [];
let typingTimer;

const authPage = document.getElementById('authPage');
const chatPage = document.getElementById('chatPage');
const authForm = document.getElementById('authForm');
const authButton = document.getElementById('authButton');
const authMessage = document.getElementById('authMessage');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const myName = document.getElementById('myName');
const myAvatar = document.getElementById('myAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const userList = document.getElementById('userList');
const messages = document.getElementById('messages');
const chatTitle = document.getElementById('chatTitle');
const chatSubtitle = document.getElementById('chatSubtitle');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const typingText = document.getElementById('typingText');

let isLogin = true;

loginTab.onclick = () => switchAuth(true);
registerTab.onclick = () => switchAuth(false);

function switchAuth(login) {
  isLogin = login;
  loginTab.classList.toggle('active', login);
  registerTab.classList.toggle('active', !login);
  authButton.textContent = login ? 'Login' : 'Create Account';
  authMessage.textContent = '';
}

async function api(url, method = 'GET', body = null) {
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

async function checkLogin() {
  const data = await api('/api/me');
  if (data.user) startChat(data.user);
}

checkLogin().catch(() => {});

authForm.onsubmit = async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  authMessage.style.color = '#e11d48';

  try {
    const endpoint = isLogin ? '/api/login' : '/api/register';
    const data = await api(endpoint, 'POST', { username, password });
    authMessage.style.color = '#16a34a';
    authMessage.textContent = data.message;
    startChat(data.user);
  } catch (err) {
    authMessage.textContent = err.message;
  }
};

function startChat(user) {
  currentUser = user;
  authPage.classList.add('hidden');
  chatPage.classList.remove('hidden');
  myName.textContent = user.username;
  myAvatar.textContent = user.username.charAt(0).toUpperCase();

  socket = io();
  setupSocketEvents();
  loadUsers();
  selectRoom('general');
}

function setupSocketEvents() {
  socket.on('connect', () => socket.emit('joinRoom', currentRoom));

  socket.on('systemMessage', (text) => {
    if (mode === 'room') addSystem(text);
  });

  socket.on('onlineUsers', (ids) => {
    onlineIds = ids.map(Number);
    loadUsers();
  });

  socket.on('roomMessage', (msg) => {
    if (mode === 'room' && msg.room === currentRoom) addMessage(msg);
  });

  socket.on('privateMessage', (msg) => {
    const talkingToCurrent = mode === 'private' &&
      (Number(msg.sender_id) === Number(currentReceiverId) || Number(msg.receiver_id) === Number(currentReceiverId));
    if (talkingToCurrent) addMessage(msg);
  });

  socket.on('typing', ({ username }) => {
    typingText.textContent = `${username} is typing...`;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => typingText.textContent = '', 1200);
  });
}

async function loadUsers() {
  if (!currentUser) return;
  try {
    const users = await api('/api/users');
    userList.innerHTML = '';
    users.forEach(user => {
      const btn = document.createElement('button');
      btn.className = 'user-btn';
      if (mode === 'private' && Number(currentReceiverId) === Number(user.id)) btn.classList.add('active');
      const isOnline = onlineIds.includes(Number(user.id)) || user.online;
      btn.innerHTML = `${user.username}<span class="user-status">${isOnline ? '🟢' : '⚪'}</span>`;
      btn.onclick = () => selectPrivate(user);
      userList.appendChild(btn);
    });
  } catch (err) {
    console.log(err.message);
  }
}

document.querySelectorAll('.room-btn').forEach(btn => {
  btn.onclick = () => selectRoom(btn.dataset.room);
});

async function selectRoom(room) {
  mode = 'room';
  currentRoom = room;
  currentReceiverId = null;
  chatTitle.textContent = `# ${capitalize(room)}`;
  chatSubtitle.textContent = 'Room chat - everyone in this room can see messages';
  setActiveRoom(room);
  loadUsers();
  messages.innerHTML = '';
  if (socket) socket.emit('joinRoom', room);

  const oldMessages = await api(`/api/messages/room/${room}`);
  oldMessages.forEach(addMessage);
  scrollBottom();
}

async function selectPrivate(user) {
  mode = 'private';
  currentReceiverId = user.id;
  chatTitle.textContent = `@ ${user.username}`;
  chatSubtitle.textContent = 'Private conversation';
  document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
  loadUsers();
  messages.innerHTML = '';

  const oldMessages = await api(`/api/messages/private/${user.id}`);
  oldMessages.forEach(addMessage);
  scrollBottom();
}

function setActiveRoom(room) {
  document.querySelectorAll('.room-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.room === room);
  });
}

messageForm.onsubmit = (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  if (mode === 'room') {
    socket.emit('sendRoomMessage', { room: currentRoom, message: text });
  } else {
    socket.emit('sendPrivateMessage', { receiverId: currentReceiverId, message: text });
  }
  messageInput.value = '';
};

messageInput.addEventListener('input', () => {
  if (!socket) return;
  socket.emit('typing', { room: currentRoom, receiverId: currentReceiverId, mode });
});

function addMessage(msg) {
  const div = document.createElement('div');
  const mine = Number(msg.sender_id) === Number(currentUser.id);
  div.className = `bubble ${mine ? 'mine' : 'other'}`;
  div.innerHTML = `
    <div class="name">${mine ? 'You' : escapeHtml(msg.sender_name)}</div>
    <div>${escapeHtml(msg.message)}</div>
    <div class="time">${formatTime(msg.created_at)}</div>
  `;
  messages.appendChild(div);
  scrollBottom();
}

function addSystem(text) {
  const div = document.createElement('div');
  div.className = 'system';
  div.textContent = text;
  messages.appendChild(div);
  scrollBottom();
}

function scrollBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[char]));
}

logoutBtn.onclick = async () => {
  await api('/api/logout', 'POST');
  location.reload();
};
