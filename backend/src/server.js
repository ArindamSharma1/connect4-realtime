require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const createGameManager = require('./gameManager');
const createBot = require('./bot');
const { initDb, getLeaderboard } = require('./db');

const app = express();
const server = http.createServer(app);
const cors = require('cors');
app.use(cors()); // Enable CORS for Express Routes
const io = new Server(server, { cors: { origin: '*' } });

const port = process.env.PORT || 4000;

// initDb(); // ensures DB connection - handled via docker compose wait usually, but calling here is fine.

const gameManager = createGameManager({ io, botFactory: createBot });

io.on('connection', socket => {
    socket.on('join_queue', async ({ username }) => {
        try { await gameManager.joinQueue({ socket, username }); }
        catch (err) { socket.emit('error', { message: err.message }); }
    });

    socket.on('drop', async ({ gameId, column }) => {
        try { await gameManager.handleDrop({ socket, gameId, column }); }
        catch (err) { socket.emit('error', { message: err.message }); }
    });

    socket.on('rejoin', async ({ username, gameId }) => {
        try { await gameManager.rejoin({ socket, username, gameId }); }
        catch (err) { socket.emit('error', { message: err.message }); }
    });

    socket.on('disconnect', () => {
        gameManager.handleDisconnect(socket);
    });
});

app.get('/leaderboard', async (req, res) => {
    try {
        const data = await getLeaderboard();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Init DB only if not in test mode effectively, or just always nice to try
initDb();

server.listen(port, () => console.log(`Server listening ${port}`));
