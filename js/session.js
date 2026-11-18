const COOKIE_SESSION_KEY = "cookieUser";
const COOKIE_SESSION_TOKEN_KEY = "cookieSessionToken";
const COOKIE_SESSION_EXPIRY_KEY = "cookieSessionExpiry";

const COOKIE_SESSION_DURATION = 10 * 60 * 1000;

const COOKIE_DASHBOARD_MAP = {
    R001: "home1.html",
    R002: "employee-home.html",
    R003: "customer-home.html"
};

function getCookieUser() {
    try {
        const userData = sessionStorage.getItem(COOKIE_SESSION_KEY);
        const expiry = Number(
            sessionStorage.getItem(COOKIE_SESSION_EXPIRY_KEY)
        );

        if (!userData || !expiry || Date.now() >= expiry) {
            clearCookieSession();
            return null;
        }

        const user = JSON.parse(userData);

        if (!user || !COOKIE_DASHBOARD_MAP[user.role_id]) {
            clearCookieSession();
            return null;
        }

        return user;

    } catch (error) {
        clearCookieSession();
        return null;
    }
}

function getCookieSessionToken() {
    if (!getCookieUser()) {
        return "";
    }

    return sessionStorage.getItem(COOKIE_SESSION_TOKEN_KEY) || "";
}

function createCookieSession(user, token) {
    if (!user || !token) {
        throw new Error("A valid user and session token are required.");
    }

    sessionStorage.setItem(
        COOKIE_SESSION_KEY,
        JSON.stringify(user)
    );

    sessionStorage.setItem(
        COOKIE_SESSION_TOKEN_KEY,
        token
    );

    sessionStorage.setItem(
        COOKIE_SESSION_EXPIRY_KEY,
        String(Date.now() + COOKIE_SESSION_DURATION)
    );
}

function clearCookieSession() {
    sessionStorage.removeItem(COOKIE_SESSION_KEY);
    sessionStorage.removeItem(COOKIE_SESSION_TOKEN_KEY);
    sessionStorage.removeItem(COOKIE_SESSION_EXPIRY_KEY);
}

function requireRole(requiredRole) {
    const user = getCookieUser();

    if (!user) {
        window.location.replace("Login.html");
        return false;
    }

    if (user.role_id !== requiredRole) {
        const correctDashboard = COOKIE_DASHBOARD_MAP[user.role_id];

        if (correctDashboard) {
            window.location.replace(correctDashboard);
        } else {
            logoutUser();
        }

        return false;
    }

    if (!getCookieSessionToken()) {
        clearCookieSession();
        window.location.replace("Login.html");
        return false;
    }

    return true;
}

async function logoutUser(event) {
    if (event) {
        event.preventDefault();
    }

    try {
        if (
            getCookieSessionToken() &&
            typeof sendToCookieBackend === "function"
        ) {
            await sendToCookieBackend("logout");
        }
    } catch (error) {
        console.warn("Server logout could not be completed:", error);
    } finally {
        clearCookieSession();
        window.location.replace("Login.html");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser);
    }
});

window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        const pageRole = document.body.dataset.requiredRole;

        if (pageRole) {
            requireRole(pageRole);
        }
    }
});