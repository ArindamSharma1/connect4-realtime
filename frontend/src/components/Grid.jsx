import React from 'react';

export default function Grid({ board, onDrop, disabled, myTurn }) {
    const columns = [...Array(7).keys()];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', marginBottom: '10px' }}>
                {columns.map(c => (
                    <button
                        key={c}
                        onClick={() => onDrop(c)}
                        disabled={disabled}
                        style={{
                            flex: 1,
                            width: '60px',
                            height: '40px',
                            margin: '0 2px',
                            background: disabled ? '#ccc' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: disabled ? 'not-allowed' : 'pointer'
                        }}
                    >
                        ↓
                    </button>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,64px)', gap: '4px', background: '#0055aa', padding: '10px', borderRadius: '8px' }}>
                {board.flat().map((cell, idx) => {
                    let color = 'white'; // empty
                    if (cell === 1) color = '#ff4136'; // Player 1 Red
                    if (cell === 2) color = '#ffdc00'; // Player 2 Yellow

                    return (
                        <div key={idx} style={{
                            width: 60,
                            height: 60,
                            background: color,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)'
                        }}>
                            {/* {cell} */}
                        </div>
                    );
                })}
            </div>
            {disabled && <div style={{ marginTop: '10px', color: '#666' }}>{myTurn ? 'Making move...' : 'Waiting for opponent...'}</div>}
        </div>
    );
}
