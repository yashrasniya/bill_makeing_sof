import React, { useEffect, useState } from 'react';
import { clientToken } from '@/axios';

const APP_ID = "434279422908745";
const CONFIG_ID = "2443261216095215";

/**
 * Meta embedded-signup button: opens the Facebook flow, captures the
 * auth code + WABA/phone ids, and posts them to /whatsapp/oauth/.
 * Calls onConnected() after a successful link.
 */
const WhatsAppConnectButton = ({ onConnected }) => {
    const [status, setStatus] = useState('idle');
    const [connectionData, setConnectionData] = useState({
        code: null, waba_id: null, phone_number_id: null,
    });

    // 1. Load Meta SDK & listen for signup postbacks
    useEffect(() => {
        window.fbAsyncInit = function () {
            window.FB.init({
                appId: APP_ID, autoLogAppEvents: true, xfbml: true, version: "v20.0",
            });
        };
        const scriptId = "facebook-jssdk";
        if (!document.getElementById(scriptId)) {
            const script = document.createElement("script");
            script.id = scriptId;
            script.async = true;
            script.defer = true;
            script.crossOrigin = "anonymous";
            script.src = "https://connect.facebook.net/en_US/sdk.js";
            document.body.appendChild(script);
        }
        const handleMessage = (event) => {
            if (!event.origin.includes("facebook.com")) return;
            try {
                const data = JSON.parse(event.data);
                if (data.type === "WA_EMBEDDED_SIGNUP") {
                    if (data.event === "FINISH") {
                        setConnectionData(prev => ({
                            ...prev,
                            waba_id: data.data.waba_id,
                            phone_number_id: data.data.phone_number_id,
                        }));
                    } else if (data.event === "CANCEL") {
                        setStatus('cancelled');
                    }
                }
            } catch (e) { /* ignore non-JSON events */ }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // 2. Launch the Facebook login flow
    const launchSignup = () => {
        if (!window.FB) {
            alert("Facebook SDK is not fully loaded yet. Please wait a moment and try again.");
            return;
        }
        setStatus('connecting');
        window.FB.login((response) => {
            if (response.authResponse) {
                setConnectionData(prev => ({ ...prev, code: response.authResponse.code }));
            } else {
                setStatus('cancelled');
            }
        }, {
            config_id: CONFIG_ID,
            response_type: "code",
            override_default_response_type: true,
            extras: { sessionInfoVersion: 3 },
        });
    };

    // 3. Exchange with the backend once all pieces arrive
    useEffect(() => {
        if (connectionData.code && connectionData.waba_id && connectionData.phone_number_id) {
            setStatus('saving');
            clientToken.post('/whatsapp/oauth/', connectionData)
                .then(() => {
                    setStatus('success');
                    if (onConnected) onConnected();
                })
                .catch(err => {
                    console.error(err);
                    setStatus('failed');
                    alert("Integration setup failed on the server: " +
                        (err.response?.data?.error || "Unknown"));
                });
        }
    }, [connectionData]);

    if (status === 'success') {
        return (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                🎉 WhatsApp account connected successfully!
            </div>
        );
    }

    return (
        <div>
            <button
                type="button"
                onClick={launchSignup}
                disabled={status === 'connecting' || status === 'saving'}
                className="bg-[#1877f2] hover:bg-[#166fe5] text-white px-6 py-2.5 rounded-lg font-semibold shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
                {(status === 'connecting' || status === 'saving') && (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {status === 'saving' ? 'Verifying Link...' : 'Connect with Facebook'}
            </button>
            {status === 'cancelled' && (
                <p className="text-red-500 mt-2 text-sm font-medium">The connection was cancelled. Try again when ready.</p>
            )}
            {status === 'failed' && (
                <p className="text-red-500 mt-2 text-sm font-medium">Server linkage failed. Check the backend Meta configuration.</p>
            )}
        </div>
    );
};

export default WhatsAppConnectButton;
