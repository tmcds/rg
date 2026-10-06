import React, { useState } from 'react';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (res.ok) {
                const data = await res.json();
                onLogin(data.token, data.role);
            } else {
                const d = await res.json();
                setError(d.error || 'Login failed');
            }
        } catch (err) {
            setError('Cannot reach server');
        }
        setLoading(false);
    };

    return (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#1e293b' }}>
            <div className="card p-4" style={{ width: 380, borderRadius: 16 }}>
                <div className="text-center mb-4">
                    <h2 className="fw-bold">💪 Gym Manager</h2>
                    <p className="text-muted mb-0">Sign in to continue</p>
                </div>
                {error && <div className="alert alert-danger py-2">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-medium">Username</label>
                        <input type="text" className="form-control" value={username}
                            onChange={e => setUsername(e.target.value)} autoFocus required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label fw-medium">Password</label>
                        <input type="password" className="form-control" value={password}
                            onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary w-100 py-2" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
                <div className="text-center mt-3 text-muted" style={{ fontSize: 12 }}>
                    admin / admin123 &nbsp;•&nbsp; trainer1 / trainer123
                </div>
            </div>
        </div>
    );
}

export default Login;