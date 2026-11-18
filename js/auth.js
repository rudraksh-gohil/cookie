
async function sendToCookieBackend(action, data = {}) {
    const payload = { action, ...data };

    if (action !== "login" && typeof getCookieSessionToken === "function") {
        const token = getCookieSessionToken();

        if (token) {
            payload.session_token = token;
        }
    }

    const response = await fetch(API_URL, {
        method: "POST",
        body: new URLSearchParams(payload)
    });

    if (!response.ok) {
        throw new Error("Backend request failed: " + response.status);
    }

    const result = await response.json();

    console.log("Apps Script response:", result);

    return result;
}


// Login using phone number or User ID.
async function loginUser(identifier, password) {
    return sendToCookieBackend("login", {
        identifier,
        password
    });
}


// Request password reset / first-time setup OTP.
async function requestPasswordResetOtp(email) {
    return sendToCookieBackend("requestPasswordResetOtp", {
        email
    });
}


// Verify OTP and save the new password.
async function resetPasswordWithOtp(email, otp, newPassword) {
    return sendToCookieBackend("resetPasswordWithOtp", {
        email,
        otp,
        new_password: newPassword
    });
}


async function testBackendConnection() {
    return sendToCookieBackend("testConnection");
}
