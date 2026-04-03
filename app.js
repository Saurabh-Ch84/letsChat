const socket = io();

const globalUserCount = document.getElementById('global-user-count');
const globalRoomCount = document.getElementById('global-room-count');

// NEW: Listen for live statistics from the server
socket.on('global stats', (stats) => {
    globalUserCount.textContent = stats.users;
    globalRoomCount.textContent = stats.rooms;
});

// UI Elements
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const roomInput = document.getElementById('room-input');
const passwordInput = document.getElementById('password-input');
const joinBtn = document.getElementById('join-btn');

const roomDisplay = document.getElementById('room-display');
const chatWindow = document.getElementById('chat-window');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const leaveBtn = document.getElementById('leave-btn');

const userList = document.getElementById('user-list');
const userCount = document.getElementById('user-count');
const searchUsers = document.getElementById('search-users');

let myUsername = ''; 
let currentUsers = []; // Store users for searching

// --- 1. LOGIN / LEAVE LOGIC ---
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
    loginScreen.style.display = 'none';      
    chatScreen.style.display = 'flex'; // Uses Flexbox now!
    roomDisplay.textContent = roomName;      
    chatWindow.innerHTML = ''; // Clear old messages
});

// Leave Room Logic
leaveBtn.addEventListener('click', () => {
    socket.emit('leave room');
    chatScreen.style.display = 'none';
    loginScreen.style.display = 'flex';
    // Clear inputs for next time
    roomInput.value = '';
    passwordInput.value = '';
});

// --- 2. PARTICIPANT LIST & SEARCH ---
function renderUserList(usersToRender) {
    userList.innerHTML = ''; // Clear list
    usersToRender.forEach(user => {
        const li = document.createElement('li');
        // Add a (You) tag if it's the current user
        li.textContent = user.name === myUsername ? `${user.name} (You)` : user.name;
        userList.appendChild(li);
    });
}

// Receive updated user list from server
socket.on('room users', (users) => {
    currentUsers = users;
    userCount.textContent = users.length;
    // Re-run search filter immediately in case they are currently searching
    const searchTerm = searchUsers.value.toLowerCase();
    const filteredUsers = currentUsers.filter(u => u.name.toLowerCase().includes(searchTerm));
    renderUserList(filteredUsers);
});

// Search bar functionality
searchUsers.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredUsers = currentUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm)
    );
    renderUserList(filteredUsers);
});

// --- 3. CHAT LOGIC ---
function appendMessage(sender, text, isSystem = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    
    if (isSystem) {
        messageDiv.style.backgroundColor = '#e2e3e5';
        messageDiv.style.fontStyle = 'italic';
        messageDiv.style.alignSelf = 'center';
        messageDiv.textContent = text;
    } else {
        if (sender === myUsername) {
            messageDiv.style.backgroundColor = '#dcf8c6'; 
            messageDiv.style.alignSelf = 'flex-end';
            messageDiv.innerHTML = `<strong>You:</strong> ${text}`;
        } else {
            messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
        }
    }
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight; 
}

sendBtn.addEventListener('click', () => {
    const message = messageInput.value;
    if (message.trim() !== '') {
        socket.emit('chat message', message);
        messageInput.value = ''; 
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

socket.on('chat message', (data) => appendMessage(data.username, data.text));
socket.on('system message', (msg) => appendMessage('System', msg, true));