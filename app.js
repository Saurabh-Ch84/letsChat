const socket = io();

// UI Elements
const loginScreen       = document.getElementById('login-screen');
const chatScreen        = document.getElementById('chat-screen');
const usernameInput     = document.getElementById('username-input');
const roomInput         = document.getElementById('room-input');
const passwordInput     = document.getElementById('password-input');
const joinBtn           = document.getElementById('join-btn');

const roomDisplay       = document.getElementById('room-display');
const chatWindow        = document.getElementById('chat-window');
const messageInput      = document.getElementById('message-input');
const sendBtn           = document.getElementById('send-btn');
const leaveBtn          = document.getElementById('leave-btn');

const headerUserCount   = document.getElementById('header-user-count');
const participantsBtn   = document.getElementById('participants-btn');
const participantsModal = document.getElementById('participants-modal');
const closeModalBtn     = document.getElementById('close-modal-btn');
const modalUserCount    = document.getElementById('modal-user-count');
const userList          = document.getElementById('user-list');
const searchUsers       = document.getElementById('search-users');

const leaveConfirmModal = document.getElementById('leave-confirm-modal');
const confirmLeaveBtn   = document.getElementById('confirm-leave-btn');
const confirmStayBtn    = document.getElementById('confirm-stay-btn');

let myUsername = '';
let currentUsers = [];
let isInRoom = false;

// Global Stats (Login)
socket.on('global stats', (stats) => {
    document.getElementById('global-user-count').textContent = stats.users;
    document.getElementById('global-room-count').textContent = stats.rooms;
});

// Modal Helpers
function openModal(modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
}
function closeModal(modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
}

// Event Listeners
joinBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const roomName = roomInput.value.trim();
    const password = passwordInput.value.trim();
    if (username && roomName) {
        myUsername = username;
        socket.emit('join room', { username, roomName, password });
    }
});

socket.on('join success', (roomName) => {
    isInRoom = true;
    loginScreen.style.display = 'none';
    chatScreen.style.display  = 'block';
    roomDisplay.textContent   = roomName.toUpperCase();
    chatWindow.innerHTML      = '';
});

socket.on('login error', (msg) => alert(msg));

// Chat UI logic
function appendMessage(sender, text, isSystem = false) {
    const div = document.createElement('div');
    div.classList.add('message');
    if (isSystem) {
        div.classList.add('system');
        div.textContent = `[ ${text} ]`;
    } else {
        if (sender === myUsername) div.classList.add('mine');
        div.innerHTML = `<strong>${sender === myUsername ? 'YOU' : sender.toUpperCase()}:</strong> ${text}`;
    }
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

sendBtn.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chat message', message);
        messageInput.value = '';
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

socket.on('chat message',   (data) => appendMessage(data.username, data.text));
socket.on('system message', (msg)  => appendMessage('System', msg, true));

// Participants & Leaving logic
participantsBtn.addEventListener('click', () => openModal(participantsModal));
closeModalBtn.addEventListener('click', () => closeModal(participantsModal));
leaveBtn.addEventListener('click', () => openModal(leaveConfirmModal));
confirmStayBtn.addEventListener('click', () => closeModal(leaveConfirmModal));

confirmLeaveBtn.addEventListener('click', () => {
    isInRoom = false;
    socket.emit('leave room');
    closeModal(leaveConfirmModal);
    chatScreen.style.display  = 'none';
    loginScreen.style.display = 'block';
});

socket.on('room users', (users) => {
    currentUsers = users;
    headerUserCount.textContent = users.length;
    modalUserCount.textContent  = users.length;
    renderUserList(users);
});

function renderUserList(users) {
    userList.innerHTML = '';
    users.forEach(u => {
        const li = document.createElement('li');
        if (u.name === myUsername) li.classList.add('is-you');
        li.textContent = u.name + (u.name === myUsername ? ' (YOU)' : '');
        userList.appendChild(li);
    });
}