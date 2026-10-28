import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ========================================
// ADMIN EMAIL
// ========================================

const ADMIN_EMAIL = "admin@pas.com";

// ========================================
// ELEMENTS
// ========================================

const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");

const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("loginButton");

const togglePassword = document.getElementById("togglePassword");

const passwordIcon = document.getElementById("passwordIcon");

// ========================================
// FORGOT PASSWORD ELEMENT
// ========================================

const forgotPasswordLink = document.getElementById("forgotPasswordLink");

// ========================================
// KEEP USERS SIGNED IN
// ========================================

async function restoreAuthenticatedSession() {
  try {
    await setPersistence(auth, browserLocalPersistence);

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        return;
      }

      if (user.email && user.email.toLowerCase() === ADMIN_EMAIL) {
        localStorage.setItem("isAdmin", "true");

        window.location.href = "./admin-dashboard.html";

        return;
      }

      localStorage.removeItem("isAdmin");

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          console.warn("Existing account has no user profile.");

          return;
        }

        window.location.href = "./user-dashboard.html";
      } catch (error) {
        console.error("Existing session check error:", error);
      }
    });
  } catch (error) {
    console.error("Unable to restore authentication session:", error);
  }
}

restoreAuthenticatedSession();

// ========================================
// SHOW / HIDE PASSWORD
// ========================================

if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    if (passwordInput.type === "password") {
      passwordInput.type = "text";

      passwordIcon.classList.remove("bi-eye");
      passwordIcon.classList.add("bi-eye-slash");
    } else {
      passwordInput.type = "password";

      passwordIcon.classList.remove("bi-eye-slash");
      passwordIcon.classList.add("bi-eye");
    }
  });
}

// ========================================
// FORGOT PASSWORD
// ========================================

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", async (e) => {
    e.preventDefault();

    const currentEmail = emailInput.value.trim().toLowerCase();

    // ========================================
    // CHECK EMAIL FIELD
    // ========================================

    if (!currentEmail) {
      const result = await Swal.fire({
        icon: "info",
        title: "Forgot your password?",
        text: "Enter your email address first so we can send you a password reset link.",
        input: "email",
        inputPlaceholder: "Enter your email",
        inputValue: "",
        confirmButtonText: "Send Reset Link",
        confirmButtonColor: "#6f4e37",
        showCancelButton: true,
        cancelButtonText: "Cancel",
        inputValidator: (value) => {
          if (!value) {
            return "Please enter your email address.";
          }
        },
      });

      if (!result.isConfirmed) {
        return;
      }

      const email = result.value.trim().toLowerCase();

      try {
        await sendPasswordResetEmail(auth, email);

        await Swal.fire({
          icon: "success",
          title: "Reset Link Sent!",
          text: "Please check your email for the password reset link.",
          confirmButtonColor: "#6f4e37",
        });
      } catch (error) {
        console.error("Password reset error:", error);

        let message =
          "Unable to send the password reset email. Please try again.";

        if (error.code === "auth/user-not-found") {
          message = "No account was found with this email address.";
        } else if (error.code === "auth/invalid-email") {
          message = "Please enter a valid email address.";
        } else if (error.code === "auth/network-request-failed") {
          message = "Network error. Please check your internet connection.";
        } else if (error.code === "auth/too-many-requests") {
          message =
            "Too many requests. Please wait a while before trying again.";
        }

        await Swal.fire({
          icon: "error",
          title: "Reset Failed",
          text: message,
          confirmButtonColor: "#6f4e37",
        });
      }

      return;
    }

    // ========================================
    // EMAIL ALREADY ENTERED
    // ========================================

    const result = await Swal.fire({
      icon: "question",
      title: "Reset Password?",
      html: `
        We'll send a password reset link to:
        <br>
        <strong>${currentEmail}</strong>
      `,
      showCancelButton: true,
      confirmButtonText: "Send Reset Link",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#6f4e37",
    });

    if (!result.isConfirmed) {
      return;
    }

    // ========================================
    // SEND RESET EMAIL
    // ========================================

    try {
      await sendPasswordResetEmail(auth, currentEmail);

      await Swal.fire({
        icon: "success",
        title: "Reset Link Sent!",
        text: "Please check your email and follow the instructions to reset your password.",
        confirmButtonColor: "#6f4e37",
      });
    } catch (error) {
      console.error("Password reset error:", error);

      let message =
        "Unable to send the password reset email. Please try again.";

      if (error.code === "auth/user-not-found") {
        message = "No account was found with this email address.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Network error. Please check your internet connection.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many requests. Please wait a while before trying again.";
      }

      await Swal.fire({
        icon: "error",
        title: "Reset Failed",
        text: message,
        confirmButtonColor: "#6f4e37",
      });
    }
  });
}

