import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#f8fafc', minHeight: '100vh', overflowX: 'hidden' }}>
            {/* Header */}
            <header style={{
                background: 'white', padding: '0 24px',
                borderBottom: '1px solid #f1f5f9',
            }}>
                <div style={{
                    maxWidth: '1100px', margin: '0 auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    height: '68px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
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
                    <button onClick={() => navigate('/')} style={{
                        fontSize: '14px', fontWeight: 600, color: '#64748b',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        padding: '8px 14px', borderRadius: '8px',
                        transition: 'background 0.2s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >Back to Home</button>
                </div>
            </header>

            {/* Content Container */}
            <main style={{ maxWidth: '800px', margin: '60px auto', padding: '0 24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <div style={{ display: 'inline-block', background: '#eef2ff', borderRadius: '99px', padding: '6px 18px', marginBottom: '20px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5', letterSpacing: '0.05em' }}>LEGAL</span>
                    </div>
                    <h1 style={{ fontSize: 'clamp(32px, 5vw, 42px)', fontWeight: 900, color: '#0f172a', marginBottom: '16px', letterSpacing: '-1px' }}>
                        Privacy Policy
                    </h1>
                    <p style={{ fontSize: '16px', color: '#64748b' }}>
                        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                <div style={{ background: 'white', borderRadius: '24px', padding: '48px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                    <section style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', marginBottom: '16px', letterSpacing: '-0.5px' }}>1. Introduction</h2>
                        <p style={{ fontSize: '16px', color: '#475569', lineHeight: 1.8 }}>
                            Welcome to Invoice App. We respect your privacy and are committed to protecting your personal data.
                            This privacy policy will inform you as to how we look after your personal data when you visit our website
                            and tell you about your privacy rights and how the law protects you.
                        </p>
                    </section>

                    <section style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', marginBottom: '16px', letterSpacing: '-0.5px' }}>2. Data We Collect</h2>
                        <p style={{ fontSize: '16px', color: '#475569', lineHeight: 1.8, marginBottom: '16px' }}>
                            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
                        </p>
                        <ul style={{ paddingLeft: '24px', fontSize: '16px', color: '#475569', lineHeight: 1.8 }}>
                            <li style={{ marginBottom: '8px' }}><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
                            <li style={{ marginBottom: '8px' }}><strong>Contact Data</strong> includes billing address, delivery address, email address and telephone numbers.</li>
                            <li style={{ marginBottom: '8px' }}><strong>Financial Data</strong> includes bank account and payment card details (processed securely by our payment providers).</li>
                            <li style={{ marginBottom: '8px' }}><strong>Transaction Data</strong> includes details about payments to and from you and other details of products and services you have purchased from us.</li>
                            <li style={{ marginBottom: '8px' }}><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location.</li>
                        </ul>
                    </section>

                    <section style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', marginBottom: '16px', letterSpacing: '-0.5px' }}>3. How We Use Your Data</h2>
                        <p style={{ fontSize: '16px', color: '#475569', lineHeight: 1.8, marginBottom: '16px' }}>
                            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                        </p>
                        <ul style={{ paddingLeft: '24px', fontSize: '16px', color: '#475569', lineHeight: 1.8 }}>
                            <li style={{ marginBottom: '8px' }}>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                            <li style={{ marginBottom: '8px' }}>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                            <li style={{ marginBottom: '8px' }}>Where we need to comply with a legal obligation.</li>
                        </ul>
                    </section>

                    <section style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', marginBottom: '16px', letterSpacing: '-0.5px' }}>4. Data Security</h2>
                        <p style={{ fontSize: '16px', color: '#475569', lineHeight: 1.8 }}>
                            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed.
                            In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                        </p>
                    </section>

                    <section style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', marginBottom: '16px', letterSpacing: '-0.5px' }}>5. Your Legal Rights</h2>
                        <p style={{ fontSize: '16px', color: '#475569', lineHeight: 1.8 }}>
                            Under certain circumstances, you have rights under data protection laws in relation to your personal data. This includes the right to request access, correction, erasure, restriction, transfer, to object to processing, to portability of data and (where the lawful ground of processing is consent) to withdraw consent.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', marginBottom: '16px', letterSpacing: '-0.5px' }}>6. Contact Us</h2>
                        <p style={{ fontSize: '16px', color: '#475569', lineHeight: 1.8 }}>
                            If you have questions or comments about this privacy policy, please contact us by email at{' '}
                            <span style={{ color: '#4f46e5', fontWeight: 600 }}>yashrasniya3@gmail.com</span>.
                        </p>
                    </section>
                </div>
            </main>

            {/* Simple Footer */}
            <footer style={{ background: '#0f172a', padding: '32px 24px', textAlign: 'center', marginTop: '64px' }}>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>© {new Date().getFullYear()} Invoice App. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default PrivacyPolicy;
