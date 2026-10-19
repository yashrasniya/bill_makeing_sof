import React from 'react';

// Gradient icon tile that sits beside a page title (DESIGN_SYSTEM.md §6, "Icon tile").
export default function PageIcon({ icon: Icon, style }) {
    return (
        <span
            aria-hidden="true"
            style={{
                width: 44, height: 44, flexShrink: 0, borderRadius: 'var(--radius-lg)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--brand-gradient)', color: '#fff',
                boxShadow: '0 4px 14px rgba(79,70,229,0.25)', ...style,
            }}
        >
            <Icon size={20} />
        </span>
    );
}
