const { v4: uuidv4 } = require('uuid');
const { persistFinishedGame, upsertPlayerWin } = require('./db');
// Note: Assuming botFactory is passed in options, or we can require it if not circular.
// The user prompt passes botFactory in createGameManager({ io, botFactory })

module.exports = function createGameManager({ io, botFactory }) {
    const waiting = []; // array of { username, socket, createdAt, timeout }
    const games = new Map(); // gameId => Game object

    function createEmptyBoard() {
        // 6 rows x 7 cols, rows indexed 0..5 (0 top), easier to compute bottom with 5..0
        return Array.from({ length: 6 }, () => Array(7).fill(0));
    }

    function newGame(player1, player2, isBot = false) {
        const id = uuidv4();
        const game = {
            id,
            players: [
                { username: player1.username, socketId: player1.socket.id, isBot: false },
                { username: player2.username, socketId: player2.socket.id, isBot: isBot }
            ],
            board: createEmptyBoard(),
            turn: 1,
            status: 'active',
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
            moves: [], // {col,row,player,timestamp}
            reconnectTimers: {}
        };
        games.set(id, game);
        return game;
    }

    async function joinQueue({ socket, username }) {
        // prevent duplicates
        if (waiting.some(w => w.username === username)) {
            socket.emit('error', { message: 'Already in queue' });
            return;
        }
        // add to waiting list
        const entry = { username, socket, createdAt: Date.now() };
        waiting.push(entry);

        // if someone else waiting -> match immediately
        if (waiting.length >= 2) {
            const p1 = waiting.shift();
            const p2 = waiting.shift();
            // Clear any pending bot timeouts for these players (crucial fix)
            if (p1.timeout) clearTimeout(p1.timeout);
            if (p2.timeout) clearTimeout(p2.timeout);

            const game = newGame(p1, p2, false);
            // emit matched
            io.to(p1.socket.id).emit('matched', { gameId: game.id, players: [p1.username, p2.username], you: p1.username });
            io.to(p2.socket.id).emit('matched', { gameId: game.id, players: [p1.username, p2.username], you: p2.username });
            // emit initial state
            broadcastState(game);
            return;
        }

        // set a 10s timeout to spawn bot if still alone
        entry.timeout = setTimeout(() => {
            // if still in waiting, spawn bot
            const idx = waiting.findIndex(w => w.username === username);
            if (idx === -1) return;
            waiting.splice(idx, 1);
            const botPlayer = botFactory({ name: 'BOT' });
            const game = newGame(entry, { username: botPlayer.name, socket: { id: null }, isBot: true }, true);
            // attach bot controller
            game.bot = botPlayer;
            io.to(entry.socket.id).emit('matched', { gameId: game.id, players: [entry.username, botPlayer.name], you: entry.username });
            broadcastState(game);
        }, 10000);
        socket.emit('waiting', { message: 'Waiting for opponent...' });
    }

    function broadcastState(game) {
        const state = { board: game.board, turn: game.turn, status: game.status, lastMove: game.moves.slice(-1)[0] || null };
        for (let p of game.players) {
            if (p.isBot) continue;
            const s = io.sockets.sockets.get(p.socketId);
            if (s) s.emit('state', state);
        }
    }

    function columnDropRow(board, col) {
        // find lowest empty row index (5 down to 0)
        for (let r = 5; r >= 0; r--) {
            if (board[r][col] === 0) return r;
        }
        return -1;
    }

    function checkWin(board, playerValue) {
        // check horizontal, vertical, diag
        const R = 6, C = 7, needed = 4;
        // horizontal
        for (let r = 0; r < R; r++) {
            for (let c = 0; c <= C - needed; c++) {
                let ok = true;
                for (let k = 0; k < needed; k++) if (board[r][c + k] !== playerValue) { ok = false; break; }
                if (ok) return true;
            }
        }
        // vertical
        for (let c = 0; c < C; c++) {
            for (let r = 0; r <= R - needed; r++) {
                let ok = true;
                for (let k = 0; k < needed; k++) if (board[r + k][c] !== playerValue) { ok = false; break; }
                if (ok) return true;
            }
        }
        // diag down-right
        for (let r = 0; r <= R - needed; r++) {
            for (let c = 0; c <= C - needed; c++) {
                let ok = true;
                for (let k = 0; k < needed; k++) if (board[r + k][c + k] !== playerValue) { ok = false; break; }
                if (ok) return true;
            }
        }
        // diag up-right
        for (let r = needed - 1; r < R; r++) {
            for (let c = 0; c <= C - needed; c++) {
                let ok = true;
                for (let k = 0; k < needed; k++) if (board[r - k][c + k] !== playerValue) { ok = false; break; }
                if (ok) return true;
            }
        }
        return false;
    }

    async function finishGame(game, result, winnerUsername = null) {
        game.status = 'finished';
        game.finishedAt = Date.now();
        // persist to DB
        try {
            await persistFinishedGame(game, result); // implement in db.js
            if (result === 'player1' || result === 'player2') {
                const winner = (result === 'player1') ? game.players[0].username : game.players[1].username;
                await upsertPlayerWin(winner);
            }
        } catch (err) {
            console.error('DB persist error', err);
        }
        // notify players
        for (let p of game.players) {
            if (p.isBot) continue;
            const s = io.sockets.sockets.get(p.socketId);
            if (s) s.emit('game_finished', { result, winner: winnerUsername });
        }
        games.delete(game.id);
    }

    async function handleDrop({ socket, gameId, column }) {
        const game = games.get(gameId);
        if (!game) { socket.emit('error', { message: 'Game not found' }); return; }
        const playerIndex = game.players.findIndex(p => !p.isBot && p.socketId === socket.id);
        if (playerIndex === -1) { socket.emit('error', { message: 'You are not part of this game' }); return; }
        if (game.turn !== playerIndex + 1) { socket.emit('error', { message: 'Not your turn' }); return; }
        const row = columnDropRow(game.board, column);
        if (row === -1) { socket.emit('error', { message: 'Column full' }); return; }

        // Apply move
        game.board[row][column] = playerIndex + 1;
        game.moves.push({ col: column, row, player: playerIndex + 1, timestamp: Date.now() });
        game.lastActiveAt = Date.now();

        // check win
        if (checkWin(game.board, playerIndex + 1)) {
            await finishGame(game, playerIndex === 0 ? 'player1' : 'player2', game.players[playerIndex].username);
            return;
        }

        // check draw: board full
        const draw = game.board.every(r => r.every(c => c !== 0));
        if (draw) {
            await finishGame(game, 'draw', null);
            return;
        }

        // toggle turn
        game.turn = (game.turn === 1) ? 2 : 1;
        broadcastState(game);

        // if opponent is bot and it's bot's turn, compute bot move
        const opponent = game.players[game.turn - 1];
        if (opponent.isBot && game.bot) {
            // Small delay for realism
            setTimeout(async () => {
                // Re-check game existence and status in case it ended or something changed
                if (!games.has(game.id) || game.status === 'finished') return;

                // bot decision - returns column
                const col = game.bot.decide(game.board, game.turn === 1 ? 1 : 2); // pass player id for bot logic
                // simulate drop
                const r2 = columnDropRow(game.board, col);
                if (r2 !== -1) {
                    game.board[r2][col] = game.turn;
                    game.moves.push({ col, row: r2, player: game.turn, timestamp: Date.now() });
                    // check bot win
                    if (checkWin(game.board, game.turn)) {
                        await finishGame(game, game.turn === 1 ? 'player1' : 'player2', opponent.username);
                        return;
                    }
                    // check draw again
                    const draw2 = game.board.every(r => r.every(c => c !== 0));
                    if (draw2) { await finishGame(game, 'draw', null); return; }

                    game.turn = (game.turn === 1) ? 2 : 1;
                    broadcastState(game);
                } else {
                    // Fallback if bot decides full column (should be prevented by bot logic, but valid defensive coding)
                    for (let c = 0; c < 7; c++) {
                        const rr = columnDropRow(game.board, c);
                        if (rr !== -1) {
                            game.board[rr][c] = game.turn;
                            game.moves.push({ col: c, row: rr, player: game.turn, timestamp: Date.now() });
                            if (checkWin(game.board, game.turn)) { await finishGame(game, game.turn === 1 ? 'player1' : 'player2', opponent.username); return; }
                            game.turn = (game.turn === 1) ? 2 : 1;
                            broadcastState(game);
                            break;
                        }
                    }
                }
            }, 500); // 500ms delay
        }
    }

    function handleDisconnect(socket) {
        // find active game and mark disconnectedAt; set 30s timer to forfeit
        for (let [gameId, game] of games.entries()) {
            const pIdx = game.players.findIndex(p => !p.isBot && p.socketId === socket.id);
            if (pIdx !== -1) {
                game.players[pIdx].disconnectedAt = Date.now();
                // notify opponent
                const opponent = game.players.find(p => p.socketId !== socket.id);
                if (opponent && !opponent.isBot) {
                    const s = io.sockets.sockets.get(opponent.socketId);
                    if (s) s.emit('player_disconnected', { username: game.players[pIdx].username });
                }
                // set timer
                game.reconnectTimers[pIdx] = setTimeout(async () => {
                    // if still disconnected, forfeit
                    if (game.players[pIdx].disconnectedAt) {
                        const winnerIdx = pIdx === 0 ? 1 : 0;
                        await finishGame(game, winnerIdx === 0 ? 'player1' : 'player2', game.players[winnerIdx].username);
                    }
                }, 30000);
            }
        }

        // Also remove from waiting list if waiting
        const wIdx = waiting.findIndex(w => w.socket.id === socket.id);
        if (wIdx !== -1) {
            clearTimeout(waiting[wIdx].timeout);
            waiting.splice(wIdx, 1);
        }
    }

    async function rejoin({ socket, username, gameId }) {
        const game = games.get(gameId);
        if (!game) { socket.emit('error', { message: 'Game not found' }); return; }
        const pIdx = game.players.findIndex(p => p.username === username);
        if (pIdx === -1) { socket.emit('error', { message: 'You are not a player for this game' }); return; }
        // attach new socketId
        game.players[pIdx].socketId = socket.id;
        delete game.players[pIdx].disconnectedAt;
        // clear timeout if present
        if (game.reconnectTimers[pIdx]) { clearTimeout(game.reconnectTimers[pIdx]); delete game.reconnectTimers[pIdx]; }
        socket.emit('reconnect_ack', { success: true, board: game.board, turn: game.turn, status: game.status, gameId });
        // notify opponent
        const opp = game.players.find((p, i) => i !== pIdx && !p.isBot);
        if (opp) {
            const s = io.sockets.sockets.get(opp.socketId);
            if (s) s.emit('player_reconnected', { username, gameId });
        }
    }

    return {
        joinQueue,
        handleDrop,
        handleDisconnect,
        rejoin,
        // expose for testing
        createEmptyBoard,
        columnDropRow,
        checkWin,
        // expose games for debugging
        _getGame: id => games.get(id)
    };
};
