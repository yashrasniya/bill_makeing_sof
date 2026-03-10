import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientToken } from "@/axios";
import { fetchUser } from "@/store/userSlice";
import { useDispatch } from "react-redux";

/* ── shared input style helpers ── */
const baseInput = {
  width: '100%', padding: '11px 14px', fontSize: '14px',
  border: '1.5px solid #e2e8f0', borderRadius: '10px',
  outline: 'none', color: '#0f172a', background: '#f8fafc',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box', fontFamily: 'inherit',
};
const focusInput = (e) => {
  e.target.style.borderColor = '#4f46e5';
  e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.15)';
  e.target.style.background = 'white';
};
const blurInput = (e) => {
  e.target.style.borderColor = '#e2e8f0';
  e.target.style.boxShadow = 'none';
  e.target.style.background = '#f8fafc';
};
const errorInput = { ...baseInput, borderColor: '#fca5a5' };

/* individual field renderer */
const Field = ({ label, name, type = 'text', placeholder = '', value, errorMsg, onChange, showPass, onTogglePass }) => {
  const hasError = errorMsg;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', letterSpacing: '0.02em' }}>
        {label}
      </label>
      {name === 'password' ? (
        <div style={{ position: 'relative' }}>
          <input
            type={showPass ? 'text' : 'password'}
            name={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder || label}
            onFocus={focusInput}
            onBlur={blurInput}
            style={{ ...(hasError ? errorInput : baseInput), paddingRight: '42px' }}
          />
          <button onClick={onTogglePass} type="button" style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px',
          }}>
            {showPass ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" />
                <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      ) : (
        <input
          type={type} name={name}
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder || label}
          onFocus={focusInput}
          onBlur={blurInput}
          style={hasError ? errorInput : baseInput}
        />
      )}
      {hasError && (
        <span style={{ fontSize: '11px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="11" height="11" viewBox="0 0 20 20" fill="#dc2626">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-9V7a1 1 0 10-2 0v2a1 1 0 102 0zm0 4a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
          </svg>
          {Array.isArray(hasError) ? hasError[0] : hasError}
        </span>
      )}
    </div>
  );
};

