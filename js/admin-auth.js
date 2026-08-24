import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


// ========================================
// ADMIN EMAIL
// ========================================

const ADMIN_EMAIL = "admin@pas.com";


// ========================================
// CHECK ADMIN
// ========================================

function checkAdminUser(user) {

    if (!user) {
        return false;
    }

    const email =
        (user.email || "").toLowerCase();

    return email === ADMIN_EMAIL;
}


// ========================================
// ADMIN AUTH STATE
// ========================================

onAuthStateChanged(
    auth,
    async (user) => {

        console.log(
            "ADMIN AUTH CHECK:",
            user
        );


        // ========================================
        // NOT LOGGED IN
        // ========================================

        if (!user) {

            console.log(
                "No authenticated user. Redirecting..."
            );

            window.location.href =
                "./index.html";

            return;
        }


        // ========================================
        // CHECK ADMIN
        // ========================================

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


        // ========================================
        // ADMIN VERIFIED
        // ========================================

        console.log(
            "ADMIN VERIFIED:",
            user.email
        );


        // Keep admin session flag
        localStorage.setItem(
            "isAdmin",
            "true"
        );

    }
);


// ========================================
// LOGOUT ELEMENTS
// ========================================

const logoutBtn =
    document.getElementById("logoutBtn");

const mobileLogoutBtn =
    document.getElementById("mobileLogoutBtn");


// ========================================
// LOGOUT FUNCTION
// ========================================

async function logoutAdmin() {

    // ========================================
    // CONFIRMATION
    // ========================================

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


    // User clicked Cancel
    if (!result.isConfirmed) {
        return;
    }


    try {

        // ========================================
        // SIGN OUT
        // ========================================

        await signOut(auth);


        // ========================================
        // REMOVE ADMIN SESSION
        // ========================================

        localStorage.removeItem(
            "isAdmin"
        );


        // ========================================
        // SUCCESS MESSAGE
        // ========================================

        await Swal.fire({

            icon: "success",

            title: "Logged Out",

            text:
                "You have been successfully logged out.",

            timer: 1200,

            showConfirmButton: false

        });


        // ========================================
        // REDIRECT
        // ========================================

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