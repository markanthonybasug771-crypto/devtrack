import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const profileForm = document.getElementById("profileForm");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const birthdayInput = document.getElementById("birthday");
const ageInput = document.getElementById("age");
const genderInput = document.getElementById("gender");
const ministryInput = document.getElementById("ministry");
const cancelButton = document.getElementById("cancelButton");
const logoutButton = document.getElementById("logoutButton");
const mobileLogoutButton = document.getElementById("mobileLogoutButton");

const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");
const profileRole = document.getElementById("profileRole");
const profileEmail = document.getElementById("profileEmail");
const profileBirthday = document.getElementById("profileBirthday");
const profileAge = document.getElementById("profileAge");
const profileGender = document.getElementById("profileGender");
const profilePhone = document.getElementById("profilePhone");
const profileMinistry = document.getElementById("profileMinistry");

let currentUserId = null;

function calculateAge(value) {
    const birthday = new Date(value);
    if (isNaN(birthday.getTime())) {
        return "";
    }
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDifference = today.getMonth() - birthday.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthday.getDate())) {
        age--;
    }
    return age;
}

function updateProfilePreview(user) {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    profileName.textContent = fullName || "Your Name";
    profileRole.textContent = user.role ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}` : "Member";
    profileEmail.textContent = user.email || "not set";
    profileBirthday.textContent = user.birthday ? new Date(user.birthday).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not set";
    profileAge.textContent = user.age || "—";
    profileGender.textContent = user.gender || "Not set";
    profilePhone.textContent = user.phone || "Not set";
    profileMinistry.textContent = user.ministry || "Not set";
    profileAvatar.textContent = (user.firstName || "U").charAt(0).toUpperCase();
}

async function loadUserProfile(user) {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
        return null;
    }
    return userDoc.data();
}

function populateForm(user) {
    firstNameInput.value = user.firstName || "";
    lastNameInput.value = user.lastName || "";
    emailInput.value = user.email || "";
    phoneInput.value = user.phone || "";
    birthdayInput.value = user.birthday || "";
    ageInput.value = user.age || "";
    genderInput.value = user.gender || "";
    ministryInput.value = user.ministry || "";
}

function showError(message) {
    Swal.fire({
        icon: "error",
        title: "Oops...",
        text: message,
        confirmButtonColor: "#6f4e37"
    });
}

function showSuccess(message) {
    Swal.fire({
        icon: "success",
        title: "Saved",
        text: message,
        confirmButtonColor: "#6f4e37"
    });
}

function syncAge() {
    ageInput.value = calculateAge(birthdayInput.value);
}

birthdayInput.addEventListener("change", syncAge);

cancelButton.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
    const freshData = await loadUserProfile(user);
    if (freshData) {
        populateForm(freshData);
        updateProfilePreview(freshData);
    }
});

profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const birthday = birthdayInput.value;
    const age = Number(ageInput.value);
    const gender = genderInput.value;
    const ministry = ministryInput.value;

    if (!firstName || !lastName || !email || !phone || !birthday || !age || !gender || !ministry) {
        showError("Please complete all required fields before saving.");
        return;
    }

    try {
        const userDocRef = doc(db, "users", currentUserId);
        await setDoc(userDocRef, {
            firstName,
            lastName,
            email,
            phone,
            birthday,
            age,
            gender,
            ministry,
            updatedAt: serverTimestamp()
        }, { merge: true });

        showSuccess("Your profile has been updated.");
        updateProfilePreview({ firstName, lastName, email, phone, birthday, age, gender, ministry, role: profileRole.textContent });
    } catch (error) {
        console.error("Profile save error:", error);
        showError("Unable to update your profile right now. Please try again.");
    }
});

async function logout() {
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

    if (!result.isConfirmed) return;

    try {
        await signOut(auth);
        window.location.href = "./index.html";
    } catch (error) {
        console.error("Logout error:", error);
        showError("Unable to logout at the moment.");
    }
}

logoutButton?.addEventListener("click", (event) => {
    event.preventDefault();
    logout();
});

mobileLogoutButton?.addEventListener("click", (event) => {
    event.preventDefault();
    logout();
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "./index.html";
        return;
    }

    currentUserId = user.uid;

    try {
        const userProfile = await loadUserProfile(user);
        if (!userProfile) {
            await signOut(auth);
            window.location.href = "./index.html";
            return;
        }

        populateForm(userProfile);
        updateProfilePreview(userProfile);
        syncAge();
    } catch (error) {
        console.error("Profile load error:", error);
        showError("Unable to load your profile. Please login again.");
    }
});