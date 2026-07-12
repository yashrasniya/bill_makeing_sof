import axios from "axios";

axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName = "csrftoken";
axios.defaults.xsrfHeaderName = "x-csrftoken";

export const clientToken = axios.create({
    baseURL: import.meta.env.VITE_APP_URL,
    headers: { "Content-Type": "application/json" },
});

/* ------------------------------------------------------------------ *
 * Global error toast: any 403 (permission denied / upgrade required)  *
 * is surfaced to the user instead of dying silently in the console.   *
 * ------------------------------------------------------------------ */

function showErrorToast(message, isUpgrade) {
    let container = document.getElementById("global-error-toasts");
    if (!container) {
        container = document.createElement("div");
        container.id = "global-error-toasts";
        Object.assign(container.style, {
            position: "fixed", top: "16px", right: "16px", zIndex: "99999",
            display: "flex", flexDirection: "column", gap: "8px",
        });
        document.body.appendChild(container);
    }
    // avoid stacking identical messages
    if ([...container.children].some((c) => c.dataset.msg === message)) return;

    const toast = document.createElement("div");
    toast.dataset.msg = message;
    Object.assign(toast.style, {
        maxWidth: "360px", padding: "12px 16px", borderRadius: "10px",
        fontSize: "13px", fontWeight: "500", lineHeight: "1.4",
        fontFamily: "Inter, sans-serif", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
        background: isUpgrade ? "#fffbeb" : "#fef2f2",
        color: isUpgrade ? "#92400e" : "#991b1b",
        border: `1px solid ${isUpgrade ? "#fde68a" : "#fecaca"}`,
        cursor: "pointer",
    });
    toast.textContent = message;
    toast.onclick = () => toast.remove();
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
}

async function parseErrorBody(response) {
    let data = response?.data;
    if (data instanceof Blob) {           // blob downloads (exports, PDFs)
        try { data = JSON.parse(await data.text()); } catch { data = null; }
    }
    return data || {};
}

clientToken.interceptors.response.use(
    (response) => response,
    async (error) => {
        const response = error.response;
        // opt-out for optional background requests:
        // clientToken.get(url, { suppressErrorToast: true })
        if (error.config?.suppressErrorToast) return Promise.reject(error);
        if (response && response.status === 403) {
            const data = await parseErrorBody(response);
            const isUpgrade = data.code === "upgrade_required";
            const detail = typeof data.detail === "string" ? data.detail : "";
            showErrorToast(
                isUpgrade
                    ? (detail || "This feature is not included in your plan. Upgrade to use it.")
                    : (detail || "You don't have permission to perform this action."),
                isUpgrade
            );
        }
        return Promise.reject(error);
    }
);
