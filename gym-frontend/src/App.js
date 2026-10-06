import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [role, setRole] = useState(localStorage.getItem('role'));

    const handleLogin = (newToken, newRole) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('role', newRole);
        setToken(newToken);
        setRole(newRole);
    };

    const handleLogout = async () => {
        const t = localStorage.getItem('token');
        if (t) {
            try {
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${t}` }
                });
            } catch {
                // ignore network errors on logout
            }
        }
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setToken(null);
        setRole(null);
    };

    if (!token) return <Login onLogin={handleLogin} />;
    return <Dashboard token={token} role={role} onLogout={handleLogout} />;
}

export default App;