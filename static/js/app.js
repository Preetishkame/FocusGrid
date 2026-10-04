// =========================================
// app.js
// FocusGrid
// =========================================


// -----------------------------
// THEME MANAGEMENT
// -----------------------------

const themeToggle = document.getElementById("themeToggle");

const focusGridTaglines = [
    "Grid Your Goals, Master Your Time.",
    "Intelligent Academic Flow.",
    "Precision Planning for Smart Learners."
];
const focusGridTagline = document.getElementById("focusgrid-tagline");
if (focusGridTagline) {
    let focusGridTaglineIndex = 0;
    window.setInterval(() => {
        focusGridTaglineIndex = (focusGridTaglineIndex + 1) % focusGridTaglines.length;
        focusGridTagline.textContent = focusGridTaglines[focusGridTaglineIndex];
    }, 4500);
}

function loadTheme(){

    const savedTheme = localStorage.getItem("theme");

    if(savedTheme === "dark"){

        document.documentElement.setAttribute(
            "data-theme",
            "dark"
        );

        if(themeToggle){

            themeToggle.innerHTML =
            '<i class="fa-solid fa-sun"></i>';

        }

    }

}

loadTheme();


if(themeToggle){

    themeToggle.addEventListener("click",()=>{

        const dark =
        document.documentElement.getAttribute("data-theme");

        if(dark === "dark"){

            document.documentElement.removeAttribute("data-theme");

            localStorage.setItem(
                "theme",
                "light"
            );

            themeToggle.innerHTML =
            '<i class="fa-solid fa-moon"></i>';

        }

        else{

            document.documentElement.setAttribute(
                "data-theme",
                "dark"
            );

            localStorage.setItem(
                "theme",
                "dark"
            );

            themeToggle.innerHTML =
            '<i class="fa-solid fa-sun"></i>';

        }

    });

}



// -----------------------------
// TOAST
// -----------------------------

function showToast(message,type="success"){

    const container =
    document.getElementById("toastContainer");

    if(!container) return;

    const toast =
    document.createElement("div");

    toast.className =
    "toast " + type;

    toast.innerHTML = message;

    container.appendChild(toast);

    setTimeout(()=>{

        toast.remove();

    },3000);

}



// -----------------------------
// FORM TOGGLE
// -----------------------------

function toggleForm(id){

    const form =
    document.getElementById(id);

    if(!form) return;

    if(form.style.display==="none" || form.style.display===""){

        form.style.display="block";

    }

    else{

        form.style.display="none";

    }

}



// -----------------------------
// LOADING SCREEN
// -----------------------------

function showLoading(){

    const loading =
    document.getElementById("loadingScreen");

    if(loading){

        loading.style.display="flex";

    }

}


function hideLoading(){

    const loading =
    document.getElementById("loadingScreen");

    if(loading){

        loading.style.display="none";

    }

}



// -----------------------------
// CONFIRM DELETE
// -----------------------------

function confirmDelete(text="Delete this item?"){

    return confirm(text);

}



// -----------------------------
// DATE
// -----------------------------

const todayDate =
document.getElementById("today-date");

if(todayDate){

    todayDate.innerHTML =
    new Date().toDateString();

}
