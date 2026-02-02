import React, { useState } from 'react';
import socket from '../services/socket';

export default function JoinForm({ onJoined }) {
    const [username, setUsername] = useState('');
    const submit = (e) => {
        e.preventDefault();
        if (!username.trim()) return;
        socket.emit('join_queue', { username });
        socket.once('matched', (data) => onJoined({ username, ...data }));
        socket.once('waiting', (d) => alert(d.message));
        // Basic error handling
        socket.once('error', (e) => alert(e.message));
    };
    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '300px', margin: '20px auto' }}>
            <h2>Join Game</h2>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter username"
                    style={{ padding: '8px', fontSize: '16px' }}
                />
                <button type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Play</button>
            </form>
        </div>
    );
}
