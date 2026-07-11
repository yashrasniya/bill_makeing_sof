import { useEffect, useRef, useState } from 'react';
import { clientToken } from '@/axios';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleLoginButton({ onSuccess, onError }) {
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("Initializing Google Sign-In with Client ID:", CLIENT_ID);
    // GIS script is async — poll until available
    const timer = setInterval(() => {
      if (window.google?.accounts?.id && buttonRef.current) {
        clearInterval(timer);
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredential,
          ux_mode: 'popup',
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  async function handleCredential(googleResponse) {
    setLoading(true);
    try {
      const res = await clientToken.post('google-login/', {
        credential: googleResponse.credential
      });
      if (res.status === 200) {
        onSuccess?.(res.data);
      } else {
        throw new Error(res.data?.error || 'Google sign-in failed');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Google sign-in failed';
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
      <div ref={buttonRef} style={{ minHeight: '40px' }} />
      {loading && <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Signing you in…</p>}
    </div>
  );
}
