import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/login.css';
import { User, Lock } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [shake, setShake] = useState(false);

    const handleLogin = () => {
        const correctUser = 'jaithindaltiles';
        const correctPass = 'jaithindal';

        if (!username || !password) {
            alert('Please enter username and password.');
            return;
        }

        if (username === correctUser && password === correctPass) {
            // Simple authentication simulation
            localStorage.setItem('isAuthenticated', 'true');
            navigate('/dashboard');
        } else {
            setShake(true);
            setTimeout(() => setShake(false), 300);
            alert('Incorrect username or password.');
        }
    };



    return (
        <div className="login-body">
            <div className="login-wrap">

                {/* Left brand panel */}
                <aside className="login-panel" aria-hidden="false">
                    <div>
                        <div className="login-brand">
                            <div className="login-logo">JTT</div>
                            <div>
                                <h1>JAI THINDAL TILES</h1>
                                <p>Premium Tiles &amp; Designs</p>
                            </div>
                        </div>

                        <div className="panel-hero">
                            <strong>Beautiful. Durable. Timeless.</strong>
                            <p style={{ marginTop: '10px' }}>Manage inventory, pricing and orders from a single place. Fast, secure access for authorized admins.</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '18px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ fontSize: '12px', background: 'rgba(255,255,255,0.06)', padding: '8px', borderRadius: '8px' }}>Safe • Encrypted</div>
                        <div style={{ fontSize: '12px', background: 'rgba(255,255,255,0.06)', padding: '8px', borderRadius: '8px' }}>99.9% Uptime</div>
                    </div>

                    <div className="decor-blob"></div>
                </aside>

                {/* Right login card */}
                <main className="login-card" role="main" style={shake ? { transform: 'translateX(-8px)' } : {}}>
                    <h2>Admin Login</h2>
                    <p className="sub">Sign in to access the dashboard</p>

                    <div style={{ marginBottom: '10px' }}>
                        <label className="muted" htmlFor="username">Username</label>
                        <div className="field" style={{ marginTop: '6px' }}>
                            <User size={18} color="#2f6b4b" style={{ opacity: 0.9, marginRight: '10px' }} />
                            <input
                                id="username"
                                type="text"
                                placeholder="Enter username"
                                aria-label="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '6px' }}>
                        <label className="muted" htmlFor="password">Password</label>
                        <div className="field" style={{ marginTop: '6px' }}>
                            <Lock size={18} color="#2f6b4b" style={{ opacity: 0.9, marginRight: '10px' }} />
                            <input
                                id="password"
                                type="password"
                                placeholder="Enter password"
                                aria-label="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-row" style={{ marginTop: '6px' }}>
                        <label className="checkbox"><input id="remember" type="checkbox" /> Remember me</label>
                        <a href="#" id="forgot" style={{ marginLeft: 'auto', color: 'var(--accent-1)', fontSize: '13px', textDecoration: 'none' }}>Forgot password?</a>
                    </div>

                    <div style={{ marginTop: '14px', display: 'flex', gap: '12px' }}>
                        <button className="btn" onClick={handleLogin}>Sign In</button>

                    </div>

                    <p className="note">Only authorized admins can log in. Actions are audited and secured.</p>

                    <div className="footer-links" aria-hidden="true">
                        <a href="#">Terms</a>
                        <a href="#">Privacy</a>
                        <a href="#">Help</a>
                    </div>
                </main>

            </div>
        </div>
    );
};

export default Login;
