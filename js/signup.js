
document.addEventListener("DOMContentLoaded", () => {

    // Views
    const detailsView = document.getElementById("signupDetailsView");
    const verificationView = document.getElementById("signupVerificationView");
    const successView = document.getElementById("signupSuccessView");

    // Forms
    const detailsForm = document.getElementById("signupDetailsForm");
    const verificationForm = document.getElementById("signupVerificationForm");

    // Details
    const fullName = document.getElementById("fullName");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");
    const address = document.getElementById("address");
    const accountType = document.getElementById("accountType");
    const companyField = document.getElementById("companyField");
    const company = document.getElementById("company");

    // Verification
    const signupOtp = document.getElementById("signupOtp");
    const signupPassword = document.getElementById("signupPassword");
    const signupConfirmPassword =
        document.getElementById("signupConfirmPassword");

    // Buttons
    const requestOtpButton = document.getElementById("requestOtpButton");
    const completeSignupButton =
        document.getElementById("completeSignupButton");
    const resendOtpButton = document.getElementById("resendSignupOtp");

    // Notes
    const detailsNote = document.getElementById("signupDetailsNote");
    const verificationNote =
        document.getElementById("signupVerificationNote");

    let currentEmail = "";

    // =========================
    // VIEW MANAGEMENT
    // =========================

    function showView(view) {
        detailsView.hidden = view !== "details";
        verificationView.hidden = view !== "verification";
        successView.hidden = view !== "success";
    }

    function setButtonLoading(button, loading, normalText, loadingText) {
        button.disabled = loading;
        button.innerHTML = loading ? loadingText : normalText;
    }

    // =========================
    // ACCOUNT TYPE MANAGEMENT
    // =========================

    function updateCompanyVisibility() {

        const isCompanyEmployee =
            accountType.value === "Company Employee";

        companyField.hidden = !isCompanyEmployee;
        company.required = isCompanyEmployee;

        if (!isCompanyEmployee) {
            company.value = "";
        }
    }

    accountType.addEventListener("change", () => {
        updateCompanyVisibility();

        detailsNote.textContent =
            accountType.value === "Company Employee"
                ? "Select the company associated with your account."
                : "Your email will be verified before your account is created.";
    });

    // =========================
    // LOAD COMPANIES
    // =========================

    async function loadCompanies() {

        company.innerHTML =
            '<option value="">Loading companies...</option>';

        company.disabled = true;

        try {

            const response =
                await sendToCookieBackend("getAvailableCompanies");

            if (!response.success) {
                throw new Error(
                    response.message || "Unable to load companies."
                );
            }

            company.innerHTML =
                '<option value="">Select your company</option>';

            if (
                !Array.isArray(response.companies) ||
                response.companies.length === 0
            ) {

                company.innerHTML =
                    '<option value="">No companies available</option>';

                detailsNote.textContent =
                    "No companies are currently available for registration.";

                return;
            }

            response.companies.forEach(item => {

                const option = document.createElement("option");

                option.value = item.company_id;
                option.textContent = item.company_name;

                company.appendChild(option);

            });

            company.disabled = false;

            detailsNote.textContent =
                "Your email will be verified before your account is created.";

        } catch (error) {

            console.error("Company loading error:", error);

            company.innerHTML =
                '<option value="">Unable to load companies</option>';

            detailsNote.textContent =
                "Unable to load companies. Company Employee registration may be unavailable.";

        }

    }

    // =========================
    // REQUEST SIGNUP OTP
    // =========================

    detailsForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        updateCompanyVisibility();

        const selectedAccountType = accountType.value;

        if (
            !["Company Employee", "End Customer"].includes(selectedAccountType)
        ) {
            detailsNote.textContent =
                "Please select your account type.";

            return;
        }

        const signupData = {
            full_name: fullName.value.trim(),
            phone: phone.value.trim(),
            email: email.value.trim().toLowerCase(),
            address: address.value.trim(),
            account_type: selectedAccountType,
            company_id:
                selectedAccountType === "Company Employee"
                    ? company.value
                    : ""
        };

        if (
            selectedAccountType === "Company Employee" &&
            !signupData.company_id
        ) {
            detailsNote.textContent =
                "Please select your company.";

            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) {

            detailsNote.textContent =
                "Please enter a valid email address.";

            return;
        }

        currentEmail = signupData.email;

        setButtonLoading(
            requestOtpButton,
            true,
            'Continue <span>→</span>',
            "Sending verification code..."
        );

        detailsNote.textContent =
            "Please wait while we verify your details...";

        try {

            const response = await sendToCookieBackend(
                "requestCustomerSignupOtp",
                signupData
            );

            if (!response.success) {

                detailsNote.textContent =
                    response.message || "Unable to start registration.";

                return;
            }

            document.getElementById("verificationEmail").textContent =
                currentEmail;

            signupOtp.value = "";
            signupPassword.value = "";
            signupConfirmPassword.value = "";

            verificationNote.textContent =
                "A verification code has been sent to your email. It expires in 10 minutes.";

            showView("verification");

        } catch (error) {

            console.error("Signup OTP error:", error);

            detailsNote.textContent =
                "Unable to connect to the server. Please try again.";

        } finally {

            setButtonLoading(
                requestOtpButton,
                false,
                'Continue <span>→</span>',
                "Sending verification code..."
            );

        }

    });

    // =========================
    // COMPLETE SIGNUP
    // =========================

    verificationForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const otp = signupOtp.value.trim();
        const password = signupPassword.value;
        const confirmation = signupConfirmPassword.value;

        if (!/^\d{6}$/.test(otp)) {

            verificationNote.textContent =
                "Please enter a valid six-digit OTP.";

            return;
        }

        if (password.length < 8) {

            verificationNote.textContent =
                "Password must contain at least 8 characters.";

            return;
        }

        if (password !== confirmation) {

            verificationNote.textContent =
                "The passwords do not match.";

            return;
        }

        setButtonLoading(
            completeSignupButton,
            true,
            'Create account <span>→</span>',
            "Creating account..."
        );

        verificationNote.textContent =
            "Verifying your email and creating your account...";

        try {

            const response = await sendToCookieBackend(
                "completeCustomerSignup",
                {
                    email: currentEmail,
                    otp: otp,
                    password: password
                }
            );

            if (!response.success) {

                verificationNote.textContent =
                    response.message || "Unable to create your account.";

                return;
            }

            showView("success");

        } catch (error) {

            console.error("Signup completion error:", error);

            verificationNote.textContent =
                "Unable to connect to the server. Please try again.";

        } finally {

            setButtonLoading(
                completeSignupButton,
                false,
                'Create account <span>→</span>',
                "Creating account..."
            );

        }

    });

    // =========================
    // RESEND OTP
    // =========================

    resendOtpButton.addEventListener("click", async () => {

        resendOtpButton.disabled = true;

        verificationNote.textContent =
            "Requesting a new verification code...";

        try {

            const selectedAccountType = accountType.value;

            const response = await sendToCookieBackend(
                "requestCustomerSignupOtp",
                {
                    full_name: fullName.value.trim(),
                    phone: phone.value.trim(),
                    email: currentEmail,
                    address: address.value.trim(),
                    account_type: selectedAccountType,
                    company_id:
                        selectedAccountType === "Company Employee"
                            ? company.value
                            : ""
                }
            );

            verificationNote.textContent =
                response.message ||
                (response.success
                    ? "A new verification code has been sent."
                    : "Unable to resend verification code.");

            if (response.success) {
                signupOtp.value = "";
            }

        } catch (error) {

            console.error("Resend OTP error:", error);

            verificationNote.textContent =
                "Unable to resend OTP. Please try again.";

        } finally {

            resendOtpButton.disabled = false;

        }

    });

    // =========================
    // EDIT DETAILS
    // =========================

    document.getElementById("backToDetails")
        .addEventListener("click", () => {

            showView("details");

        });

    // =========================
    // OTP INPUT RESTRICTION
    // =========================

    signupOtp.addEventListener("input", () => {

        signupOtp.value = signupOtp.value
            .replace(/\D/g, "")
            .slice(0, 6);

    });

    // =========================
    // INITIALISE
    // =========================

    showView("details");
    updateCompanyVisibility();
    loadCompanies();

});
