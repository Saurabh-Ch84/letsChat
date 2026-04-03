const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const roomsStore = {};
let globalUserCount = 0; // NEW: Track total users on the website

// NEW: Helper function to broadcast live stats to the login screen
function broadcastGlobalStats() {
    io.emit('global stats', {
        users: globalUserCount,
        rooms: Object.keys(roomsStore).length
    });
}

function handleUserLeave(socket) {
    const room = socket.roomName;
    if (room && roomsStore[room]) {
        roomsStore[room].users = roomsStore[room].users.filter(user => user.id !== socket.id);
        socket.leave(room);
        
        socket.to(room).emit('system message', `${socket.username} has left the chat.`);
        io.to(room).emit('room users', roomsStore[room].users);

        if (roomsStore[room].users.length === 0) {
            delete roomsStore[room];
            console.log(`Room ${room} is empty and deleted.`);
            broadcastGlobalStats(); // Update stats when a room is destroyed
        }
        
        socket.roomName = null;
        socket.username = null;
    }
}

io.on('connection', (socket) => {
    globalUserCount++; // User opened the website
    broadcastGlobalStats(); // Send fresh stats to their login screen

    socket.on('join room', ({ username, roomName, password }) => {
        let isNewRoom = false;

        if (roomsStore[roomName]) {
            if (roomsStore[roomName].password !== password) {
                socket.emit('login error', 'Incorrect password for this room.');
                return; 
            }
        } else {
            roomsStore[roomName] = { password: password, users: [] };
            isNewRoom = true;
        }

        socket.join(roomName);
        socket.username = username;
        socket.roomName = roomName;
        roomsStore[roomName].users.push({ id: socket.id, name: username });

        socket.emit('join success', roomName);
        socket.to(roomName).emit('system message', `${username} has joined the chat.`);
        io.to(roomName).emit('room users', roomsStore[roomName].users);

        if (isNewRoom) broadcastGlobalStats(); // Update stats when a room is created
    });

    socket.on('chat message', (msg) => {
        if (socket.roomName) {
            io.to(socket.roomName).emit('chat message', { 
                username: socket.username, 
                text: msg 
            });
        }
    });

    socket.on('leave room', () => {
        handleUserLeave(socket);
    });

    socket.on('disconnect', () => {
        globalUserCount--; // User closed the website
        handleUserLeave(socket);
        broadcastGlobalStats(); // Update everyone's login screen
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});