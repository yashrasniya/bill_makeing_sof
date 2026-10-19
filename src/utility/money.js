// Rupee formatting shared by the list pages. Indian digit grouping (lakh, crore).

const full = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export const money = (v) => full.format(Number(v) || 0);

// "₹5.28 L" / "₹70.4 Cr" for tight spaces; below a lakh the exact figure fits anyway.
export const moneyShort = (v) => {
    const n = Number(v) || 0;
    const a = Math.abs(n);
    if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (a >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    return money(n);
};

// "22 Aug 2026" from an ISO date string, built from its parts so the day can't
// shift with the viewer's time zone.
export const day = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return '—';
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
