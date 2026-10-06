const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

// ── Hikvision Device Config ──
const HIKVISION = {
    ip: '192.168.8.104',
    port: 80,
    username: 'admin',
    password: 'enterthepasswd'
};

// Session lifetime: 24 hours
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.text({ type: ['application/xml', 'text/xml', 'text/plain'], limit: '10mb' }));

// ── JSON File Database ──
const readData = () => {
    if (!fs.existsSync(DATA_FILE)) {
        const initial = { users: [], attendance: [], sessions: {} };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
        return initial;
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        // Safety: ensure all keys exist
        return {
            users: parsed.users || [],
            attendance: parsed.attendance || [],
            sessions: parsed.sessions || {}
        };
    } catch (e) {
        console.error('data.json corrupt, resetting:', e.message);
        const initial = { users: [], attendance: [], sessions: {} };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
        return initial;
    }
};

const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

readData();
console.log('Data file ready at:', DATA_FILE);
console.log('Hikvision device configured for:', HIKVISION.ip);

// ── Auth: Login ──
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const validUsers = {
        admin: 'admin123',
        trainer1: 'trainer123',
        trainer2: 'trainer123'
    };

    if (validUsers[username] !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const data = readData();

    // Remove any existing session(s) for this user — enforce one session per user
    Object.keys(data.sessions).forEach(t => {
        if (data.sessions[t].username === username) {
            delete data.sessions[t];
        }
    });

    // Create new token
    const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
    data.sessions[token] = {
        username,
        role: username,
        createdAt: new Date().toISOString()
    };
    writeData(data);
    console.log(`Login: ${username}`);
    res.json({ token, role: username });
});

// ── Auth: Logout ──
app.post('/api/logout', (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
        const data = readData();
        if (data.sessions[token]) {
            const username = data.sessions[token].username;
            delete data.sessions[token];
            writeData(data);
            console.log(`Logout: ${username}`);
        }
    }
    res.json({ success: true });
});

// ── Auth Middleware ──
const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const data = readData();
    const session = data.sessions[token];

    if (!token || !session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Expire old sessions
    if (session.createdAt) {
        const age = Date.now() - new Date(session.createdAt).getTime();
        if (age > SESSION_TTL_MS) {
            delete data.sessions[token];
            writeData(data);
            return res.status(401).json({ error: 'Session expired' });
        }
    }

    req.user = session;
    next();
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin only' });
    }
    next();
};

// ── Users ──
app.get('/api/users', authenticate, (req, res) => {
    const data = readData();
    res.json(data.users);
});

app.post('/api/users', authenticate, (req, res) => {
    const { name, phone, paid, employeeNo } = req.body;
    if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone are required' });
    }

    // Validate phone format: +94 XX XXX XXXX
    if (!/^\+94 \d{2} \d{3} \d{4}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone format. Use +94 XX XXX XXXX' });
    }

    const data = readData();
    const newUser = {
        id: Date.now(),
        name: name.trim(),
        phone,
        paid: !!paid,
        employeeNo: employeeNo ? employeeNo.trim() : String(Date.now()).slice(-8),
        pushedToDevice: false,
        createdAt: new Date().toISOString()
    };
    data.users.push(newUser);
    writeData(data);
    console.log(`User added: ${name} (${phone})`);
    res.json(newUser);
});

app.delete('/api/users/:id', authenticate, requireAdmin, (req, res) => {
    const data = readData();
    const id = parseInt(req.params.id);
    const user = data.users.find(u => u.id === id);
    data.users = data.users.filter(u => u.id !== id);
    writeData(data);
    console.log(`User deleted: ${user ? user.name : id}`);
    res.json({ success: true });
});

app.patch('/api/users/:id/paid', authenticate, (req, res) => {
    const data = readData();
    const id = parseInt(req.params.id);
    const user = data.users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.paid = !user.paid;
    writeData(data);
    console.log(`User ${user.name} paid: ${user.paid}`);
    res.json(user);
});

