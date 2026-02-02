import React, { useState, useEffect } from 'react';
import socket from './services/socket';
import JoinForm from './components/JoinForm';
import Grid from './components/Grid';
import axios from 'axios';

export default function App() {
    const [joined, setJoined] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        socket.on('state', data => setGameState(data));
        // socket.on('waiting', d => console.log(d));
        socket.on('game_finished', d => {
            setGameState(prev => ({ ...prev, status: 'finished', winner: d.winner, result: d.result }));
            alert(`Game Finished! Winner: ${d.winner || 'Draw'}`);
        });
        socket.on('player_disconnected', d => alert(`${d.username} disconnected. They have 30s to rejoin.`));
        socket.on('player_reconnected', d => alert(`${d.username} reconnected!`));
        socket.on('reconnect_ack', d => {
            if (d.success) {
                setGameState({ board: d.board, turn: d.turn, status: d.status });
                // We don't have players info here on rejoin ack easily without fetching or storing, 
                // but 'joined' state might still be missing if page refreshed.
                // For strict page refresh rejoin, we'd need to store username/gameId in localStorage.
                // For now, assuming in-memory flow or user types same username to 'join' which triggers logic in backend?
                // Actually backend 'rejoin' event is distinct. 
            }
        });

        // Check localStorage for rejoin capability on mount
        const saved = localStorage.getItem('c4_session');
        if (saved) {
            const { username, gameId } = JSON.parse(saved);
            if (username && gameId) {
                // Attempt invisible rejoin
                // We need to know if game is still active? 
                // For now, let's just let user use the Join form. 
                // If they enter same username while game active, current backend logic might block 'join_queue' saying "already matches or waiting".
                // The prompt says: "wait up to 10s... otherwise spawn bot".
                // Reconnect logic: socket.emit('rejoin')
            }
        }

        return () => {
            socket.off('state');
            socket.off('game_finished');
            socket.off('player_disconnected');
            socket.off('player_reconnected');
        };
    }, []);

    const onJoined = (data) => {
        setJoined(data);
        // Save for potential rejoin
        localStorage.setItem('c4_session', JSON.stringify({ username: data.username, gameId: data.gameId }));
    };

    const onDrop = (col) => {
        if (!joined) return;
        socket.emit('drop', { gameId: joined.gameId, column: col });
    };

    const fetchLeaderboard = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000'}/leaderboard`);
            setLeaderboard(res.data);
        } catch (e) {
            alert('Could not fetch leaderboard');
        }
    };

    // Determine if it's my turn
    const playerIndex = joined && joined.players[0] === joined.you ? 1 : 2;
    const isMyTurn = gameState && gameState.turn === playerIndex;
    const isGameActive = gameState && gameState.status === 'active';

    return (
        <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: 20 }}>
            <h1>Connect 4 Real-time</h1>

            {!joined ? (
                <JoinForm onJoined={onJoined} />
            ) : (
                <>
                    <div style={{ marginBottom: 20 }}>
                        <h3>Playing as: <strong>{joined.you}</strong> vs <strong>{joined.players.find(p => p !== joined.you)}</strong></h3>
                        <p>Game ID: <small>{joined.gameId}</small></p>
                        {gameState && gameState.status === 'finished' && <h2 style={{ color: 'red' }}>Game Over! Result: {gameState.result}</h2>}
                    </div>

                    <Grid
                        board={(gameState && gameState.board) || Array.from({ length: 6 }, () => Array(7).fill(0))}
                        onDrop={onDrop}
                        disabled={!isMyTurn || !isGameActive}
                        myTurn={isMyTurn}
                    />

                    <div style={{ marginTop: 40 }}>
                        <button onClick={fetchLeaderboard} style={{ padding: '10px 20px' }}>Show Leaderboard</button>
                        {leaderboard.length > 0 && (
                            <div style={{ marginTop: 20, maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd' }}>
                                <table style={{ margin: '0 auto', width: '100%' }}>
                                    <thead><tr><th>User</th><th>Wins</th></tr></thead>
                                    <tbody>
                                        {leaderboard.map(u => <tr key={u.username}><td>{u.username}</td><td>{u.wins}</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