// ========================================
// LOGIN
// ========================================

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim().toLowerCase();

  const password = passwordInput.value;

  if (!email || !password) {
    Swal.fire({
      icon: "warning",
      title: "Incomplete Fields",
      text: "Please enter your email and password.",
      confirmButtonColor: "#6f4e37",
    });

    return;
  }

  loginButton.disabled = true;

  loginButton.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2"></span>
        Signing in...
    `;

  try {
    // ========================================
    // FIREBASE LOGIN
    // ========================================

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

    const user = userCredential.user;

    console.log("Logged in UID:", user.uid);
    console.log("Logged in Email:", user.email);

    // ========================================
    // ADMIN LOGIN
    // ========================================

    if (user.email && user.email.toLowerCase() === ADMIN_EMAIL) {
      localStorage.setItem("isAdmin", "true");

      await Swal.fire({
        icon: "success",
        title: "Welcome, Admin!",
        text: "Login successful.",
        timer: 1200,
        showConfirmButton: false,
      });

      window.location.href = "./admin-dashboard.html";

      return;
    }

    // ========================================
    // NORMAL USER LOGIN
    // ========================================

    localStorage.removeItem("isAdmin");

    const userDocRef = doc(db, "users", user.uid);

    const userDoc = await getDoc(userDocRef);

    console.log("USER PROFILE EXISTS:", userDoc.exists());
    console.log("USER PROFILE DATA:", userDoc.exists() ? userDoc.data() : null);

    if (!userDoc.exists()) {
      await Swal.fire({
        icon: "warning",
        title: "Profile Not Found",
        text: "Your account exists, but your user profile could not be found.",
        confirmButtonColor: "#6f4e37",
      });

      await auth.signOut();

      return;
    }

    // ========================================
    // USER SUCCESS
    // ========================================

    await Swal.fire({
      icon: "success",
      title: "Login Successful!",
      text: "Welcome back.",
      timer: 1200,
      showConfirmButton: false,
    });

    window.location.href = "./user-dashboard.html";
  } catch (error) {
    console.error("ERROR CODE:", error.code);
    console.error("ERROR MESSAGE:", error.message);

    console.error("Login error:", error);

    let message = "Unable to login. Please check your email and password.";

    if (error.code === "auth/invalid-credential") {
      message = "Incorrect email or password.";
    } else if (error.code === "auth/user-not-found") {
      message = "No account was found with this email.";
    } else if (error.code === "auth/wrong-password") {
      message = "Incorrect password.";
    } else if (error.code === "auth/too-many-requests") {
      message = "Too many failed login attempts. Please try again later.";
    } else if (error.code === "auth/network-request-failed") {
      message = "Network error. Please check your internet connection.";
    }

    Swal.fire({
      icon: "error",
      title: "Login Failed",
      text: message,
      confirmButtonColor: "#6f4e37",
    });
  } finally {
    loginButton.disabled = false;

    loginButton.innerHTML = `
            <i class="bi bi-box-arrow-in-right me-2"></i>
            Login
        `;
  }
});
