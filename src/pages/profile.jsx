import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUser, updateUser } from '../store/userSlice';
import userAvatar from '../assets/user.jpg';

/* ── stable style helpers ── */
const inp = {
    width: '100%', padding: '10px 13px', fontSize: '14px',
    border: '1.5px solid #e2e8f0', borderRadius: '10px',
    outline: 'none', color: '#0f172a', background: '#f8fafc',
    fontFamily: "'Inter','Segoe UI',sans-serif", fontWeight: 600,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
};
const focIn = e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; e.target.style.background = 'white'; };
const focOut = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; };

function FormField({ label, id, name, type = 'text', value, onChange }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label htmlFor={id} style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </label>
            <input
                type={type}
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                onFocus={focIn}
                onBlur={focOut}
                style={inp}
            />
        </div>
    );
}

const Profile = () => {
    const dispatch = useDispatch();
    const { userInfo } = useSelector((state) => state.user);

    const [formData, setFormData] = useState({
        username: '', email: '', first_name: '', last_name: '',
        gender: '', mobile_number: '', dob: '',
    });
    const [profileImage, setProfileImage] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null); // { type: 'success' | 'error', msg }

    useEffect(() => {
        if (userInfo) {
            setFormData({
                username: userInfo.username || '',
                email: userInfo.email || '',
                first_name: userInfo.first_name || '',
                last_name: userInfo.last_name || '',
                gender: userInfo.gender || '',
                mobile_number: userInfo.mobile_number || '',
                dob: userInfo.dob || '',
            });
            if (userInfo.profile) setPreviewImage(userInfo.profile);
        }
    }, [userInfo]);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) { setProfileImage(file); setPreviewImage(URL.createObjectURL(file)); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        let payload = { ...formData };
        if (!payload.dob || payload.dob.trim() === '') payload.dob = null;

        if (profileImage) {
            const toBase64 = (f) => new Promise((res, rej) => {
                const r = new FileReader();
                r.readAsDataURL(f);
                r.onload = () => res(r.result);
                r.onerror = rej;
            });
            payload.profile = await toBase64(profileImage);
        }

        dispatch(updateUser(payload))
            .unwrap()
            .then(() => showToast('success', 'Profile updated successfully!'))
            .catch(() => showToast('error', 'Failed to update profile.'))
            .finally(() => setSaving(false));
    };

    if (!userInfo) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid #e0e7ff', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            </div>
        );
    }

    const initials = `${userInfo.first_name?.[0] || ''}${userInfo.last_name?.[0] || ''}`.toUpperCase() || userInfo.username?.[0]?.toUpperCase() || '?';

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
                    background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    color: toast.type === 'success' ? '#166534' : '#dc2626',
                    padding: '12px 18px', borderRadius: '12px', fontWeight: 600, fontSize: '14px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px',
                    animation: 'fadeUp 0.3s ease',
                }}>
                    <span>{toast.type === 'success' ? '✅' : '❌'}</span> {toast.msg}
                </div>
            )}

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 24px 60px' }}>

                {/* Page title */}
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{
                        fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.5px',
                        background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text', margin: 0,
                    }}>My Profile</h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
                        Manage your personal information and account settings
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* ── Avatar card ── */}
                    <div style={{
                        background: 'linear-gradient(135deg,#312e81 0%,#4f46e5 55%,#7c3aed 100%)',
                        borderRadius: '20px', padding: '32px 28px',
                        display: 'flex', alignItems: 'center', gap: '24px',
                        marginBottom: '24px', position: 'relative', overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(79,70,229,0.3)',
                        flexWrap: 'wrap',
                    }}>
                        {/* orb */}
                        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

                        {/* Avatar */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            {previewImage ? (
                                <img src={previewImage} alt="Profile"
                                    style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }} />
                            ) : (
                                <div style={{
                                    width: '96px', height: '96px', borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                                    border: '3px solid rgba(255,255,255,0.35)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '32px', fontWeight: 800, color: 'white',
                                }}>
                                    {initials}
                                </div>
                            )}
                            {/* Camera button */}
                            <label htmlFor="profile-img" style={{
                                position: 'absolute', bottom: '2px', right: '2px',
                                width: '28px', height: '28px', borderRadius: '50%',
                                background: 'white', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                border: '2px solid #f8fafc',
                            }} title="Change photo">
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                                    <path d="M2 16V6a2 2 0 012-2h2l2-2h4l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2z" stroke="#4f46e5" strokeWidth="1.5" />
                                    <circle cx="10" cy="11" r="3" stroke="#4f46e5" strokeWidth="1.5" />
                                </svg>
                            </label>
                            <input type="file" id="profile-img" name="profile" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: '160px' }}>
                            <p style={{ fontSize: '22px', fontWeight: 800, color: 'white', letterSpacing: '-0.3px', margin: '0 0 4px' }}>
                                {userInfo.first_name || userInfo.username || 'User'}
                                {userInfo.last_name ? ` ${userInfo.last_name}` : ''}
                            </p>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', margin: '0 0 12px' }}>
                                @{userInfo.username}  ·  {userInfo.email}
                            </p>
                            <label htmlFor="profile-img" style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                                color: 'white', padding: '7px 16px', borderRadius: '10px',
                                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                transition: 'background 0.15s',
                            }}>
                                📷 Change Photo
                            </label>
                        </div>
                    </div>

                    {/* ── Form card ── */}
                    <div style={{
                        background: 'white', borderRadius: '20px',
                        padding: '28px 28px 24px',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                        marginBottom: '20px',
                    }}>
                        {/* Section label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px' }}>
                            <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg,#4f46e5,#7c3aed)', borderRadius: '4px' }} />
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                Personal Information
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: '18px' }}>
                            <FormField label="First Name" id="first_name" name="first_name" value={formData.first_name} onChange={handleChange} />
                            <FormField label="Last Name" id="last_name" name="last_name" value={formData.last_name} onChange={handleChange} />
                            <FormField label="Username" id="username" name="username" value={formData.username} onChange={handleChange} />
                            <FormField label="Email" id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
                            <FormField label="Mobile Number" id="mobile_number" name="mobile_number" value={formData.mobile_number} onChange={handleChange} />
                            <FormField label="Date of Birth" id="dob" name="dob" type="date" value={formData.dob} onChange={handleChange} />

                            {/* Gender dropdown */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label htmlFor="gender" style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Gender
                                </label>
                                <select
                                    id="gender" name="gender" value={formData.gender} onChange={handleChange}
                                    onFocus={focIn} onBlur={focOut}
                                    style={{ ...inp, cursor: 'pointer' }}
                                >
                                    <option value="">— Select —</option>
                                    <option value="M">Male</option>
                                    <option value="F">Female</option>
                                    <option value="O">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Save button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                padding: '12px 32px', fontSize: '15px', fontWeight: 700,
                                color: 'white', border: 'none', borderRadius: '12px', cursor: saving ? 'not-allowed' : 'pointer',
                                background: saving ? 'linear-gradient(135deg,#a5b4fc,#c4b5fd)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                                boxShadow: '0 6px 20px rgba(79,70,229,0.35)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                display: 'flex', alignItems: 'center', gap: '8px',
                            }}
                            onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(79,70,229,0.45)'; } }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.35)'; }}
                        >
                            {saving ? (
                                <>
                                    <svg style={{ animation: 'spin 0.8s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                                        <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    Save Changes
                                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                                        <path d="M3 9h12M9 3l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default Profile;