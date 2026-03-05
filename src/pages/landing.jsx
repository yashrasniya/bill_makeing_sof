import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── tiny hook: fade-in when element enters viewport ─── */
function useFadeIn() {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold: 0.15 }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);
    return [ref, visible];
}

/* ─── Feature data ─── */
const FEATURES = [
    {
        id: 'template-builder',
        title: 'Create Your Own Bill Template',
        subtitle: 'Design freedom at your fingertips',
        description:
            'Build pixel-perfect invoice templates that match your brand. Choose fonts, colors, layout sections, and logos — no code needed. Your invoices, your style.',
        bullets: [
            'Drag-and-drop block editor',
            'Custom logo, colors & fonts',
            'Live preview before saving',
            'Save unlimited templates',
        ],
        img: '/feature_template_builder.png',
        accent: '#4f46e5',
        accentLight: '#eef2ff',
        icon: (
            <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
                <rect width="40" height="40" rx="10" fill="#4f46e5" opacity=".12" />
                <path d="M10 14h4M10 20h8M10 26h5" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" />
                <rect x="20" y="11" width="10" height="18" rx="2" stroke="#4f46e5" strokeWidth="1.8" />
                <path d="M22 15h6M22 18h6M22 21h4" stroke="#4f46e5" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
        ),
        flip: false,
    },
    {
        id: 'prebuilt-templates',
        title: 'Use Pre-Built Templates',
        subtitle: 'Professional designs, ready in seconds',
        description:
            'Pick from a rich library of professionally designed invoice templates — from freelancer-friendly to corporate polished. Simply select, fill in, and send.',
        bullets: [
            '12+ ready-to-use templates',
            'Categorized by business type',
            'One-click apply & customize',
            'Regularly updated gallery',
        ],
        img: '/feature_prebuilt_templates.png',
        accent: '#7c3aed',
        accentLight: '#f5f3ff',
        icon: (
            <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
                <rect width="40" height="40" rx="10" fill="#7c3aed" opacity=".12" />
                <rect x="8" y="10" width="11" height="14" rx="2" stroke="#7c3aed" strokeWidth="1.8" />
                <rect x="21" y="10" width="11" height="14" rx="2" stroke="#7c3aed" strokeWidth="1.8" />
                <path d="M8 27h11M21 27h11" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        ),
        flip: true,
    },
    {
        id: 'inventory',
        title: 'Maintain Your Inventory',
        subtitle: 'Never lose track of your stock',
        description:
            'Keep a real-time record of all your products and services. Add items, update stock levels, and auto-fill them into invoices — saving time on every bill.',
        bullets: [
            'Add & edit products/services',
            'Track stock quantities',
            'Auto-fill items in bills',
            'Search & filter catalog',
        ],
        img: '/feature_inventory.png',
        accent: '#0891b2',
        accentLight: '#ecfeff',
        icon: (
            <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
                <rect width="40" height="40" rx="10" fill="#0891b2" opacity=".12" />
                <rect x="8" y="22" width="6" height="10" rx="1.5" fill="#0891b2" opacity=".5" />
                <rect x="17" y="16" width="6" height="16" rx="1.5" fill="#0891b2" opacity=".7" />
                <rect x="26" y="10" width="6" height="22" rx="1.5" fill="#0891b2" />
            </svg>
        ),
        flip: false,
    },
    {
        id: 'customers',
        title: 'Manage Your Customers',
        subtitle: 'All your clients, one clean place',
        description:
            'Save customer details once and reuse them forever. View billing history, track purchases, and personalize every invoice with a click.',
        bullets: [
            'Customer directory & profiles',
            'Full billing history per client',
            'Quick search & filter',
            'Auto-populate client info',
        ],
        img: '/feature_customers.png',
        accent: '#2563eb',
        accentLight: '#eff6ff',
        icon: (
            <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
                <rect width="40" height="40" rx="10" fill="#2563eb" opacity=".12" />
                <circle cx="17" cy="16" r="5" stroke="#2563eb" strokeWidth="1.8" />
                <path d="M8 31c0-5 4-8 9-8s9 3 9 8" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="28" cy="15" r="3.5" stroke="#2563eb" strokeWidth="1.5" />
                <path d="M32 28c0-3-1.8-5-4-5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
        flip: true,
    },
    {
        id: 'reports',
        title: 'Sales Reports & Analytics',
        subtitle: 'Understand your business at a glance',
        description:
            'Get beautifully formatted monthly sales reports with charts, revenue breakdowns, and trend analysis. Export PDF reports or view them directly in the dashboard.',
        bullets: [
            'Monthly & yearly summaries',
            'Revenue charts & trend lines',
            'Exportable PDF reports',
            'Top-selling products insight',
        ],
        img: '/feature_sales_report.png',
        accent: '#059669',
        accentLight: '#ecfdf5',
        icon: (
            <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
                <rect width="40" height="40" rx="10" fill="#059669" opacity=".12" />
                <path d="M8 28l7-8 6 5 7-12" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="29" cy="13" r="2.5" fill="#059669" />
            </svg>
        ),
        flip: false,
    },
];

/* ─── Stats ─── */
const STATS = [
    { value: '10K+', label: 'Invoices Created' },
    { value: '500+', label: 'Happy Businesses' },
    { value: '12+', label: 'Ready Templates' },
    { value: '99%', label: 'Uptime Guarantee' },
];

/* ─── Hero floating badges ─── */
const HeroBadge = ({ style, children }) => (
    <div style={{
        position: 'absolute', background: 'white', borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(79,70,229,0.13)', padding: '10px 16px',
        fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
        whiteSpace: 'nowrap', color: '#1e293b', ...style
    }}>
        {children}
    </div>
);

/* ─── Feature Section ─── */
function FeatureSection({ feature }) {
    const [ref, visible] = useFadeIn();
    const { title, subtitle, description, bullets, img, accent, accentLight, icon, flip } = feature;

    return (
        <section
            ref={ref}
            id={feature.id}
            style={{
                padding: '100px 0',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(48px)',
                transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
        >
            <div style={{
                maxWidth: '1100px', margin: '0 auto', padding: '0 24px',
                display: 'flex', flexDirection: flip ? 'row-reverse' : 'row',
                alignItems: 'center', gap: '64px', flexWrap: 'wrap',
            }}>
                {/* Text */}
                <div style={{ flex: '1 1 340px', minWidth: 0 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '10px',
                        background: accentLight, borderRadius: '99px',
                        padding: '6px 16px 6px 8px', marginBottom: '20px',
                    }}>
                        {icon}
                        <span style={{ fontSize: '13px', fontWeight: 700, color: accent, letterSpacing: '0.02em' }}>
                            {subtitle}
                        </span>
                    </div>
                    <h2 style={{
                        fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800,
                        color: '#0f172a', lineHeight: 1.2, marginBottom: '16px',
                    }}>
                        {title}
                    </h2>
                    <p style={{ fontSize: '17px', color: '#475569', lineHeight: 1.8, marginBottom: '28px' }}>
                        {description}
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {bullets.map((b, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{
                                    width: '22px', height: '22px', borderRadius: '50%',
                                    background: accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 6l3 3 5-5" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                                <span style={{ fontSize: '15px', color: '#334155', fontWeight: 500 }}>{b}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Image */}
                <div style={{ flex: '1 1 380px', minWidth: 0, position: 'relative' }}>
                    <div style={{
                        position: 'absolute', inset: '-20px',
                        background: `radial-gradient(ellipse at 50% 50%, ${accentLight} 0%, transparent 70%)`,
                        borderRadius: '32px', zIndex: 0,
                    }} />
                    <div style={{
                        position: 'relative', zIndex: 1,
                        borderRadius: '20px', overflow: 'hidden',
                        boxShadow: `0 24px 64px ${accent}28`,
                        border: '1px solid #e2e8f0',
                        transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                    }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)';
                            e.currentTarget.style.boxShadow = `0 36px 80px ${accent}38`;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            e.currentTarget.style.boxShadow = `0 24px 64px ${accent}28`;
                        }}
                    >
                        <img src={img} alt={title} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ─── Main Landing Page ─── */
function LandingPage() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [heroRef, heroVisible] = useFadeIn();
    const [statsRef, statsVisible] = useFadeIn();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#f8fafc', minHeight: '100vh', overflowX: 'hidden' }}>
            {/* ── Google Font ── */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

            {/* ─────────────── NAVBAR ─────────────── */}
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                padding: '0 24px',
                background: scrolled ? 'rgba(255,255,255,0.9)' : 'transparent',
                backdropFilter: scrolled ? 'blur(16px)' : 'none',
                boxShadow: scrolled ? '0 1px 24px rgba(0,0,0,0.07)' : 'none',
                transition: 'background 0.3s, box-shadow 0.3s',
            }}>
                <div style={{
                    maxWidth: '1100px', margin: '0 auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    height: '68px',
                }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                        }}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M4 5h12M4 10h8M4 15h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <span style={{
                            fontSize: '20px', fontWeight: 800,
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px',
                        }}>Invoice App</span>
                    </div>

                    {/* Nav links */}
                    <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {['template-builder', 'inventory', 'reports'].map(id => (
                            <a key={id} href={`#${id}`} style={{
                                fontSize: '14px', fontWeight: 500, color: '#64748b',
                                textDecoration: 'none', padding: '6px 12px', borderRadius: '8px',
                                transition: 'color 0.2s, background 0.2s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.background = '#eef2ff'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
                            >
                                {id === 'template-builder' ? 'Templates' : id === 'inventory' ? 'Inventory' : 'Reports'}
                            </a>
                        ))}
                        <button onClick={() => navigate('/login')} style={{
                            fontSize: '14px', fontWeight: 600, color: '#4f46e5',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            padding: '8px 14px', borderRadius: '8px',
                            transition: 'background 0.2s',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = '#eef2ff'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >Log In</button>
                        <button onClick={() => navigate('/SignUp')} style={{
                            fontSize: '14px', fontWeight: 700, color: 'white',
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            border: 'none', cursor: 'pointer',
                            padding: '9px 20px', borderRadius: '10px',
                            boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.45)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(79,70,229,0.35)'; }}
                        >Get Started →</button>
                    </nav>
                </div>
            </header>

            {/* ─────────────── HERO ─────────────── */}
            <section style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                padding: '120px 24px 80px',
                background: 'linear-gradient(160deg, #f0f4ff 0%, #faf5ff 40%, #f0fdf4 100%)',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Background decorations */}
                <div style={{
                    position: 'absolute', top: '-120px', left: '-120px',
                    width: '500px', height: '500px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-80px', right: '-80px',
                    width: '400px', height: '400px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', top: '35%', right: '5%',
                    width: '200px', height: '200px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                {/* Floating badges */}
                <HeroBadge style={{ top: '22%', left: '8%', animationName: 'floatA', animationDuration: '4s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' }}>
                    <span style={{ fontSize: '18px' }}>📄</span> Invoice Created!
                </HeroBadge>
                <HeroBadge style={{ top: '28%', right: '7%', animationName: 'floatB', animationDuration: '4.5s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' }}>
                    <span style={{ color: '#10b981', fontSize: '16px' }}>↑</span> Revenue +23%
                </HeroBadge>
                <HeroBadge style={{ bottom: '22%', left: '6%', animationName: 'floatC', animationDuration: '5s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' }}>
                    <span style={{ fontSize: '18px' }}>👥</span> 12 New Customers
                </HeroBadge>
                <HeroBadge style={{ bottom: '28%', right: '8%', animationName: 'floatA', animationDuration: '3.8s', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' }}>
                    <span style={{ fontSize: '18px' }}>📦</span> Stock Updated
                </HeroBadge>

                <style>{`
                  @keyframes floatA { 0%,100% { transform: translateY(0px);} 50% { transform: translateY(-12px);} }
                  @keyframes floatB { 0%,100% { transform: translateY(-8px);} 50% { transform: translateY(4px);} }
                  @keyframes floatC { 0%,100% { transform: translateY(4px);} 50% { transform: translateY(-10px);} }
                  @keyframes pulse-ring { 0%,100% { transform: scale(1); opacity:.5; } 50% { transform: scale(1.08); opacity:.2; } }
                  @media (max-width: 768px) {
                    .hero-badge { display: none !important; }
                    .feature-row { flex-direction: column !important; }
                    .stat-grid { grid-template-columns: 1fr 1fr !important; }
                  }
                `}</style>

                <div ref={heroRef} style={{
                    maxWidth: '780px', position: 'relative', zIndex: 1,
                    opacity: heroVisible ? 1 : 0,
                    transform: heroVisible ? 'translateY(0)' : 'translateY(40px)',
                    transition: 'opacity 0.8s ease, transform 0.8s ease',
                }}>
                    {/* Pill badge */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        background: '#eef2ff', border: '1px solid #c7d2fe',
                        borderRadius: '99px', padding: '6px 16px', marginBottom: '28px',
                        fontSize: '13px', fontWeight: 600, color: '#4f46e5',
                    }}>
                        <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: '#4f46e5', display: 'inline-block',
                            animation: 'pulse-ring 2s infinite',
                        }} />
                        Billing Software for Modern Businesses
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(40px, 7vw, 76px)',
                        fontWeight: 900, color: '#0f172a', lineHeight: 1.1,
                        letterSpacing: '-2px', marginBottom: '24px',
                    }}>
                        Smart Billing,{' '}
                        <span style={{
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #2563eb)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>Zero Hassle</span>
                    </h1>

                    <p style={{
                        fontSize: 'clamp(16px, 2.5vw, 20px)', color: '#64748b',
                        lineHeight: 1.75, marginBottom: '40px', maxWidth: '580px', margin: '0 auto 40px',
                    }}>
                        Create stunning invoices, manage your inventory, track customers,
                        and get detailed sales reports — all from one beautiful dashboard.
                    </p>

                    <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => navigate('/SignUp')} style={{
                            padding: '15px 34px', fontSize: '16px', fontWeight: 700,
                            color: 'white', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            border: 'none', borderRadius: '14px', cursor: 'pointer',
                            boxShadow: '0 8px 24px rgba(79,70,229,0.4)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(79,70,229,0.5)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(79,70,229,0.4)'; }}
                        >
                            Start for Free
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M3 9h12M9 3l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button onClick={() => navigate('/login')} style={{
                            padding: '15px 34px', fontSize: '16px', fontWeight: 600,
                            color: '#4f46e5', background: 'white',
                            border: '2px solid #c7d2fe', borderRadius: '14px', cursor: 'pointer',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,70,229,0.15)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.boxShadow = 'none'; }}
                        >Log In →</button>
                    </div>
                </div>

                {/* Hero visual — mock invoice */}
                <div style={{
                    marginTop: '72px', maxWidth: '860px', width: '100%', position: 'relative', zIndex: 1,
                    opacity: heroVisible ? 1 : 0,
                    transform: heroVisible ? 'translateY(0)' : 'translateY(60px)',
                    transition: 'opacity 1s ease 0.3s, transform 1s ease 0.3s',
                }}>
                    <div style={{
                        background: 'white', borderRadius: '20px', overflow: 'hidden',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
                    }}>
                        {/* Browser chrome */}
                        <div style={{ background: '#f1f5f9', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f87171' }} />
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fbbf24' }} />
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#34d399' }} />
                            <div style={{ flex: 1, margin: '0 16px', background: '#e2e8f0', borderRadius: '6px', height: '24px', display: 'flex', alignItems: 'center', paddingLeft: '10px' }}>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>invoiceapp.com/dashboard</span>
                            </div>
                        </div>
                        {/* Mock dashboard content */}
                        <div style={{ padding: '32px', background: '#f8fafc', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            {/* Sidebar */}
                            <div style={{ width: '160px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {['Dashboard', 'New Invoice', 'Templates', 'Inventory', 'Customers', 'Reports'].map((item, i) => (
                                    <div key={i} style={{
                                        padding: '9px 14px', borderRadius: '9px', fontSize: '13px', fontWeight: 500,
                                        background: i === 0 ? '#eef2ff' : 'transparent',
                                        color: i === 0 ? '#4f46e5' : '#94a3b8',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                    }}>
                                        <span style={{ fontSize: '15px' }}>
                                            {['🏠', '📄', '🎨', '📦', '👥', '📊'][i]}
                                        </span>
                                        {item}
                                    </div>
                                ))}
                            </div>
                            {/* Main area */}
                            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Stats row */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                    {[
                                        { label: 'Revenue', value: '₹84,200', color: '#4f46e5', bg: '#eef2ff' },
                                        { label: 'Invoices', value: '142', color: '#7c3aed', bg: '#f5f3ff' },
                                        { label: 'Customers', value: '38', color: '#059669', bg: '#ecfdf5' },
                                    ].map((s, i) => (
                                        <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '14px', border: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{s.label}</div>
                                            <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
                                        </div>
                                    ))}
                                </div>
                                {/* Invoice table mock */}
                                <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>Recent Invoices</div>
                                    {[
                                        { name: 'Ravi Sharma', amount: '₹12,400', status: 'Paid' },
                                        { name: 'Meera Textile Co.', amount: '₹8,750', status: 'Pending' },
                                        { name: 'Yash Enterprises', amount: '₹23,100', status: 'Paid' },
                                    ].map((row, i) => (
                                        <div key={i} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 0', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none',
                                        }}>
                                            <span style={{ fontSize: '12px', color: '#475569' }}>{row.name}</span>
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{row.amount}</span>
                                            <span style={{
                                                fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
                                                background: row.status === 'Paid' ? '#ecfdf5' : '#fffbeb',
                                                color: row.status === 'Paid' ? '#059669' : '#d97706',
                                            }}>{row.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────── STATS ─────────────── */}
            <section style={{ background: 'white', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                <div ref={statsRef} style={{
                    maxWidth: '900px', margin: '0 auto', padding: '64px 24px',
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px',
                    opacity: statsVisible ? 1 : 0,
                    transform: statsVisible ? 'translateY(0)' : 'translateY(32px)',
                    transition: 'opacity 0.7s, transform 0.7s',
                }} className="stat-grid">
                    {STATS.map((s, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{
                                fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900,
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                marginBottom: '6px',
                            }}>{s.value}</div>
                            <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─────────────── FEATURES HEADER ─────────────── */}
            <section style={{ padding: '100px 24px 0', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', background: '#eef2ff', borderRadius: '99px', padding: '6px 18px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5', letterSpacing: '0.05em' }}>✦ EVERYTHING YOU NEED</span>
                </div>
                <h2 style={{
                    fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, color: '#0f172a',
                    letterSpacing: '-1.5px', marginBottom: '16px',
                }}>
                    Powerful Features,<br />
                    <span style={{
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>Built for Business</span>
                </h2>
                <p style={{ fontSize: '18px', color: '#64748b', maxWidth: '520px', margin: '0 auto', lineHeight: 1.75 }}>
                    From crafting your first invoice to analysing yearly revenue — we have every workflow covered.
                </p>
            </section>

            {/* ─────────────── FEATURE SECTIONS ─────────────── */}
            {FEATURES.map(f => <FeatureSection key={f.id} feature={f} />)}

            {/* ─────────────── CTA BANNER ─────────────── */}
            <section style={{
                margin: '0 24px 100px',
                borderRadius: '28px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
                padding: '80px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', top: '-60px', left: '-60px', width: '300px', height: '300px',
                    borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-80px', right: '-80px', width: '350px', height: '350px',
                    borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h2 style={{ fontSize: 'clamp(26px, 5vw, 48px)', fontWeight: 900, color: 'white', marginBottom: '16px', letterSpacing: '-1px' }}>
                        Ready to transform<br />your billing?
                    </h2>
                    <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', marginBottom: '36px', maxWidth: '460px', margin: '0 auto 36px' }}>
                        Join hundreds of businesses already using Invoice App to save time and look professional.
                    </p>
                    <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => navigate('/SignUp')} style={{
                            padding: '15px 36px', fontSize: '16px', fontWeight: 800,
                            color: '#4f46e5', background: 'white', border: 'none', borderRadius: '14px',
                            cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }}
                        >
                            Create Free Account →
                        </button>
                        <button onClick={() => navigate('/login')} style={{
                            padding: '15px 36px', fontSize: '16px', fontWeight: 600,
                            color: 'white', background: 'rgba(255,255,255,0.15)',
                            border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '14px',
                            cursor: 'pointer', backdropFilter: 'blur(8px)',
                            transition: 'background 0.2s',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        >Already have an account</button>
                    </div>
                </div>
            </section>

            {/* ─────────────── FOOTER ─────────────── */}
            <footer style={{
                background: '#0f172a', color: '#94a3b8',
                padding: '48px 24px',
            }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                <path d="M4 5h12M4 10h8M4 15h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <span style={{ fontWeight: 700, color: 'white', fontSize: '16px' }}>Invoice App</span>
                    </div>
                    <p style={{ fontSize: '13px' }}>© {new Date().getFullYear()} Invoice App. All rights reserved.</p>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        {['Templates', 'Inventory', 'Reports', 'Login', 'Privacy'].map(item => (
                            <span key={item} style={{ fontSize: '13px', cursor: 'pointer', transition: 'color 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'white'}
                                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                                onClick={() => {
                                    if (item === 'Privacy') navigate('/privacy');
                                    else if (item === 'Login') navigate('/login');
                                    else if (item === 'Templates') document.getElementById('template-builder')?.scrollIntoView({ behavior: 'smooth' });
                                    else if (item === 'Inventory') document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' });
                                    else if (item === 'Reports') document.getElementById('reports')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                            >{item}</span>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
}

export { LandingPage };
