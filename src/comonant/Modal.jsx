import { useEffect } from "react";
import PageIcon from "./PageIcon";

// The popup shared by the inventory forms: backdrop, gradient icon tile, title,
// close button, scrolling body and a right-aligned footer (DESIGN_SYSTEM.md, "Modal").
export default function Modal({ icon, title, subtitle, onClose, children, footer, width = 580 }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 9999, padding: 16,
                background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div role="dialog" aria-modal="true" aria-label={title} style={{
                background: "white", borderRadius: 22, padding: "28px 28px 24px", width: `min(${width}px, 100%)`,
                boxShadow: "0 24px 64px rgba(0,0,0,0.2)", position: "relative", maxHeight: "90vh", overflowY: "auto",
            }}>
                <button type="button" onClick={onClose} aria-label="Close" style={{
                    position: "absolute", top: 14, right: 14, background: "#f1f5f9", border: "none", borderRadius: 8,
                    width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b",
                }}>✕</button>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                    {icon && <PageIcon icon={icon} style={{ width: 38, height: 38 }} />}
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{title}</h2>
                        {subtitle && <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>{subtitle}</p>}
                    </div>
                </div>
                {children}
                {footer && <div className="pop-up-box_buttons">{footer}</div>}
            </div>
        </div>
    );
}
