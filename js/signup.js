import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const signupForm = document.getElementById("signupForm");

const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const birthdayInput = document.getElementById("birthday");
const ageInput = document.getElementById("age");
const genderInput = document.getElementById("gender");
const phoneInput = document.getElementById("phone");
const ministryInput = document.getElementById("ministry");

const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const signupButton = document.getElementById("signupButton");

// ========================================
// CALCULATE AGE
// ========================================

birthdayInput.addEventListener("change", () => {
  const birthday = new Date(birthdayInput.value);

  if (isNaN(birthday.getTime())) {
    ageInput.value = "";
    return;
  }

  const today = new Date();

  let age = today.getFullYear() - birthday.getFullYear();

  const monthDifference = today.getMonth() - birthday.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthday.getDate())
  ) {
    age--;
  }

  ageInput.value = age;
});

// ========================================
// SHOW / HIDE PASSWORD
// ========================================

const togglePassword = document.getElementById("toggleSignupPassword");

const passwordIcon = document.getElementById("signupPasswordIcon");

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

// ========================================
// SIGN UP
// ========================================

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get values

  const firstName = firstNameInput.value.trim();

  const lastName = lastNameInput.value.trim();

  const email = emailInput.value.trim().toLowerCase();

  const birthday = birthdayInput.value;

  const age = Number(ageInput.value);

  const gender = genderInput.value;

  const phone = phoneInput.value.trim();

  const ministry = ministryInput.value;

  const password = passwordInput.value;

  const confirmPassword = confirmPasswordInput.value;

  // ========================================
  // VALIDATION
  // ========================================

  if (
    !firstName ||
    !lastName ||
    !email ||
    !birthday ||
    !age ||
    !gender ||
    !phone ||
    !ministry ||
    !password ||
    !confirmPassword
  ) {
    Swal.fire({
      icon: "warning",
      title: "Incomplete Information",
      text: "Please complete all required fields.",
      confirmButtonColor: "#6f4e37",
    });

    return;
  }

  if (password.length < 6) {
    Swal.fire({
      icon: "warning",
      title: "Password Too Short",
      text: "Password must be at least 6 characters.",
      confirmButtonColor: "#6f4e37",
    });

    return;
  }

  if (password !== confirmPassword) {
    Swal.fire({
      icon: "error",
      title: "Passwords Don't Match",
      text: "Please make sure both passwords are the same.",
      confirmButtonColor: "#6f4e37",
    });

    return;
  }

  // ========================================
  // DISABLE BUTTON
  // ========================================

  signupButton.disabled = true;

  signupButton.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2"></span>
        Creating Account...
    `;

  let createdUser = null;

  try {
    // ========================================
    // CREATE FIREBASE AUTH ACCOUNT
    // ========================================

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    const user = userCredential.user;
    createdUser = user;

    // ========================================
    // SAVE USER PROFILE TO FIRESTORE
    // ========================================

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,

      firstName: firstName,

      lastName: lastName,

      email: email,

      birthday: birthday,

      age: age,

      gender: gender,

      phone: phone,

      ministry: ministry,

      role: "user",

      createdAt: serverTimestamp(),
    });

    // ========================================
    // SUCCESS
    // ========================================

    await Swal.fire({
      icon: "success",
      title: "Account Created!",
      text: "Your account has been successfully registered.",
      confirmButtonColor: "#6f4e37",
      confirmButtonText: "Continue to Login",
    });

    // Go to login

    window.location.href = "./index.html";
  } catch (error) {
    console.error("Signup Error:", error);

    if (createdUser && auth.currentUser?.uid === createdUser.uid) {
      try {
        await deleteUser(createdUser);
      } catch (cleanupError) {
        console.error("Signup cleanup error:", cleanupError);
      }
    }

    let message = "Something went wrong while creating your account.";

    if (error.code === "auth/email-already-in-use") {
      message = "This email address is already registered.";
    } else if (error.code === "auth/invalid-email") {
      message = "Please enter a valid email address.";
    } else if (error.code === "auth/weak-password") {
      message = "Your password is too weak.";
    } else if (error.code === "permission-denied") {
      message =
        "Your account could not be completed because the user profile could not be saved. Please try again.";
    }

    Swal.fire({
      icon: "error",
      title: "Registration Failed",
      text: message,
      confirmButtonColor: "#6f4e37",
    });
  } finally {
    signupButton.disabled = false;

    signupButton.innerHTML = `
            <i class="bi bi-person-plus me-2"></i>
            Create Account
        `;
  }
});
