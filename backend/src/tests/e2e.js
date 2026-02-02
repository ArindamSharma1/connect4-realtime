const { io } = require("socket.io-client");

const URL = "http://localhost:4000";

async function run() {
    console.log("Starting E2E Test...");

    const socket1 = io(URL, { autoConnect: false });
    const socket2 = io(URL, { autoConnect: false });

    await new Promise(r => { socket1.connect(); socket1.on('connect', r); });
    console.log("Socket 1 connected");

    await new Promise(r => { socket2.connect(); socket2.on('connect', r); });
    console.log("Socket 2 connected");

    // Join Queue
    socket1.emit('join_queue', { username: 'Player1' });
    socket2.emit('join_queue', { username: 'Player2' });

    // Wait for match
    const matchP1 = await new Promise(r => socket1.once('matched', r));
    console.log("Matched P1:", matchP1);

    // Play moves
    // P1 turn
    console.log("P1 drop col 0");
    socket1.emit('drop', { gameId: matchP1.gameId, column: 0 });

    await new Promise(r => setTimeout(r, 500));

    // P2 turn
    console.log("P2 drop col 1");
    socket2.emit('drop', { gameId: matchP1.gameId, column: 1 });

    await new Promise(r => setTimeout(r, 500));

    console.log("Test sequence complete. Please inspect server logs or manually verify state.");

    socket1.disconnect();
    socket2.disconnect();
}

run().catch(console.error);
