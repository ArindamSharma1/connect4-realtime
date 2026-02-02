const { Pool } = require('pg');

let pool = null;
const inMemoryGames = [];
const inMemoryLeaderboard = new Map(); // username -> { wins, losses, draws }

async function initDb() {
    if (process.env.DATABASE_URL) {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        // create tables if not exist - simple approach
        try {
            await pool.query(`
        CREATE TABLE IF NOT EXISTS games (
          id serial PRIMARY KEY,
          game_id uuid NOT NULL,
          player1 text,
          player2 text,
          result text,
          moves jsonb,
          started_at timestamptz,
          finished_at timestamptz
        );
        CREATE TABLE IF NOT EXISTS leaderboard (
          username text PRIMARY KEY,
          wins int DEFAULT 0,
          losses int DEFAULT 0,
          draws int DEFAULT 0
        );`);
            console.log('DB tables initialized (Postgres)');
        } catch (err) {
            console.error('DB init error, switching to in-memory:', err.message);
            pool = null;
        }
    } else {
        console.log('No DATABASE_URL found. Using In-Memory persistence (data lost on restart).');
    }
}

async function persistFinishedGame(game, result) {
    if (pool) {
        await pool.query(
            `INSERT INTO games(game_id, player1, player2, result, moves, started_at, finished_at)
         VALUES($1,$2,$3,$4,$5,to_timestamp($6/1000.0),to_timestamp($7/1000.0))`,
            [game.id, game.players[0].username, game.players[1].username, result, JSON.stringify(game.moves), game.createdAt, game.finishedAt]
        );
    } else {
        inMemoryGames.push({
            game_id: game.id,
            player1: game.players[0].username,
            player2: game.players[1].username,
            result,
            moves: game.moves, // store object directly
            started_at: new Date(game.createdAt),
            finished_at: new Date(game.finishedAt)
        });
    }
}

async function upsertPlayerWin(username) {
    if (pool) {
        await pool.query(`
        INSERT INTO leaderboard(username, wins) VALUES($1,1)
        ON CONFLICT (username) DO UPDATE SET wins = leaderboard.wins + 1
      `, [username]);
    } else {
        const stats = inMemoryLeaderboard.get(username) || { wins: 0, losses: 0, draws: 0 };
        stats.wins += 1;
        inMemoryLeaderboard.set(username, stats);
    }
}

async function getLeaderboard() {
    if (pool) {
        const res = await pool.query(`SELECT username, wins FROM leaderboard ORDER BY wins DESC LIMIT 50`);
        return res.rows;
    } else {
        // Convert map to array
        return Array.from(inMemoryLeaderboard.entries())
            .map(([username, stats]) => ({ username, wins: stats.wins }))
            .sort((a, b) => b.wins - a.wins)
            .slice(0, 50);
    }
}

module.exports = { initDb, persistFinishedGame, upsertPlayerWin, getLeaderboard };
