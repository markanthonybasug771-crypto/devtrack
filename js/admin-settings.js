import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ========================================
// ELEMENTS
// ========================================

const encouragementForm =
    document.getElementById("encouragementForm");

const encouragementText =
    document.getElementById("encouragementText");

const encouragementReference =
    document.getElementById("encouragementReference");

const saveEncouragementBtn =
    document.getElementById("saveEncouragementBtn");


// ========================================
// FIRESTORE REFERENCE
// ========================================

const encouragementRef =
    doc(
        db,
        "settings",
        "dailyEncouragement"
    );


// ========================================
// LOAD TODAY'S ENCOURAGEMENT
// ========================================

async function loadEncouragement() {

    try {

        const snapshot =
            await getDoc(
                encouragementRef
            );


        if (snapshot.exists()) {

            const data =
                snapshot.data();


            if (encouragementText) {

                encouragementText.value =
                    data.message || "";

            }


            if (encouragementReference) {

                encouragementReference.value =
                    data.reference || "";

            }


        } else {

            if (encouragementText) {
                encouragementText.value = "";
            }

            if (encouragementReference) {
                encouragementReference.value = "";
            }

        }


    } catch (error) {

        console.error(
            "Load encouragement error:",
            error
        );


        if (
            typeof Swal !== "undefined"
        ) {

            Swal.fire({

                icon: "error",

                title: "Unable to Load",

                text:
                    "We couldn't load today's encouragement.",

                confirmButtonColor:
                    "#6f4e37"

            });

        }

    }

}


// ========================================
// SAVE ENCOURAGEMENT
// ========================================

async function saveEncouragement() {

    const message =
        encouragementText.value.trim();

    const reference =
        encouragementReference.value.trim();


    // ========================================
    // VALIDATION
    // ========================================

    if (!message) {

        Swal.fire({

            icon: "warning",

            title: "Empty Message",

            text:
                "Please write an encouragement message first.",

            confirmButtonColor:
                "#6f4e37"

        });

        return;

    }


    if (!reference) {

        Swal.fire({

            icon: "warning",

            title: "Missing Bible Reference",

            text:
                "Please enter the Bible verse or reference.",

            confirmButtonColor:
                "#6f4e37"

        });

        return;

    }


    try {

        // ========================================
        // DISABLE BUTTON
        // ========================================

        saveEncouragementBtn.disabled =
            true;


        saveEncouragementBtn.innerHTML = `

            <span
                class="spinner-border spinner-border-sm me-2"
            ></span>

            Saving...

        `;


        // ========================================
        // SAVE TO FIRESTORE
        // ========================================

        await setDoc(

            encouragementRef,

            {

                message:
                    message,

                reference:
                    reference,

                updatedAt:
                    serverTimestamp(),

                updatedBy:
                    auth.currentUser?.uid || null

            },

            {
                merge: true
            }

        );


        // ========================================
        // SUCCESS
        // ========================================

        await Swal.fire({

            icon: "success",

            title:
                "Encouragement Updated! 🙏",

            text:
                "Today's encouragement has been updated successfully.",

            confirmButtonColor:
                "#6f4e37",

            timer: 1800,

            showConfirmButton: false

        });


    } catch (error) {

        console.error(
            "Save encouragement error:",
            error
        );


        Swal.fire({

            icon: "error",

            title:
                "Something Went Wrong",

            text:
                "We couldn't save today's encouragement.",

            confirmButtonColor:
                "#6f4e37"

        });


    } finally {

        // ========================================
        // RESTORE BUTTON
        // ========================================

        saveEncouragementBtn.disabled =
            false;


        saveEncouragementBtn.innerHTML = `

            <i class="bi bi-save me-2"></i>

            Save Today's Encouragement

        `;

    }

}


// ========================================
// FORM SUBMIT
// ========================================

if (encouragementForm) {

    encouragementForm.addEventListener(

        "submit",

        async (event) => {

            event.preventDefault();

            await saveEncouragement();

        }

    );

}


// ========================================
// LOAD WHEN PAGE OPENS
// ========================================

loadEncouragement();