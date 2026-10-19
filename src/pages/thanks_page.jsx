import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

const ThanksPage = ({ message }) => {
    // A default message in case the prop is not provided.
    const displayMessage = message || "Your account has been registered successfully. " +
        "We will review it and email you once it is verified.";

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '16px',
            textAlign: 'center',
            background: 'var(--page-bg)',
        }}>
            <div style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--shadow-card)',
                padding: '40px 32px',
                maxWidth: '440px',
                width: '100%',
            }}>
                <div style={{
                    width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--tint-100)', color: 'var(--brand-indigo)',
                }}>
                    <CheckCircle2 size={32} />
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Thank you!</h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '8px 0 24px', lineHeight: 1.6 }}>
                    {displayMessage}
                </p>
                <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>
                    Go to homepage
                </Link>
            </div>
        </div>
    );
};

export default ThanksPage;
