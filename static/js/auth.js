// ======================================
// AUTH.JS
// FocusGrid
// ======================================

// ------------------------------
// LOGIN
// ------------------------------

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function(e){

        e.preventDefault();

        const formData = new FormData(loginForm);

        try{

            const response = await fetch("/login",{

                method:"POST",
                body:formData

            });

            if(response.redirected){

                window.location.href = response.url;
                return;

            }

            alert("Invalid email or password.");

        }

        catch(err){

            console.error(err);

            alert("Unable to login.");

        }

    });

}



// ------------------------------
// REGISTER
// ------------------------------

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const submitBtn = registerForm.querySelector("button[type='submit']");
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';
        submitBtn.disabled = true;

        const formData = new FormData(registerForm);

        try {

            const response = await fetch("/register", {
                method: "POST",
                body: formData
            });

            let data;
            try {
                data = await response.json();
            } catch {
                data = { success: false, message: "Unexpected server response." };
            }

            if (data.success) {

                showToast
                    ? showToast("Registration Successful! Redirecting to login...", "success")
                    : alert("Registration Successful!");

                setTimeout(() => {
                    window.location.href = "/login";
                }, 1200);

            } else {

                showToast
                    ? showToast(data.message || "Registration Failed.", "error")
                    : alert(data.message || "Registration Failed.");

                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;

            }

        } catch (err) {

            console.error(err);
            showToast
                ? showToast("Network error. Please try again.", "error")
                : alert("Unable to register. Please check your connection.");

            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

        }

    });

}



// ------------------------------
// LOGOUT
// ------------------------------

const logoutBtn =
document.getElementById("logoutBtn");

if(logoutBtn){

    logoutBtn.addEventListener("click", async ()=>{

        await fetch("/logout");

        window.location.href="/login";

    });

}