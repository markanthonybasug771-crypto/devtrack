import { auth, db } from "./firebase.js";

import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const devotionalForm =
    document.getElementById("devotionalForm");

const devotionalDate =
    document.getElementById("devotionalDate");

const devotionalFormat =
    document.getElementById("devotionalFormat");

const formatDescription =
    document.getElementById("formatDescription");

const soapFields =
    document.getElementById("soapFields");

const slapFields =
    document.getElementById("slapFields");

const saveDevotionalButton =
    document.getElementById("saveDevotionalButton");


// ========================================
// GET LOCAL DATE
// ========================================

function getLocalDate() {

    const today = new Date();

    const year =
        today.getFullYear();

    const month =
        String(today.getMonth() + 1)
        .padStart(2, "0");

    const day =
        String(today.getDate())
        .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// ========================================
// SET TODAY
// ========================================

devotionalDate.value =
    getLocalDate();


// ========================================
// FORMAT SELECTION
// ========================================

devotionalFormat.addEventListener(
    "change",
    () => {

        const format =
            devotionalFormat.value;


        soapFields.classList.add("d-none");

        slapFields.classList.add("d-none");

        formatDescription.classList.add("d-none");


        if (format === "SOAP") {

            soapFields.classList.remove("d-none");

            formatDescription.classList.remove("d-none");

            formatDescription.innerHTML = `
                <strong>SOAP</strong> helps you
                reflect on Scripture through
                Scripture, Observation,
                Application, and Prayer.
            `;

        }


        if (format === "SLAP") {

            slapFields.classList.remove("d-none");

            formatDescription.classList.remove("d-none");

            formatDescription.innerHTML = `
                <strong>SLAP</strong> helps you reflect
                through Learn, Apply, and Pray.
            `;

        }

    }
);


// ========================================
// CHECK IF ALREADY SUBMITTED TODAY
// ========================================

async function hasDevotionalToday() {

    const user =
        auth.currentUser;


    if (!user) {
        return false;
    }


    const today =
        getLocalDate();


    const devotionalQuery = query(

        collection(db, "devotionals"),

        where("userId", "==", user.uid),

        where("date", "==", today)

    );


    const snapshot =
        await getDocs(devotionalQuery);


    return !snapshot.empty;

}


// ========================================
// SUBMIT DEVOTIONAL
// ========================================

devotionalForm.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();


        const user =
            auth.currentUser;


        if (!user) {

            Swal.fire({
                icon: "error",
                title: "Not Logged In",
                text: "Please login again.",
                confirmButtonColor: "#6f4e37"
            });

            return;
        }


        const format =
            devotionalFormat.value;


        if (!format) {

            Swal.fire({
                icon: "warning",
                title: "Select a Format",
                text: "Please choose SOAP or SLAP.",
                confirmButtonColor: "#6f4e37"
            });

            return;
        }


        // ========================================
        // CHECK DUPLICATE
        // ========================================

        try {

            const alreadySubmitted =
                await hasDevotionalToday();


            if (alreadySubmitted) {

                Swal.fire({
                    icon: "info",
                    title: "Already Submitted",
                    text:
                        "You have already submitted your devotional for today.",
                    confirmButtonColor: "#6f4e37"
                });

                return;
            }


            // ========================================
            // COLLECT CONTENT
            // ========================================

            let content = {};


            if (format === "SOAP") {

                const scripture =
                    document
                        .getElementById("soapScripture")
                        .value
                        .trim();

                const observation =
                    document
                        .getElementById("soapObservation")
                        .value
                        .trim();

                const application =
                    document
                        .getElementById("soapApplication")
                        .value
                        .trim();

                const prayer =
                    document
                        .getElementById("soapPrayer")
                        .value
                        .trim();


                if (
                    !scripture ||
                    !observation ||
                    !application ||
                    !prayer
                ) {

                    Swal.fire({
                        icon: "warning",
                        title: "Incomplete Devotional",
                        text:
                            "Please complete all SOAP sections.",
                        confirmButtonColor: "#6f4e37"
                    });

                    return;
                }


                content = {

                    scripture,

                    observation,

                    application,

                    prayer

                };

            }


            if (format === "SLAP") {

                const scripture =
                    document
                        .getElementById("slapScripture")
                        .value
                        .trim();

                const lesson =
                    document
                        .getElementById("slapLesson")
                        .value
                        .trim();

                const application =
                    document
                        .getElementById("slapApplication")
                        .value
                        .trim();

                const prayer =
                    document
                        .getElementById("slapPrayer")
                        .value
                        .trim();


                if (
                    !scripture ||
                    !lesson ||
                    !application ||
                    !prayer
                ) {

                    Swal.fire({
                        icon: "warning",
                        title: "Incomplete Devotional",
                        text:
                            "Please complete all SLAP sections.",
                        confirmButtonColor: "#6f4e37"
                    });

                    return;
                }


                content = {
                    scripture,
                    lesson,
                    application,
                    prayer
                };

            }


            // ========================================
            // DISABLE BUTTON
            // ========================================

            saveDevotionalButton.disabled =
                true;


            saveDevotionalButton.innerHTML = `
                <span class="spinner-border spinner-border-sm me-1"></span>
                Saving...
            `;


            // ========================================
            // SAVE TO FIRESTORE
            // ========================================

            await addDoc(
                collection(db, "devotionals"),
                {

                    userId: user.uid,

                    date: getLocalDate(),

                    format: format,

                    content: content,

                    checked: false,

                    checkedBy: null,

                    checkedAt: null,

                    createdAt:
                        serverTimestamp()

                }
            );


            // ========================================
            // SUCCESS
            // ========================================

            devotionalForm.reset();

            devotionalDate.value =
                getLocalDate();

            soapFields.classList.add("d-none");

            slapFields.classList.add("d-none");

            formatDescription.classList.add("d-none");


            const modalElement =
                document.getElementById(
                    "devotionalModal"
                );


            const modal =
                bootstrap.Modal.getInstance(
                    modalElement
                );


            if (modal) {
                modal.hide();
            }


            await Swal.fire({

                icon: "success",

                title: "Devotional Submitted!",

                text:
                    "Your devotional for today has been recorded.",

                confirmButtonColor:
                    "#6f4e37"

            });


        } catch (error) {

            console.error(
                "Devotional error:",
                error
            );


            Swal.fire({

                icon: "error",

                title: "Something Went Wrong",

                text:
                    "We couldn't save your devotional.",

                confirmButtonColor:
                    "#6f4e37"

            });


        } finally {

            saveDevotionalButton.disabled =
                false;


            saveDevotionalButton.innerHTML = `
                <i class="bi bi-check-lg me-1"></i>
                Submit Devotional
            `;

        }

    }
);