const socket = io();

// ── Global stats (login screen) ──────────────────────────────
const globalUserCount = document.getElementById('global-user-count');
const globalRoomCount = document.getElementById('global-room-count');
socket.on('global stats', (stats) => {
    globalUserCount.textContent = stats.users;
    globalRoomCount.textContent = stats.rooms;
});

// ── UI Elements ──────────────────────────────────────────────
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

// Participants modal
const participantsBtn   = document.getElementById('participants-btn');
const participantsModal = document.getElementById('participants-modal');
const closeModalBtn     = document.getElementById('close-modal-btn');
const modalUserCount    = document.getElementById('modal-user-count');
const userList          = document.getElementById('user-list');
const searchUsers       = document.getElementById('search-users');

// Leave confirmation modal
const leaveConfirmModal = document.getElementById('leave-confirm-modal');
const confirmLeaveBtn   = document.getElementById('confirm-leave-btn');
const confirmStayBtn    = document.getElementById('confirm-stay-btn');

let myUsername   = '';
let currentUsers = [];
let isInRoom     = false;

// ── Refresh / navigation guard ────────────────────────────────
window.addEventListener('beforeunload', (e) => {
    if (isInRoom) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
    }
});

// ── Helpers: open / close modal ──────────────────────────────
function openModal(overlay) {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
}
function closeModal(overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
}

// ── Participants modal triggers ───────────────────────────────
participantsBtn.addEventListener('click', () => {
    renderUserList(currentUsers); // refresh list before showing
    searchUsers.value = '';
    openModal(participantsModal);
    setTimeout(() => searchUsers.focus(), 100);
});

closeModalBtn.addEventListener('click', () => closeModal(participantsModal));

// Close on backdrop click
participantsModal.addEventListener('click', (e) => {
    if (e.target === participantsModal) closeModal(participantsModal);
});

// ── Search inside participants modal ─────────────────────────
searchUsers.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = currentUsers.filter(u => u.name.toLowerCase().includes(term));
    renderUserList(filtered);
});

// ── Leave confirmation modal triggers ────────────────────────
leaveBtn.addEventListener('click', () => {
    // Close participants modal first if open
    closeModal(participantsModal);
    openModal(leaveConfirmModal);
});

confirmStayBtn.addEventListener('click', () => closeModal(leaveConfirmModal));

// Close confirm on backdrop click (same as "stay")
leaveConfirmModal.addEventListener('click', (e) => {
    if (e.target === leaveConfirmModal) closeModal(leaveConfirmModal);
});

// Confirmed leave
confirmLeaveBtn.addEventListener('click', () => {
    closeModal(leaveConfirmModal);
    doLeaveRoom();
});

// ── Escape key closes whichever modal is open ─────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (leaveConfirmModal.classList.contains('open')) {
            closeModal(leaveConfirmModal);
        } else if (participantsModal.classList.contains('open')) {
            closeModal(participantsModal);
        }
    }
});

// ── Join room ────────────────────────────────────────────────
joinBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const roomName = roomInput.value.trim();
    const password = passwordInput.value.trim();
    if (username && roomName && password) {
        myUsername = username;
        socket.emit('join room', { username, roomName, password });
    }
});

socket.on('login error', (msg) => alert(msg));

socket.on('join success', (roomName) => {
    isInRoom = true;
    loginScreen.style.display = 'none';
    chatScreen.style.display  = 'flex';
    roomDisplay.textContent   = roomName;
    chatWindow.innerHTML      = '';
});

// ── Do the actual leave ──────────────────────────────────────
function doLeaveRoom() {
    isInRoom = false;
    socket.emit('leave room');
    chatScreen.style.display  = 'none';
    loginScreen.style.display = 'flex';
    roomInput.value    = '';
    passwordInput.value = '';
    chatWindow.innerHTML = '';
    currentUsers = [];
    headerUserCount.textContent = '0';
    modalUserCount.textContent  = '0';
}

// ── Participant list ─────────────────────────────────────────
function renderUserList(usersToRender) {
    userList.innerHTML = '';
    usersToRender.forEach(user => {
        const li = document.createElement('li');
        if (user.name === myUsername) {
            li.textContent = `${user.name} (You)`;
            li.classList.add('is-you');
        } else {
            li.textContent = user.name;
        }
        userList.appendChild(li);
    });
}

socket.on('room users', (users) => {
    currentUsers = users;
    headerUserCount.textContent = users.length;
    modalUserCount.textContent  = users.length;
    // Re-apply live search filter if modal is open
    const term     = searchUsers.value.toLowerCase();
    const filtered = term ? currentUsers.filter(u => u.name.toLowerCase().includes(term)) : currentUsers;
    renderUserList(filtered);
});

// ── Chat ─────────────────────────────────────────────────────
function appendMessage(sender, text, isSystem = false) {
    const div = document.createElement('div');
    div.classList.add('message');
    if (isSystem) {
        div.classList.add('system');
        div.textContent = text;
    } else if (sender === myUsername) {
        div.classList.add('mine');
        div.innerHTML = `<strong>You:</strong> ${text}`;
    } else {
        div.innerHTML = `<strong>${sender}:</strong> ${text}`;
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