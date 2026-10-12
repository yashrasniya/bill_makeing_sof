import React, { useState, useEffect } from 'react';
import { clientToken } from '../axios.js';
import Navbar from '../comonant/navbar';

const WhatsAppConnect = () => {
    const [status, setStatus] = useState('idle');
    const [connectionData, setConnectionData] = useState({
        code: null,
        waba_id: null,
        phone_number_id: null
    });

    const APP_ID = "434279422908745"; // Extracted from provided HTML
    const CONFIG_ID = "2443261216095215";

    // 1. Load Meta SDK & Add Message Listener
    useEffect(() => {
        // Prepare global AsyncInit
        window.fbAsyncInit = function () {
            window.FB.init({
                appId: APP_ID,
                autoLogAppEvents: true,
                xfbml: true,
                version: "v20.0"
            });
            console.log("Facebook SDK Initialized.");
        };

        // Inject Script tag
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

        // Listener for Message Postbacks
        const handleMessage = (event) => {
            if (!event.origin.includes("facebook.com")) return;

            try {
                const data = JSON.parse(event.data);

                if (data.type === "WA_EMBEDDED_SIGNUP") {
                    if (data.event === "FINISH") {
                        console.log("🎉 Signup Completed!");
                        setConnectionData(prev => ({
                            ...prev,
                            waba_id: data.data.waba_id,
                            phone_number_id: data.data.phone_number_id
                        }));
                    } else if (data.event === "CANCEL") {
                        console.log("⚠️ User cancelled flow");
                        setStatus('cancelled');
                    }
                }
            } catch (e) {
                // Ignore non-JSON events
            }
        };

        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, []);

    // 2. Triggering Login Function
    const launchSignup = () => {
        if (!window.FB) {
            alert("Facebook SDK is not fully loaded yet. Please wait a moment and try again.");
            return;
        }

        setStatus('connecting');

        window.FB.login((response) => {
            if (response.authResponse) {
                const capturedCode = response.authResponse.code;
                console.log("✅ AUTH CODE:", capturedCode);

                setConnectionData(prev => ({
                    ...prev,
                    code: capturedCode
                }));

            } else {
                console.log("❌ User cancelled login");
                setStatus('cancelled');
            }
        }, {
            config_id: CONFIG_ID,
            response_type: "code",
            override_default_response_type: true,
            extras: {
                sessionInfoVersion: 3
            }
        });
    };

    // 3. Process to Backend
    useEffect(() => {
        if (connectionData.code && connectionData.waba_id && connectionData.phone_number_id) {
            setStatus('saving');
            // We have all 3 pieces, let's send to backend
            clientToken.post('/whatsapp/oauth/', connectionData)
                .then(res => {
                    setStatus('success');
                    alert("WhatsApp Integrated successfully!");
                })
                .catch(err => {
                    console.error(err);
                    setStatus('failed');
                    alert("Integration setup failed on the server. Please verify your Meta configurations: " + (err.response?.data?.error || "Unknown"));
                });
        }
    }, [connectionData]);

    // 4. Render UI
    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar />
            <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-10 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">WhatsApp Account Connection</h1>
                <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                    Securely connect your Meta Business Portfolio. Clicking the button below will open a secure window directly into Facebook to configure your WhatsApp permissions seamlessly.
                </p>

                {status === 'success' ? (
                    <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-green-800">
                        <h2 className="text-2xl font-bold mb-2">🎉 Connection Successful!</h2>
                        <p>Your WhatsApp business account has been connected and active on your profile.</p>
                    </div>
                ) : (
                    <button
                        onClick={launchSignup}
                        disabled={status === 'connecting' || status === 'saving'}
                        className="bg-[#1877f2] hover:bg-[#166fe5] text-white px-8 py-3 rounded-lg text-lg font-semibold shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                    >
                        {status === 'connecting' && (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {status === 'saving' ? 'Verifying Link...' : 'Connect WhatsApp'}
                    </button>
                )}

                {status === 'cancelled' && (
                    <p className="text-red-500 mt-4 font-medium">The connection was cancelled. Try again when ready.</p>
                )}
                {status === 'failed' && (
                    <p className="text-red-500 mt-4 font-medium">Server linkage failed. Ensure your App Secret is loaded in your backend variables!</p>
                )}
            </div>
        </div>
    );
};

export default WhatsAppConnect;
