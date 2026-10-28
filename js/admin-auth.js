import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


const ADMIN_EMAIL = "admin@pas.com";


function checkAdminUser(user) {

    if (!user) {
        return false;
    }
    const email =
        (user.email || "").toLowerCase();
    return email === ADMIN_EMAIL;
}


onAuthStateChanged(
    auth,
    async (user) => {

        console.log(
            "ADMIN AUTH CHECK:",
            user
        );



        if (!user) {

            console.log(
                "No authenticated user. Redirecting..."
            );
            window.location.href =
                "./index.html";
            return;
        }


        if (!checkAdminUser(user)) {

            console.log(
                "Authenticated user is NOT admin:",
                user.email
            );
            await signOut(auth);
            localStorage.removeItem(
                "isAdmin"
            );
            window.location.href =
                "./index.html";
            return;
        }

        console.log(
            "ADMIN VERIFIED:",
            user.email
        );

        localStorage.setItem(
            "isAdmin",
            "true"
        );

    }
);


const logoutBtn =
    document.getElementById("logoutBtn");

const mobileLogoutBtn =
    document.getElementById("mobileLogoutBtn");
async function logoutAdmin() {

    const result = await Swal.fire({
        icon: "question",
        title: "Logout?",
        text: "Are you sure you want to logout?",
        showCancelButton: true,
        confirmButtonColor: "#6f4e37",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, Logout",
        cancelButtonText: "Cancel"
    });
    if (!result.isConfirmed) {
        return;
    }

    try {

        await signOut(auth);

        localStorage.removeItem(
            "isAdmin"
        );

        await Swal.fire({
            icon: "success",
            title: "Logged Out",
            text:
                "You have been successfully logged out.",
            timer: 1200,
            showConfirmButton: false
        });

        window.location.href =
            "./index.html";

    } catch (error) {
        console.error(
            "Admin logout error:",
            error
        );

        Swal.fire({
            icon: "error",
            title: "Logout Failed",
            text:
                "Something went wrong while logging out.",
            confirmButtonColor:
                "#6f4e37"
        });

    }

}


// ========================================
// DESKTOP LOGOUT
// ========================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            logoutAdmin();

        }
    );

}


// ========================================
// MOBILE LOGOUT
// ========================================

if (mobileLogoutBtn) {

    mobileLogoutBtn.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            logoutAdmin();

        }
    );

}