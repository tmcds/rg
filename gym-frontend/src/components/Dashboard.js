import React, { useState, useEffect, useCallback } from 'react';

function Dashboard({ token, role, onLogout }) {
    const [users, setUsers] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [tab, setTab] = useState('members');

    const [showAddForm, setShowAddForm] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('+94 ');
    const [paid, setPaid] = useState(false);
    const [employeeNo, setEmployeeNo] = useState('');
    const [addError, setAddError] = useState('');
    const [saving, setSaving] = useState(false);

    const [bioUser, setBioUser] = useState(null);
    const [bioStatus, setBioStatus] = useState('');
    const [bioStatusType, setBioStatusType] = useState('info');

    const headers = { 'Authorization': `Bearer ${token}` };
    const isAdmin = role === 'admin';

    const fetchData = useCallback(async () => {
        try {
            const [uRes, aRes] = await Promise.all([
                fetch('/api/users', { headers }),
                fetch('/api/attendance', { headers })
            ]);
            if (uRes.ok) setUsers(await uRes.json());
            if (aRes.ok) setAttendance(await aRes.json());
        } catch (err) {
            console.error('fetch error:', err.message);
        }
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Phone formatter: +94 XX XXX XXXX ──
    const formatPhone = (value) => {
        let digits = value.replace(/\D/g, '');
        if (digits.startsWith('94')) digits = digits.slice(2);
        digits = digits.slice(0, 9);
        let out = '+94';
        if (digits.length > 0) out += ' ' + digits.slice(0, 2);
        if (digits.length > 2) out += ' ' + digits.slice(2, 5);
        if (digits.length > 5) out += ' ' + digits.slice(5, 9);
        return out + (digits.length === 0 ? ' ' : '');
    };

    const handlePhoneChange = (e) => {
        const val = e.target.value;
        if (val.length < 4) {
            setPhone('+94 ');
            return;
        }
        setPhone(formatPhone(val));
    };

    const isPhoneValid = (p) => /^\+94 \d{2} \d{3} \d{4}$/.test(p);

    // ── Add User ──
    const addUser = async (e) => {
        e.preventDefault();
        setAddError('');
        if (!isPhoneValid(phone)) {
            setAddError('Please enter a complete phone number: +94 XX XXX XXXX');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, paid, employeeNo })
            });
            if (res.ok) {
                const newUser = await res.json();
                setUsers(prev => [...prev, newUser]);
                setName(''); setPhone('+94 '); setPaid(false); setEmployeeNo('');
                setShowAddForm(false);
                fetchData();
            } else {
                const d = await res.json();
                setAddError(d.error || 'Failed to add user');
            }
        } catch {
            setAddError('Cannot reach server');
        }
        setSaving(false);
    };

    // ── Toggle Paid ──
    const togglePaid = async (id) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, paid: !u.paid } : u));
        try {
            await fetch(`/api/users/${id}/paid`, { method: 'PATCH', headers });
            fetchData();
        } catch {
            fetchData();
        }
    };

    // ── Delete User ──
    const deleteUser = async (id, name) => {
        if (!window.confirm(`Delete "${name}" permanently?`)) return;
        setUsers(prev => prev.filter(u => u.id !== id));
        try {
            await fetch(`/api/users/${id}`, { method: 'DELETE', headers });
            fetchData();
        } catch {
            fetchData();
        }
    };

    // ── Push to Device ──
    const pushToDevice = async (user) => {
        setBioStatus('Pushing user to device...');
        setBioStatusType('info');
        try {
            const res = await fetch(`/api/hikvision/push-user/${user.id}`, {
                method: 'POST', headers
            });
            const d = await res.json();
            if (res.ok) {
                setBioStatus('✅ User created on device. Now enroll the fingerprint ON THE DEVICE ITSELF.');
                setBioStatusType('success');
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, pushedToDevice: true } : u));
                setBioUser(prev => prev ? { ...prev, pushedToDevice: true } : prev);
                fetchData();
            } else {
                setBioStatus(`❌ Device error: ${d.error}. Check device IP/password in server.js.`);
                setBioStatusType('danger');
            }
        } catch {
            setBioStatus('❌ Cannot reach the device. Is it powered on and on the same network?');
            setBioStatusType('danger');
        }
    };

    const exportCSV = async () => {
        const res = await fetch('/api/attendance/export', { method: 'POST', headers });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'attendance.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const paidCount = users.filter(u => u.paid).length;
    const unpaidCount = users.length - paidCount;
    const todayCount = attendance.filter(a =>
        new Date(a.timestamp).toDateString() === new Date().toDateString()
    ).length;

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="brand">💪 Gym Manager</div>
                <nav>
                    <div className={`nav-link-item ${tab === 'members' ? 'active' : ''}`}
                        onClick={() => setTab('members')}>
                        <span>👥</span> <span>Members</span>
                    </div>
                    <div className={`nav-link-item ${tab === 'attendance' ? 'active' : ''}`}
                        onClick={() => setTab('attendance')}>
                        <span>📋</span> <span>Attendance</span>
                    </div>
                </nav>
                <div className="sidebar-footer">
                    <div className="user-chip">
                        <div className="label">Signed in as</div>
                        <div className="name">{role}</div>
                    </div>
                    <button className="btn-icon"
                        style={{ width: '100%', justifyContent: 'center', background: 'transparent', color: '#94a3b8', borderColor: '#334155' }}
                        onClick={onLogout}>
                        Sign Out
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>{tab === 'members' ? 'Members' : 'Attendance Log'}</h1>
                        <div className="subtitle">
                            {tab === 'members'
                                ? `${users.length} registered member${users.length === 1 ? '' : 's'}`
                                : `${attendance.length} total check-in${attendance.length === 1 ? '' : 's'}`}
                        </div>
                    </div>
                    <div>
                        {tab === 'members' && (
                            <button className="btn-primary-custom" onClick={() => setShowAddForm(true)}>
                                + Add Member
                            </button>
                        )}
                        {tab === 'attendance' && isAdmin && (
                            <button className="btn-success-custom" onClick={exportCSV}>
                                ⬇ Export CSV
                            </button>
                        )}
                    </div>
                </div>

                <div className="stat-grid">
                    <div className="stat-card blue">
                        <div className="stat-label">Total Members</div>
                        <div className="stat-value">{users.length}</div>
                    </div>
                    <div className="stat-card green">
                        <div className="stat-label">Paid</div>
                        <div className="stat-value">{paidCount}</div>
                    </div>
                    <div className="stat-card red">
                        <div className="stat-label">Not Paid</div>
                        <div className="stat-value">{unpaidCount}</div>
                    </div>
                    <div className="stat-card blue">
                        <div className="stat-label">Today's Check-ins</div>
                        <div className="stat-value">{todayCount}</div>
                    </div>
                </div>

                {tab === 'members' && (
                    <div className="panel">
                        {users.length === 0 ? (
                            <div className="empty-state">
                                <div className="icon">👥</div>
                                <div className="title">No members yet</div>
                                <div className="hint">Click "+ Add Member" to register your first member</div>
                            </div>
                        ) : (
                            <div className="table-wrap">
                                <table className="clean">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            {isAdmin && <th>Phone</th>}
                                            <th>Employee ID</th>
                                            <th>Paid</th>
                                            <th>Biometric</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td style={{ fontWeight: 600 }}>{u.name}</td>
                                                {isAdmin && (
                                                    <td style={{ color: '#64748b' }}>
                                                        {u.phone || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>—</span>}
                                                    </td>
                                                )}
                                                <td><span className="emp-id">{u.employeeNo}</span></td>
                                                <td>
                                                    <label className="switch">
                                                        <input type="checkbox" checked={u.paid}
                                                            onChange={() => togglePaid(u.id)} />
                                                        <span className="slider"></span>
                                                    </label>
                                                    <span className={`status-text ${u.paid ? 'paid' : 'unpaid'}`}>
                                                        {u.paid ? 'Paid' : 'Not Paid'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {u.pushedToDevice
                                                        ? <span className="badge-soft blue">On Device</span>
                                                        : <span className="badge-soft gray">Not Pushed</span>}
                                                </td>
                                                <td>
                                                    <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                                                        <button className="btn-icon primary"
                                                            onClick={() => { setBioUser(u); setBioStatus(''); }}>
                                                            🔒 Register Biometric
                                                        </button>
                                                        {isAdmin && (
                                                            <button className="btn-icon danger"
                                                                onClick={() => deleteUser(u.id, u.name)}
                                                                title="Delete member">
                                                                🗑 Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'attendance' && (
                    <div className="panel">
                        {attendance.length === 0 ? (
                            <div className="empty-state">
                                <div className="icon">📋</div>
                                <div className="title">No attendance records yet</div>
                                <div className="hint">Records will appear here when members scan their fingerprints</div>
                            </div>
                        ) : (
                            <div className="table-wrap">
                                <table className="clean">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Employee ID</th>
                                            <th>Date &amp; Time</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...attendance].reverse().map(a => (
                                            <tr key={a.id}>
                                                <td style={{ fontWeight: 600 }}>{a.name}</td>
                                                <td><span className="emp-id">{a.employeeNo}</span></td>
                                                <td>{new Date(a.timestamp).toLocaleString()}</td>
                                                <td>
                                                    <span className={`badge-soft ${a.status === 'Granted' ? 'green' : 'red'}`}>
                                                        {a.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ── Add Member Modal ── */}
            {showAddForm && (
                <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-head">
                            <h3>Add New Member</h3>
                            <button className="btn-close-x" onClick={() => setShowAddForm(false)}>×</button>
                        </div>
                        <form onSubmit={addUser}>
                            <div className="modal-body">
                                {addError && <div className="alert-box danger">⚠ {addError}</div>}
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input className="form-input" value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Kasun Perera"
                                        autoFocus required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone Number *</label>
                                    <input
                                        className="form-input"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        placeholder="+94 77 123 4567"
                                        inputMode="numeric"
                                        required
                                    />
                                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                                        Format: <code>+94 XX XXX XXXX</code>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Employee ID (for the device)</label>
                                    <input className="form-input" value={employeeNo}
                                        onChange={e => setEmployeeNo(e.target.value)}
                                        placeholder="Leave blank to auto-generate" />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="switch" style={{ verticalAlign: 'middle' }}>
                                        <input type="checkbox" checked={paid}
                                            onChange={e => setPaid(e.target.checked)} />
                                        <span className="slider"></span>
                                    </label>
                                    <span style={{ marginLeft: 10, fontWeight: 500, fontSize: 14 }}>
                                        Mark as paid member
                                    </span>
                                </div>
                            </div>
                            <div className="modal-foot">
                                <button type="button" className="btn-icon"
                                    onClick={() => setShowAddForm(false)} disabled={saving}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary-custom" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Biometric Modal ── */}
            {bioUser && (
                <div className="modal-overlay" onClick={() => setBioUser(null)}>
                    <div className="modal-box wide" onClick={e => e.stopPropagation()}>
                        <div className="modal-head">
                            <h3>Register Biometric — {bioUser.name}</h3>
                            <button className="btn-close-x" onClick={() => setBioUser(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="alert-box warn">
                                <div>
                                    <strong>Note:</strong> The DS-K1T804BMF cannot stream a live fingerprint
                                    capture to this app. Fingerprint enrollment is done directly on the device.
                                </div>
                            </div>

                            <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                                Enrollment steps
                            </h4>
                            <ol style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: '#334155' }}>
                                <li>
                                    <strong>Push the user</strong> to the device using the button below.
                                </li>
                                <li>
                                    Go to the <strong>device's screen</strong> and enter the admin menu.
                                </li>
                                <li>
                                    Navigate to <strong>User</strong> → find ID <code className="emp-id">{bioUser.employeeNo}</code> → press <strong>Register</strong>.
                                </li>
                                <li>
                                    <strong>Place the finger on the sensor</strong> when prompted.
                                </li>
                                <li>
                                    Once enrolled, the device will automatically send access events to this app.
                                </li>
                            </ol>

                            {bioStatus && (
                                <div className={`alert-box ${bioStatusType}`} style={{ marginTop: 18, marginBottom: 0 }}>
                                    {bioStatus}
                                </div>
                            )}
                        </div>
                        <div className="modal-foot">
                            <button className="btn-icon" onClick={() => setBioUser(null)}>Close</button>
                            <button className="btn-primary-custom" onClick={() => pushToDevice(bioUser)}>
                                📤 Push User to Device
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;