// ── Hikvision: Push User to Device ──
app.post('/api/hikvision/push-user/:id', authenticate, async (req, res) => {
    const data = readData();
    const id = parseInt(req.params.id);
    const user = data.users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const url = `http://${HIKVISION.ip}:${HIKVISION.port}/ISAPI/AccessControl/UserInfo/Record?format=json`;
    const body = {
        UserInfo: {
            employeeNo: user.employeeNo,
            name: user.name,
            userType: 'normal',
            Valid: {
                enable: true,
                beginTime: '2026-01-01T00:00:00',
                endTime: '2035-12-31T23:59:59',
                timeType: 'local'
            },
            doorRight: '1',
            RightPlan: [{ doorNo: 1, planTemplateNo: '1' }]
        }
    };

    try {
        const auth = Buffer.from(`${HIKVISION.username}:${HIKVISION.password}`).toString('base64');
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(body)
        });
        const text = await response.text();
        console.log('Hikvision push response:', response.status, text);

        if (response.ok) {
            user.pushedToDevice = true;
            writeData(data);
            res.json({ success: true, message: 'User pushed to device. Now enroll fingerprint on the device itself.' });
        } else {
            res.status(response.status).json({ error: 'Device rejected', detail: text });
        }
    } catch (err) {
        console.error('Hikvision push error:', err.message);
        res.status(500).json({ error: 'Cannot reach device', detail: err.message });
    }
});

// ── Hikvision: Event Webhook (device pushes access events here) ──
app.post('/api/hikvision/event', (req, res) => {
    console.log('=== Hikvision Event ===');
    let employeeNo = 'unknown';
    let timestamp = new Date().toISOString();
    let status = 'Granted';

    const raw = req.body;
    if (typeof raw === 'string') {
        const empMatch = raw.match(/<employeeNoString>([^<]+)<\/employeeNoString>/);
        const timeMatch = raw.match(/<dateTime>([^<]+)<\/dateTime>/);
        const statusMatch = raw.match(/<subEventType>([^<]+)<\/subEventType>/);
        if (empMatch) employeeNo = empMatch[1];
        if (timeMatch) timestamp = timeMatch[1];
        if (statusMatch) status = statusMatch[1];
    } else if (raw && typeof raw === 'object') {
        employeeNo = raw.employeeNo || raw.employeeNoString || 'unknown';
        timestamp = raw.time || raw.dateTime || timestamp;
        status = raw.status || 'Granted';
    }

    const data = readData();
    const user = data.users.find(u => u.employeeNo === employeeNo);
    const record = {
        id: Date.now() + Math.random(),
        employeeNo,
        name: user ? user.name : 'Unknown',
        timestamp,
        status
    };
    data.attendance.push(record);
    writeData(data);
    console.log('Recorded attendance:', record);
    res.status(200).send('OK');
});

// ── Attendance ──
app.get('/api/attendance', authenticate, (req, res) => {
    const data = readData();
    res.json(data.attendance);
});

app.post('/api/attendance/export', authenticate, requireAdmin, (req, res) => {
    const data = readData();
    const header = 'ID,EmployeeNo,Name,Timestamp,Status\n';
    const rows = data.attendance.map(a =>
        `${a.id},${a.employeeNo},"${a.name}",${a.timestamp},${a.status}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_export.csv');
    res.send(header + rows);
});

// ── Cleanup: prune expired sessions on startup ──
(function pruneSessions() {
    const data = readData();
    const now = Date.now();
    let removed = 0;
    Object.keys(data.sessions).forEach(t => {
        const s = data.sessions[t];
        if (s.createdAt && now - new Date(s.createdAt).getTime() > SESSION_TTL_MS) {
            delete data.sessions[t];
            removed++;
        }
    });
    if (removed > 0) {
        writeData(data);
        console.log(`Pruned ${removed} expired session(s)`);
    }
})();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running on http://0.0.0.0:${PORT}`);
    console.log(`Hikvision webhook: http://YOUR_IP:${PORT}/api/hikvision/event`);
});