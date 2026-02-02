# 4-in-a-Row (Connect Four) Real-Time App

Full-stack real-time multiplayer Connect Four game with deterministic bot, persistence, and optional analytics.

## Tech Stack
* **Backend**: Node.js, Express, Socket.IO, PostgreSQL (completed games only), In-Memory state for active games, Kafka (optional)
* **Frontend**: React, Socket.IO Client

## Known Limitations

* Active games are stored in memory and will be lost if the server restarts.
* Kafka analytics are mostly meant for demonstration and are optional.
* Since usernames are session-based, there is no authentication layer in place.


## Quick Start (Manual / No Docker)

If you do not have Docker installed, you can run the app manually. The backend detects if no Database is available and switches to **In-Memory Mode** automatically.

### 1. Start Backend
Open a terminal:
```bash
cd backend
npm install
node src/server.js
```
*It will print "No DATABASE_URL found. Using In-Memory persistence..."*

### 2. Start Frontend
Open a **new** terminal:
```bash
cd frontend
npm install
npm start
```
*It will open http://localhost:3000 in your browser.*

### 3. Play
*   Open two browser windows at http://localhost:3000.
*   Join with different usernames.
*   **Bot Mode**: Join with one user and wait 10 seconds. The bot will appear.

## Features & Design

*   **Real-time Interaction**: Uses Socket.IO for low-latency updates (drop events, state sync).
*   **Matchmaking**: Players join a queue. If no opponent passes in 10s, a **Deterministic Bot** is spawned.
*   **Bot Strategy**:
    1.  Check for immediate win.
    2.  Check for immediate block.
    3.  Positional preference (Center columns).
    4.  Threat scoring (creating sequences).
*   **Persistence**: PostgreSQL stores *only* finished games. **If no DB provided, falls back to in-memory (lost on restart).**
*   **Reconnect**: 30s grace period for disconnected players to rejoin.
*   **Analytics**: Emits events to Kafka `game-analytics` topic (optional).

## WebSocket Events

| Event | Direction | Description |
| :--- | :--- | :--- |
| `join_queue` | Client -> Server | Request to join matchmaking. |
| `matched` | Server -> Client | Game found, includes `gameId`. |
| `drop` | Client -> Server | Player drops a disc in a column. |
| `state` | Server -> Client | Broadcasts updated board and turn. |
| `game_finished` | Server -> Client | Notifies game end and winner. |

## Demo Checklist
- [x] Join Queue -> Match
- [x] Bot Spawn (wait 10s)
- [x] Win/Loss detection
- [x] Reconnect (simulated)
- [x] Leaderboard persistence (In-Memory or DB)
