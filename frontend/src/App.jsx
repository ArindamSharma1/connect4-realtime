import React, { useState, useEffect } from 'react';
import socket from './services/socket';
import JoinForm from './components/JoinForm';
import Grid from './components/Grid';
import axios from 'axios';

function Notification({ message, type, onClose }) {
    if (!message) return null;
    const styles = {
        padding: '10px',
        margin: '10px auto',
        borderRadius: '5px',
        maxWidth: '400px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#fff',
        backgroundColor: type === 'error' ? '#d9534f' : type === 'success' ? '#5cb85c' : '#5bc0de'
    };
    return (
        <div style={styles}>
            <span>{message}</span>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', marginLeft: 10 }}>✖</button>
        </div>
    );
}

export default function App() {
    const [joined, setJoined] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [notification, setNotification] = useState({ msg: '', type: '' });

    const showNotify = (msg, type = 'info') => {
        setNotification({ msg, type });
        // Auto-hide after 5 seconds if it's just info
        if (type === 'info') setTimeout(() => setNotification({ msg: '', type: '' }), 5000);
    };

    useEffect(() => {
        socket.on('state', data => setGameState(data));
        socket.on('game_finished', d => {
            setGameState(prev => ({ ...prev, status: 'finished', winner: d.winner, result: d.result }));
            showNotify(`Game Over! Winner: ${d.winner || 'Draw'}`, 'success');
        });
        socket.on('player_disconnected', d => showNotify(`${d.username} disconnected. They have 30s to rejoin.`, 'error'));
        socket.on('player_reconnected', d => showNotify(`${d.username} reconnected!`, 'success'));
        socket.on('reconnect_ack', d => {
            if (d.success) setGameState({ board: d.board, turn: d.turn, status: d.status });
        });
        // Error handling global
        socket.on('error', e => showNotify(e.message, 'error'));

        return () => {
            socket.off('state');
            socket.off('game_finished');
            socket.off('player_disconnected');
            socket.off('player_reconnected');
            socket.off('reconnect_ack');
            socket.off('error');
        };
    }, []);

    const onJoined = (data) => {
        setJoined(data);
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
            showNotify('Could not fetch leaderboard', 'error');
        }
    };

    const resetGame = () => {
        setJoined(null);
        setGameState(null);
        setNotification({ msg: '', type: '' });
        localStorage.removeItem('c4_session');
        // Ideally emit 'leave' if backend supported it, but disconnect handles cleanup mostly.
        // We will just rejoin as fresh.
    };

    // Determine if it's my turn
    const playerIndex = joined && joined.players[0] === joined.you ? 1 : 2;
    const isMyTurn = gameState && gameState.turn === playerIndex;
    const isGameActive = gameState && gameState.status === 'active';

    return (
        <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: 20 }}>
            <h1>Connect 4 Real-time</h1>

            <Notification
                message={notification.msg}
                type={notification.type}
                onClose={() => setNotification({ msg: '', type: '' })}
            />

            {!joined ? (
                <JoinForm
                    onJoined={onJoined}
                    onError={(msg) => showNotify(msg, 'error')}
                    onStatus={(msg) => showNotify(msg, 'info')}
                />
            ) : (
                <>
                    <div style={{ marginBottom: 20 }}>
                        <h3>Playing as: <strong>{joined.you}</strong> vs <strong>{joined.players.find(p => p !== joined.you)}</strong></h3>
                        <p>Game ID: <small>{joined.gameId}</small></p>
                        {gameState && gameState.status === 'finished' && (
                            <div style={{ margin: '20px 0' }}>
                                <h2 style={{ color: gameState.winner ? '#28a745' : '#666' }}>
                                    Result: {gameState.winner ? `${gameState.winner} Won!` : 'Draw!'}
                                </h2>
                                <button
                                    onClick={resetGame}
                                    style={{
                                        padding: '12px 24px',
                                        fontSize: '18px',
                                        background: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Play Again
                                </button>
                            </div>
                        )}
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