function SignUp() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showPass, setShowPass] = useState(false);

  const [user_details, set_user_details] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    mobile_number: '',
    password: '',
    company: {
      name: '', legal_name: '', email: '', phone_number: '',
      website: '', address: '', city: '', district: '',
      state: '', state_code: '', pincode: '', gst_number: '',
      pan_number: '', bank_name: '', account_number: '',
      ifsc_code: '', branch: '', incorporation_date: '',
      business_type: 'sole_prop',
    }
  });

  const [error, setError] = useState({});
  const [loading, setLoading] = useState(false);

  const handelChange = (e) => {
    set_user_details({ ...user_details, [e.target.name]: e.target.value });
    setError({ ...error, [e.target.name]: '' });
  };

  const handelSignUp = async () => {
    setLoading(true);
    setError({});
    try {
      const response = await clientToken.post("register/", user_details);
      if (response.status === 201) {
        // Await so Redux auth state is populated BEFORE navigating.
        // A brand-new account always needs company verification first.
        await dispatch(fetchUser());
        navigate("/CompanyForm", { replace: true });
      }
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data);
      } else {
        setError({ message: "Something went wrong. Try again!" });
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ─────── LEFT PANEL ─────── */}
      <div style={{
        flex: '0 0 40%', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #312e81 0%, #4f46e5 45%, #7c3aed 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
      }}>
        {/* decorative orbs */}
        <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-120px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '55%', right: '-50px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{
          width: '60px', height: '60px', borderRadius: '16px',
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <path d="M6 8h20M6 16h14M6 24h9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        <h2 style={{ fontSize: '28px', fontWeight: 900, color: 'white', letterSpacing: '-0.8px', textAlign: 'center', marginBottom: '10px' }}>
          Invoice App
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.7, maxWidth: '280px', marginBottom: '36px' }}>
          Join hundreds of businesses managing their billing smarter.
        </p>

        {/* Steps */}
        {[
          { num: '1', title: 'Create your account', desc: 'Fill in your basic details' },
          { num: '2', title: 'Set up your company', desc: 'Add your business info' },
          { num: '3', title: 'Start invoicing', desc: 'Send your first bill instantly' },
        ].map((step, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: '14px',
            background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '14px', padding: '14px 18px',
            marginBottom: '10px', width: '100%', maxWidth: '300px',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 800, color: 'white',
            }}>{step.num}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '2px' }}>{step.title}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─────── RIGHT PANEL (scrollable) ─────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        background: '#f8fafc', padding: '32px 24px',
        overflowY: 'auto', position: 'relative',
      }}>
        {/* subtle orbs */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: '24px',
          padding: '36px 38px', width: '100%', maxWidth: '500px',
          boxShadow: '0 16px 56px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
          position: 'relative', zIndex: 1, marginTop: '8px',
        }}>
          {/* Card header */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '9px',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(79,70,229,0.3)',
              }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M4 5h12M4 10h8M4 15h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 800, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Invoice App
              </span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.6px', marginBottom: '4px' }}>
              Create your account
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>Get started for free — no credit card required</p>
          </div>

          {/* Global error */}
          {error?.message && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
              padding: '10px 14px', fontSize: '13px', color: '#dc2626', fontWeight: 500,
              marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-9V7a1 1 0 10-2 0v2a1 1 0 102 0zm0 4a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
              </svg>
              {error.message}
            </div>
          )}

          {/* ── Section: Account Info ── */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '4px', height: '16px', background: 'linear-gradient(180deg,#4f46e5,#7c3aed)', borderRadius: '4px' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Account Details</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="First Name" name="first_name" placeholder="John" value={user_details.first_name} errorMsg={error?.first_name} onChange={handelChange} />
              <Field label="Last Name" name="last_name" placeholder="Doe" value={user_details.last_name} errorMsg={error?.last_name} onChange={handelChange} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <Field label="Username" name="username" placeholder="johndoe" value={user_details.username} errorMsg={error?.username} onChange={handelChange} />
            <Field label="Mobile Number" name="mobile_number" type="tel" placeholder="9876543210" value={user_details.mobile_number} errorMsg={error?.mobile_number} onChange={handelChange} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <Field label="Email Address" name="email" type="email" placeholder="john@example.com" value={user_details.email} errorMsg={error?.email} onChange={handelChange} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <Field label="Password" name="password" type="password" placeholder="Min. 8 characters" value={user_details.password} errorMsg={error?.password} onChange={handelChange} showPass={showPass} onTogglePass={() => setShowPass(!showPass)} />
          </div>

          {/* Terms note */}
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.6 }}>
            By creating an account, you agree to our{' '}
            <span style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }}>Terms of Service</span>
            {' '}and{' '}
            <span style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }}>Privacy Policy</span>.
          </p>

          {/* Submit button */}
          <button
            onClick={handelSignUp}
            disabled={loading}
            style={{
              width: '100%', padding: '13px', fontSize: '15px', fontWeight: 700,
              color: 'white',
              background: loading
                ? 'linear-gradient(135deg, #818cf8, #a78bfa)'
                : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              border: 'none', borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 20px rgba(79,70,229,0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s',
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
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9h12M9 3l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 16px' }}>
            <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }} />
            <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }} />
          </div>

          {/* Login link */}
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#64748b', margin: 0 }}>
            Already have an account?{' '}
            <span
              onClick={() => navigate('/login')}
              style={{ color: '#4f46e5', fontWeight: 700, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
              onMouseLeave={e => e.currentTarget.style.color = '#4f46e5'}
            >
              Sign in →
            </span>
          </p>
        </div>

        {/* Back to home */}
        <button
          onClick={() => navigate('/')}
          style={{
            margin: '16px 0 32px', background: 'none', border: 'none',
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
                        .signup-left { display: none !important; }
                    }
                `}</style>
      </div>
    </div>
  );
}

export default SignUp;
