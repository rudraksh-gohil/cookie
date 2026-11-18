
document.addEventListener("DOMContentLoaded", () => {

    const dashboardMap = {
        R001: "home1.html",
        R002: "employee-home.html",
        R003: "customer-home.html"
    };

    // Views
    const loginView = document.getElementById("loginView");
    const otpRequestView = document.getElementById("otpRequestView");
    const passwordSetupView = document.getElementById("passwordSetupView");

    // Login elements
    const loginForm = document.getElementById("loginForm");
    const identifierInput = document.getElementById("identifier");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("loginButton");
    const formNote = document.getElementById("formNote");

    // OTP request elements
    const otpRequestForm = document.getElementById("otpRequestForm");
    const recoveryEmail = document.getElementById("recoveryEmail");
    const sendOtpButton = document.getElementById("sendOtpButton");
    const otpRequestNote = document.getElementById("otpRequestNote");

    // Password setup elements
    const passwordSetupForm = document.getElementById("passwordSetupForm");
    const verificationOtp = document.getElementById("verificationOtp");
    const newPassword = document.getElementById("newPassword");
    const confirmPassword = document.getElementById("confirmPassword");
    const resetPasswordButton = document.getElementById("resetPasswordButton");
    const passwordSetupNote = document.getElementById("passwordSetupNote");
    const resendOtpButton = document.getElementById("resendOtpButton");

    let recoveryMode = "forgot";
    let currentEmail = "";

    function showView(view) {
        loginView.hidden = view !== "login";
        otpRequestView.hidden = view !== "request";
        passwordSetupView.hidden = view !== "setup";
    }

    function setButtonLoading(button, loading, normalText, loadingText) {
        button.disabled = loading;
        button.innerHTML = loading ? loadingText : normalText;
    }

    function showRequestView(mode = "forgot") {
        recoveryMode = mode;

        if (mode === "setup") {
            document.getElementById("otpRequestEyebrow").textContent =
                "FIRST-TIME SETUP";

            document.getElementById("otpRequestHeading").textContent =
                "Activate your account";

            document.getElementById("otpRequestDescription").textContent =
                "Enter the email address registered by your administrator to receive your password setup OTP.";
        } else {
            document.getElementById("otpRequestEyebrow").textContent =
                "ACCOUNT RECOVERY";

            document.getElementById("otpRequestHeading").textContent =
                "Forgot password?";

            document.getElementById("otpRequestDescription").textContent =
                "Enter your registered email address. We'll send you a verification code.";
        }

        otpRequestNote.textContent =
            "The verification code will be valid for 10 minutes.";

        showView("request");
    }

    // LOGIN
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const identifier = identifierInput.value.trim();
        const password = passwordInput.value;

        setButtonLoading(
            loginButton,
            true,
            'Sign in <span>→</span>',
            "Validating..."
        );

        formNote.textContent = "Validating credentials...";

        try {
            const response = await loginUser(identifier, password);

            if (!response.success) {

                if (response.must_setup_password) {
                    recoveryEmail.value = "";
                    showRequestView("setup");
                    otpRequestNote.textContent =
                        "Your account requires password setup. Enter your registered email to receive an OTP.";
                    return;
                }

                formNote.textContent = response.message ||
                    "Unable to sign in.";

                return;
            }

            const user = response.user;
            const token = response.session_token;
            const destination = dashboardMap[user.role_id];

            if (!destination || !token) {
                formNote.textContent =
                    "Login response is incomplete. Please try again.";
                return;
            }

            createCookieSession(user, token);

            window.location.replace(destination);

        } catch (error) {
            console.error(error);
            formNote.textContent =
                "Unable to connect to the server. Please try again.";

        } finally {
            setButtonLoading(
                loginButton,
                false,
                'Sign in <span>→</span>',
                "Validating..."
            );
        }
    });


    // FORGOT PASSWORD
    document.getElementById("forgotPasswordButton")
        .addEventListener("click", () => {
            recoveryEmail.value = "";
            showRequestView("forgot");
        });


    // REQUEST OTP
    otpRequestForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = recoveryEmail.value.trim().toLowerCase();

        if (!email) {
            otpRequestNote.textContent =
                "Please enter your registered email address.";
            return;
        }

        setButtonLoading(
            sendOtpButton,
            true,
            'Send verification code <span>→</span>',
            "Sending OTP..."
        );

        otpRequestNote.textContent = "Sending verification code...";

        try {
            const response = await requestPasswordResetOtp(email);

            if (!response.success) {
                otpRequestNote.textContent = response.message;
                return;
            }

            currentEmail = email;

            showView("setup");

            passwordSetupNote.textContent =
                "If the email belongs to an active account, an OTP has been sent. Check your inbox and spam folder.";

            verificationOtp.value = "";
            newPassword.value = "";
            confirmPassword.value = "";

        } catch (error) {
            console.error(error);
            otpRequestNote.textContent =
                "Unable to send OTP. Please try again.";

        } finally {
            setButtonLoading(
                sendOtpButton,
                false,
                'Send verification code <span>→</span>',
                "Sending OTP..."
            );
        }
    });


    // VERIFY OTP AND SET PASSWORD
    passwordSetupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const otp = verificationOtp.value.trim();
        const password = newPassword.value;
        const confirmation = confirmPassword.value;

        if (!/^\d{6}$/.test(otp)) {
            passwordSetupNote.textContent =
                "Please enter a valid six-digit OTP.";
            return;
        }

        if (password.length < 8) {
            passwordSetupNote.textContent =
                "Password must contain at least 8 characters.";
            return;
        }

        if (password !== confirmation) {
            passwordSetupNote.textContent =
                "The passwords do not match.";
            return;
        }

        setButtonLoading(
            resetPasswordButton,
            true,
            'Set password <span>→</span>',
            "Verifying..."
        );

        passwordSetupNote.textContent =
            "Verifying OTP and updating your password...";

        try {
            const response = await resetPasswordWithOtp(
                currentEmail,
                otp,
                password
            );

            if (!response.success) {
                passwordSetupNote.textContent = response.message;
                return;
            }

            passwordSetupForm.reset();

            identifierInput.value = "";
            passwordInput.value = "";

            showView("login");

            formNote.textContent =
                "Password set successfully. You can now sign in.";

        } catch (error) {
            console.error(error);
            passwordSetupNote.textContent =
                "Unable to update your password. Please try again.";

        } finally {
            setButtonLoading(
                resetPasswordButton,
                false,
                'Set password <span>→</span>',
                "Verifying..."
            );
        }
    });


    // RESEND OTP
    resendOtpButton.addEventListener("click", async () => {

        if (!currentEmail) {
            showRequestView(recoveryMode);
            return;
        }

        resendOtpButton.disabled = true;
        passwordSetupNote.textContent = "Requesting a new OTP...";

        try {
            const response = await requestPasswordResetOtp(currentEmail);

            passwordSetupNote.textContent = response.message ||
                "Please check your email for the new OTP.";

            if (response.success) {
                verificationOtp.value = "";
            }

        } catch (error) {
            console.error(error);
            passwordSetupNote.textContent =
                "Unable to resend OTP. Please try again.";

        } finally {
            resendOtpButton.disabled = false;
        }
    });


    // BACK BUTTONS
    document.getElementById("backToLoginFromRequest")
        .addEventListener("click", () => {
            showView("login");
        });

    document.getElementById("backToEmailButton")
        .addEventListener("click", () => {
            showView("request");
        });


    // Restrict OTP input to six digits.
    verificationOtp.addEventListener("input", () => {
        verificationOtp.value =
            verificationOtp.value.replace(/\D/g, "").slice(0, 6);
    });

    showView("login");

});
