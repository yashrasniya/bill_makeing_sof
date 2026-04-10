import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { clientToken } from "@/axios";
import { fetchUser } from "@/store/userSlice";
import { useDispatch } from "react-redux";

function Login() {
    const navigate = useNavigate();
    const [username, set_username] = useState('');
    const [password, set_password] = useState('');
    const [error, setError] = useState('');
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const handelLogin = () => {
        setLoading(true);
        setError('');
        clientToken.post('login/', {
            username: username,
            password: password,
        }).then((response) => {
            if (response.status === 200) {
                setLoading(false);
                dispatch(fetchUser());
                navigate('/home');
            }
        }).catch((error) => {
            if (error.response?.status === 400) {
                setError('Incorrect username or password.');
            } else {
                setError("Something went wrong, please try again.");
            }
            setLoading(false);
        });
    };

    /* ── shared input focus style ── */
    const focusInput = (e) => {
        e.target.style.borderColor = '#4f46e5';
        e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.15)';
    };
    const blurInput = (e) => {
        e.target.style.borderColor = '#e2e8f0';
        e.target.style.boxShadow = 'none';
    };

    return (
        <div style={{
            display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
            {/* ── Google Font ── */}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

            {/* ─────── LEFT PANEL ─────── */}
            <div className="login-left-panel" style={{
                flex: '0 0 46%', position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(145deg, #312e81 0%, #4f46e5 45%, #7c3aed 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '48px',
            }}>
                {/* decorative orbs */}
                <div style={{
                    position: 'absolute', top: '-100px', left: '-100px',
                    width: '380px', height: '380px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-120px', right: '-80px',
                    width: '420px', height: '420px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', top: '40%', right: '-60px',
                    width: '200px', height: '200px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
                }} />

                {/* Logo mark */}
                <div style={{
                    width: '64px', height: '64px', borderRadius: '18px',
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '28px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <path d="M6 8h20M6 16h14M6 24h9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                </div>

                <h1 style={{
                    fontSize: '32px', fontWeight: 900, color: 'white',
                    letterSpacing: '-1px', textAlign: 'center', marginBottom: '12px',
                }}>Invoice App</h1>
                <p style={{
                    fontSize: '16px', color: 'rgba(255,255,255,0.75)',
                    textAlign: 'center', lineHeight: 1.7, maxWidth: '300px',
                    marginBottom: '48px',
                }}>
                    Smart billing, inventory & sales analytics — all in one place.
                </p>

                {/* Feature pills */}
                {[
                    { icon: '🎨', text: 'Custom bill templates' },
                    { icon: '📦', text: 'Inventory management' },
                    { icon: '👥', text: 'Customer tracking' },
                    { icon: '📊', text: 'Monthly sales reports' },
                ].map((item, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '12px', padding: '11px 18px',
                        marginBottom: '10px', width: '100%', maxWidth: '300px',
                    }}>
                        <span style={{ fontSize: '18px' }}>{item.icon}</span>
                        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                            {item.text}
                        </span>
                    </div>
                ))}
            </div>

            {/* ─────── RIGHT PANEL ─────── */}
            <div className="login-right-panel" style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: '#f8fafc', padding: '40px 32px', overflowY: 'auto',
                position: 'relative',
            }}>
                {/* subtle top-right orb */}
                <div style={{
                    position: 'absolute', top: '-60px', right: '-60px',
                    width: '280px', height: '280px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-60px', left: '-40px',
                    width: '220px', height: '220px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                {/* Card */}
                <div style={{
                    background: 'white', borderRadius: '24px',
                    padding: '48px 44px', width: '100%', maxWidth: '420px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
                    position: 'relative', zIndex: 1,
                }}>
                    {/* Card header */}
                    <div style={{ marginBottom: '32px' }}>
                        {/* Small logo for mobile / right side */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px',
                        }}>
                            <div style={{
                                width: '34px', height: '34px', borderRadius: '9px',
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                            }}>
                                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                                    <path d="M4 5h12M4 10h8M4 15h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                            <span style={{
                                fontSize: '16px', fontWeight: 800,
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>Invoice App</span>
                        </div>

                        <h2 style={{
                            fontSize: '28px', fontWeight: 800, color: '#0f172a',
                            letterSpacing: '-0.7px', marginBottom: '6px',
                        }}>Welcome back</h2>
                        <p style={{ fontSize: '15px', color: '#94a3b8', fontWeight: 400 }}>
                            Sign in to your account to continue
                        </p>
                    </div>

                    {/* Username */}
                    <div style={{ marginBottom: '18px' }}>
                        <label style={{
                            display: 'block', fontSize: '13px', fontWeight: 600,
                            color: '#374151', marginBottom: '7px', letterSpacing: '0.02em',
                        }}>Username</label>
                        <input
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => set_username(e.target.value)}
                            onFocus={focusInput}
                            onBlur={blurInput}
                            style={{
                                width: '100%', padding: '12px 14px', fontSize: '15px',
                                border: '1.5px solid #e2e8f0', borderRadius: '12px',
                                outline: 'none', color: '#0f172a', background: '#f8fafc',
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: '8px' }}>
                        <label style={{
                            display: 'block', fontSize: '13px', fontWeight: 600,
                            color: '#374151', marginBottom: '7px', letterSpacing: '0.02em',
                        }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPass ? 'text' : 'password'}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => set_password(e.target.value)}
                                onFocus={focusInput}
                                onBlur={blurInput}
                                onKeyDown={(e) => { if (e.key === 'Enter') handelLogin(); }}
                                style={{
                                    width: '100%', padding: '12px 44px 12px 14px', fontSize: '15px',
                                    border: '1.5px solid #e2e8f0', borderRadius: '12px',
                                    outline: 'none', color: '#0f172a', background: '#f8fafc',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    boxSizing: 'border-box',
                                }}
                            />
                            {/* show/hide toggle */}
                            <button
                                onClick={() => setShowPass(v => !v)}
                                style={{
                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: '#94a3b8', padding: '2px',
                                }}
                            >
                                {showPass ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" />
                                        <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            background: '#fef2f2', border: '1px solid #fecaca',
                            borderRadius: '10px', padding: '10px 14px',
                            fontSize: '13px', color: '#dc2626', fontWeight: 500,
                            marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-9V7a1 1 0 10-2 0v2a1 1 0 102 0zm0 4a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Login button */}
                    <button
                        onClick={handelLogin}
                        disabled={loading}
                        style={{
                            width: '100%', padding: '13px', marginTop: '22px',
                            fontSize: '15px', fontWeight: 700, color: 'white',
                            background: loading
                                ? 'linear-gradient(135deg, #818cf8, #a78bfa)'
                                : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 6px 20px rgba(79,70,229,0.35)',
                            transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}
                        onMouseEnter={e => {
                            if (!loading) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 10px 28px rgba(79,70,229,0.45)';
                            }
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.35)';
                        }}
                    >
                        {loading ? (
                            <>
                                <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                                    <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                                Signing in...
                            </>
                        ) : (
                            <>
                                Sign In
                                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                                    <path d="M3 9h12M9 3l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        margin: '24px 0 20px',
                    }}>
                        <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }} />
                        <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 500 }}>OR</span>
                        <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }} />
                    </div>

                    {/* Sign up link */}
                    <p style={{ textAlign: 'center', fontSize: '14px', color: '#64748b', margin: 0 }}>
                        Don't have an account?{' '}
                        <span
                            onClick={() => navigate('/SignUp')}
                            style={{
                                color: '#4f46e5', fontWeight: 700, cursor: 'pointer',
                                textDecoration: 'none',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
                            onMouseLeave={e => e.currentTarget.style.color = '#4f46e5'}
                        >
                            Create account →
                        </span>
                    </p>
                </div>

                {/* Back to home */}
                <button
                    onClick={() => navigate('/')}
                    style={{
                        marginTop: '20px', background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: '13px', color: '#94a3b8',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#4f46e5'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                    <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                        <path d="M15 9H3M9 15l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Back to home
                </button>

                <style>{`
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    @media (max-width: 700px) {
                        .login-left-panel { display: none !important; }
                        .login-right-panel { padding: 24px 16px !important; }
                    }
                `}</style>
            </div>
        </div>
    );
}

export { Login };
