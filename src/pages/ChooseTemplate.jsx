import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientToken } from "@/axios";
import "./ChooseTemplate.css";

const THUMB_CONCURRENCY = 2;

/* Onboarding step 2: pick an invoice template. Shown after the company form.
   The chosen template is cloned into the account as its default; skipping
   keeps the starter template. */
export default function ChooseTemplate() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState(null); // null = loading
    const [selectedId, setSelectedId] = useState(null);
    const [previews, setPreviews] = useState({}); // id -> { img, blob? } | 'error'
    const [loaded, setLoaded] = useState({}); // id -> big preview finished painting
    const [zoom, setZoom] = useState(false); // false = fit page, true = 100%
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const requested = useRef(new Map()); // id -> in-flight/finished promise
    const previewsRef = useRef(previews);
    previewsRef.current = previews;
    const itemRefs = useRef({});

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

    /* Fetch a preview through axios (not a bare <img src>) so it works
       whatever the auth transport is. The server renders the first page as
       a PNG: an <img> reports a real load event (so the spinner clears
       exactly when the page is visible) and every phone browser can show
       it, unlike a PDF inside an iframe. One fetch per template feeds both
       the list thumbnail and the big preview. */
    const loadPreview = useCallback((t) => {
        if (requested.current.has(t.id)) return requested.current.get(t.id);
        const fallback = t.pdf_template ? { img: t.pdf_template } : "error";
        const store = (v) => setPreviews((p) => ({ ...p, [t.id]: v }));
        const job = !t.preview_url
            ? Promise.resolve(store(fallback))
            : clientToken.get(t.preview_url, { params: { output: "png" }, responseType: "blob" })
                .then((res) => store({ img: URL.createObjectURL(res.data), blob: true }))
                .catch(() => store(fallback));
        requested.current.set(t.id, job);
        return job;
    }, []);

    // The selected template always jumps the queue.
    useEffect(() => {
        if (selected) loadPreview(selected);
    }, [selected, loadPreview]);

    // Then fill in the remaining thumbnails, a couple at a time.
    useEffect(() => {
        if (!templates?.length) return;
        let cancelled = false;
        const queue = [...templates];
        const worker = async () => {
            while (!cancelled && queue.length) {
                await loadPreview(queue.shift());
            }
        };
        for (let i = 0; i < THUMB_CONCURRENCY; i++) worker();
        return () => { cancelled = true; };
    }, [templates, loadPreview]);

    useEffect(() => () => {
        Object.values(previewsRef.current).forEach((v) => v?.blob && URL.revokeObjectURL(v.img));
    }, []);

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

    // Radiogroup keyboard behaviour: arrows move the selection and focus.
    const onListKey = (e) => {
        const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Home: "first", End: "last" };
        const step = keys[e.key];
        if (step === undefined || !templates?.length) return;
        e.preventDefault();
        const idx = templates.findIndex((t) => t.id === selectedId);
        const n = templates.length;
        const next = step === "first" ? 0 : step === "last" ? n - 1 : (idx + step + n) % n;
        const id = templates[next].id;
        setSelectedId(id);
        itemRefs.current[id]?.focus();
    };

    if (templates === null) return <LoadingSkeleton />;

    const preview = previews[selectedId];
    const markLoaded = () => setLoaded((l) => ({ ...l, [selectedId]: true }));
    const previewLoading = preview === undefined || (preview !== "error" && !loaded[selectedId]);

    return (
        <div className="ct-root">
            <aside className="ct-side">
                <header className="ct-head">
                    <span className="ct-step">Step 2 of 2</span>
                    <h2 className="ct-title">Choose your invoice template</h2>
                    <p className="ct-note">
                        Not sure yet? You can change anything later, or click <strong>Edit</strong> to
                        customise the selected template right away.
                    </p>
                </header>

                <p className="ct-pick">Tap a template to change the preview</p>
                <div className="ct-list" role="radiogroup" aria-label="Invoice template" onKeyDown={onListKey}>
                    {templates.map((t) => {
                        const isSel = t.id === selectedId;
                        const thumb = previews[t.id];
                        return (
                            <button
                                type="button"
                                key={t.id}
                                ref={(el) => { itemRefs.current[t.id] = el; }}
                                role="radio"
                                aria-checked={isSel}
                                tabIndex={isSel ? 0 : -1}
                                className={`ct-item ${isSel ? "ct-item--selected" : ""}`}
                                onClick={() => setSelectedId(t.id)}
                            >
                                <span className="ct-thumb" aria-hidden="true">
                                    {thumb === undefined && <span className="ct-skel ct-thumb__skel" />}
                                    {thumb === "error" && <DocIcon />}
                                    {thumb?.img && <img src={thumb.img} alt="" loading="lazy" />}
                                </span>
                                <span className="ct-item__text">
                                    <span className="ct-item__name">{t.template_name}</span>
                                    {t.global_category && <span className="ct-badge">{t.global_category}</span>}
                                </span>
                                {isSel && <span className="ct-check" aria-hidden="true">✓</span>}
                            </button>
                        );
                    })}
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
                <div className="ct-toolbar">
                    <h3 className="ct-stage__title">
                        <span className="ct-stage__label">Preview</span>
                        <span className="ct-stage__name">{selected?.template_name}</span>
                        {selected?.global_category && <span className="ct-badge">{selected.global_category}</span>}
                    </h3>
                    <div className="ct-zoom" role="group" aria-label="Preview size">
                        <button type="button" aria-pressed={!zoom} onClick={() => setZoom(false)}>Fit</button>
                        <button type="button" aria-pressed={zoom} onClick={() => setZoom(true)}>100%</button>
                    </div>
                </div>

                <div className={`ct-canvas ${zoom ? "ct-canvas--zoom" : ""}`}>
                    <div className="ct-paper">
                        {previewLoading && (
                            <div className="ct-spinner" role="status" aria-live="polite">
                                <span className="ct-spinner__ring" aria-hidden="true" />
                                <span>Loading preview…</span>
                            </div>
                        )}
                        {preview === "error" && (
                            <div className="ct-empty"><DocIcon /><span>No preview available for this template.</span></div>
                        )}
                        {preview?.img && (
                            <img
                                key={selectedId}
                                className="ct-preview"
                                src={preview.img}
                                alt={`${selected.template_name} preview`}
                                onLoad={markLoaded}
                                onError={markLoaded}
                            />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function DocIcon() {
    return (
        <svg className="ct-docicon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
    );
}

function LoadingSkeleton() {
    return (
        <div className="ct-root" aria-busy="true">
            <aside className="ct-side">
                <header className="ct-head">
                    <span className="ct-skel" style={{ width: 80, height: 12 }} />
                    <span className="ct-skel" style={{ width: "85%", height: 26 }} />
                    <span className="ct-skel" style={{ width: "100%", height: 64 }} />
                </header>
                <div className="ct-list">
                    {[0, 1, 2, 3].map((i) => <span key={i} className="ct-skel" style={{ height: 76, borderRadius: 12 }} />)}
                </div>
            </aside>
            <main className="ct-stage">
                <div className="ct-canvas">
                    <div className="ct-paper ct-skel" />
                </div>
            </main>
            <span className="ct-sr">Loading templates…</span>
        </div>
    );
}
