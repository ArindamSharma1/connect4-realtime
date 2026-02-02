import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    // StrictMode double-invokes effects in dev, which is fine but good to know for socket connections
    // If socket connects twice, our gameManager handles it (or socket.io dedupes connection if singleton)
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
