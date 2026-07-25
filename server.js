const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

const onlineUsers = new Map();
const waitingQueue = [];
const rooms = new Map();
const leaderboard = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    onlineUsers.set(socket.id, {
        id: socket.id,
        socket: socket,
        connectedAt: Date.now()
    });

    io.emit('onlineCount', onlineUsers.size);

    socket.on('findMatch', (filters) => {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        user.gender = filters.gender;
        user.country = filters.country;
        user.prefGender = filters.prefGender;

        const queueIdx = waitingQueue.findIndex(q => q.id === socket.id);
        if (queueIdx > -1) waitingQueue.splice(queueIdx, 1);

        let matchIdx = -1;
        for (let i = 0; i < waitingQueue.length; i++) {
            const candidate = waitingQueue[i];
            const candidateUser = onlineUsers.get(candidate.id);
            if (!candidateUser) continue;

            const genderMatch = (user.prefGender === 'any' || user.prefGender === candidateUser.gender) &&
                                (candidateUser.prefGender === 'any' || candidateUser.prefGender === user.gender);
            const countryMatch = (user.country === 'any' || user.country === candidateUser.country) &&
                                 (candidateUser.country === 'any' || candidateUser.country === user.country);

            if (genderMatch && countryMatch) {
                matchIdx = i;
                break;
            }
        }

        if (matchIdx > -1) {
            const partnerEntry = waitingQueue.splice(matchIdx, 1)[0];
            const partner = onlineUsers.get(partnerEntry.id);

            if (partner) {
                const roomId = uuidv4();
                rooms.set(roomId, {
                    users: [socket.id, partner.id],
                    created: Date.now()
                });

                socket.join(roomId);
                partner.socket.join(roomId);

                user.roomId = roomId;
                user.partnerId = partner.id;
                partner.roomId = roomId;
                partner.partnerId = socket.id;

                socket.emit('matchFound', {
                    roomId,
                    partnerId: partner.id,
                    partnerCountry: partner.country,
                    isInitiator: true
                });
                partner.socket.emit('matchFound', {
                    roomId,
                    partnerId: socket.id,
                    partnerCountry: user.country,
                    isInitiator: false
                });

                console.log(`Match: ${socket.id} <-> ${partner.id}`);
            } else {
                waitingQueue.push({ id: socket.id, gender: user.gender, country: user.country, prefGender: user.prefGender });
                socket.emit('searching');
            }
        } else {
            waitingQueue.push({ id: socket.id, gender: user.gender, country: user.country, prefGender: user.prefGender });
            socket.emit('searching');
            console.log(`Waiting: ${socket.id} (queue: ${waitingQueue.length})`);
        }
    });

    socket.on('signal', (data) => {
        const user = onlineUsers.get(socket.id);
        if (!user || !user.partnerId) return;

        const partner = onlineUsers.get(user.partnerId);
        if (partner && partner.socket) {
            partner.socket.emit('signal', {
                signal: data.signal,
                from: socket.id
            });
        }
    });

    socket.on('sendMessage', (data) => {
        const user = onlineUsers.get(socket.id);
        if (!user || !user.partnerId) return;

        const partner = onlineUsers.get(user.partnerId);
        if (partner && partner.socket) {
            partner.socket.emit('newMessage', {
                text: data.text,
                from: socket.id
            });
        }
    });

    socket.on('getLeaderboard', () => {
        const entries = [];
        leaderboard.forEach((val, key) => {
            entries.push({ name: val.name || key.substring(0, 6), points: val.points });
        });
        entries.sort((a, b) => b.points - a.points);
        socket.emit('leaderboard', entries.slice(0, 10));
    });

    socket.on('skip', () => {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        if (user.roomId) {
            const room = rooms.get(user.roomId);
            if (room) {
                room.users.forEach(uid => {
                    const u = onlineUsers.get(uid);
                    if (u && u.socket) {
                        u.socket.leave(user.roomId);
                        u.roomId = null;
                        u.partnerId = null;
                        u.socket.emit('partnerDisconnected');
                    }
                });
                rooms.delete(user.roomId);
            }
        }

        const idx = waitingQueue.findIndex(q => q.id === socket.id);
        if (idx > -1) waitingQueue.splice(idx, 1);

        setTimeout(() => socket.emit('startSearch'), 1000);
    });

    socket.on('stopChat', () => {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        if (user.roomId) {
            const room = rooms.get(user.roomId);
            if (room) {
                room.users.forEach(uid => {
                    const u = onlineUsers.get(uid);
                    if (u && u.socket) {
                        u.socket.leave(user.roomId);
                        u.roomId = null;
                        u.partnerId = null;
                        u.socket.emit('partnerDisconnected');
                    }
                });
                rooms.delete(user.roomId);
            }
        }

        const idx = waitingQueue.findIndex(q => q.id === socket.id);
        if (idx > -1) waitingQueue.splice(idx, 1);
    });

    socket.on('disconnect', () => {
        const user = onlineUsers.get(socket.id);

        if (user && user.roomId) {
            const room = rooms.get(user.roomId);
            if (room) {
                room.users.forEach(uid => {
                    const u = onlineUsers.get(uid);
                    if (u && u.socket && uid !== socket.id) {
                        u.socket.emit('partnerDisconnected');
                        u.roomId = null;
                        u.partnerId = null;
                    }
                });
                rooms.delete(user.roomId);
            }
        }

        const idx = waitingQueue.findIndex(q => q.id === socket.id);
        if (idx > -1) waitingQueue.splice(idx, 1);

        onlineUsers.delete(socket.id);
        io.emit('onlineCount', onlineUsers.size);
        console.log('User disconnected:', socket.id);
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
