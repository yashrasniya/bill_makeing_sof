import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientToken } from "@/axios";
import "./ChooseTemplate.css";

/* Onboarding step 2: pick an invoice template. Shown after the company form.
   The chosen template is cloned into the account as its default; skipping
   keeps the starter template. */
export default function ChooseTemplate() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState(null); // null = loading
    const [selectedId, setSelectedId] = useState(null);
    const [previews, setPreviews] = useState({}); // id -> blob URL | 'error'
    const [loaded, setLoaded] = useState({}); // id -> preview finished painting
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const requested = useRef(new Set());

    useEffect(() => {
        clientToken.get("yaml/onboarding/")
            .then((res) => {
                const list = res.data?.global_templates || [];
                setTemplates(list);
                if (list.length) setSelectedId(list[0].id);
                else navigate("/home", { replace: true });
            })
            .catch(() => navigate("/home", { replace: true }));
    }, [navigate]);

    const selected = templates?.find((t) => t.id === selectedId);

    /* Fetch the preview through axios (not a bare <img src>) so it works
       whatever the auth transport is. The server renders the first page as
       a PNG: an <img> reports a real load event (so the spinner clears
       exactly when the page is visible) and every phone browser can show
       it, unlike a PDF inside an iframe. */
    useEffect(() => {
        if (!selected || requested.current.has(selected.id)) return;
        requested.current.add(selected.id);
        if (!selected.preview_url) {
            setPreviews((p) => ({ ...p, [selected.id]: selected.pdf_template ? { img: selected.pdf_template } : "error" }));
            return;
        }
        clientToken.get(selected.preview_url, { params: { output: "png" }, responseType: "blob" })
            .then((res) => {
                const url = URL.createObjectURL(res.data);
                setPreviews((p) => ({ ...p, [selected.id]: { img: url, blob: true } }));
            })
            .catch(() => {
                setPreviews((p) => ({
                    ...p,
                    [selected.id]: selected.pdf_template ? { img: selected.pdf_template } : "error",
                }));
            });
    }, [selected]);

    useEffect(() => () => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        Object.values(previewsRef.current).forEach((v) => v?.blob && URL.revokeObjectURL(v.img));
    }, []);
    const previewsRef = useRef(previews);
    previewsRef.current = previews;

    const apply = async (thenEdit) => {
        setBusy(true);
        setError(null);
        try {
            const res = await clientToken.post("yaml/onboarding/", { template_id: selectedId });
            navigate(thenEdit ? `/invoice_editor?id=${res.data.id}` : "/home", { replace: true });
        } catch {
            setError("Couldn't apply that template. Please try again, or skip for now.");
            setBusy(false);
        }
    };

    if (templates === null) return <div className="ct-root"><p className="ct-loading">Loading templates…</p></div>;

    const preview = previews[selectedId];
    const markLoaded = () => setLoaded((l) => ({ ...l, [selectedId]: true }));
    const previewLoading = preview === undefined || (preview !== "error" && !loaded[selectedId]);

    return (
        <div className="ct-root">
            <aside className="ct-side">
                <h2 className="ct-title">Choose your invoice template</h2>
                <p className="ct-note">
                    Not sure yet? You can change anything later, or click <strong>Edit</strong> to
                    customise the selected template right away.
                </p>

                <p className="ct-pick">Tap a template to change the preview</p>
                <div className="ct-list" role="radiogroup" aria-label="Invoice template">
                    {templates.map((t) => (
                        <button
                            type="button"
                            key={t.id}
                            role="radio"
                            aria-checked={t.id === selectedId}
                            className={`ct-item ${t.id === selectedId ? "ct-item--selected" : ""}`}
                            onClick={() => setSelectedId(t.id)}
                        >
                            <span className="ct-item__name">{t.template_name}</span>
                            {t.global_category && <span className="ct-item__cat">{t.global_category}</span>}
                        </button>
                    ))}
                </div>

                {error && <p className="ct-error" role="alert">{error}</p>}

                <div className="ct-actions">
                    <button type="button" className="ct-btn ct-btn--primary" disabled={busy} onClick={() => apply(false)}>
                        {busy ? "Applying…" : "Use this template"}
                    </button>
                    <button type="button" className="ct-btn" disabled={busy} onClick={() => apply(true)}>
                        Edit this template
                    </button>
                    <button type="button" className="ct-link" disabled={busy} onClick={() => navigate("/home", { replace: true })}>
                        Skip for now
                    </button>
                </div>
            </aside>

            <main className="ct-stage">
                <h3 className="ct-stage__title">Preview · {selected?.template_name}</h3>
                {previewLoading && (
                    <div className="ct-spinner" role="status" aria-live="polite">
                        <span className="ct-spinner__ring" aria-hidden="true" />
                        <span>Loading preview…</span>
                    </div>
                )}
                {preview === "error" && <p className="ct-loading">No preview available for this template.</p>}
                {preview?.img && <img className="ct-preview" src={preview.img} alt={`${selected.template_name} preview`} onLoad={markLoaded} onError={markLoaded} />}
            </main>
        </div>
    );
}
