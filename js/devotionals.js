import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ========================================
// ELEMENTS
// ========================================

const myDevotionalsList =
    document.getElementById("myDevotionalsList");

const devotionsContainer =
    document.getElementById("devotionsContainer");

const devotionLoading =
    document.getElementById("devotionLoading");

const noDevotions =
    document.getElementById("noDevotions");

// ========================================
// LOGOUT BUTTONS
// ========================================

const logoutBtn =
    document.getElementById("logoutButton");

const mobileLogoutBtn =
    document.getElementById("mobileLogoutButton");

const startDevotionalBtn =
    document.getElementById("startDevotionalBtn");

const emptyStartDevotionBtn =
    document.getElementById("emptyStartDevotionBtn");


// ========================================
// MODAL ELEMENTS
// ========================================

const viewDevotionModalElement =
    document.getElementById("viewDevotionModal");

const viewDevotionTitle =
    document.getElementById("viewDevotionTitle");

const viewDevotionDate =
    document.getElementById("viewDevotionDate");

const viewDevotionStatus =
    document.getElementById("viewDevotionStatus");

const viewDevotionFormat =
    document.getElementById("viewDevotionFormat");

const viewScripture =
    document.getElementById("viewScripture");

const viewObservation =
    document.getElementById("viewObservation");

const viewObservationSection =
    document.getElementById("viewObservationSection");

const viewLesson =
    document.getElementById("viewLesson");

const viewLessonSection =
    document.getElementById("viewLessonSection");

const viewApplication =
    document.getElementById("viewApplication");

const viewPrayer =
    document.getElementById("viewPrayer");

const viewAdminRemark =
    document.getElementById("viewAdminRemark");

const viewAdminRemarkSection =
    document.getElementById("viewAdminRemarkSection");


// ========================================
// BOOTSTRAP MODAL
// ========================================

let viewDevotionModal = null;

if (viewDevotionModalElement) {

    viewDevotionModal =
        new bootstrap.Modal(
            viewDevotionModalElement
        );

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ========================================
// CHECK STATUS
// ========================================

function isDevotionChecked(item) {

    return (
        item.checked === true ||
        item.reviewed === true ||
        item.isChecked === true ||
        item.status === "checked" ||
        item.status === "Checked"
    );

}


// ========================================
// LOADING STATE
// ========================================

function showLoading() {

    if (devotionLoading) {

        devotionLoading.classList.remove(
            "d-none"
        );

    }

    if (noDevotions) {

        noDevotions.classList.add(
            "d-none"
        );

    }

    if (devotionsContainer) {

        devotionsContainer.innerHTML = "";

    }

}


// ========================================
// EMPTY STATE
// ========================================

function renderEmptyState() {

    if (devotionLoading) {

        devotionLoading.classList.add(
            "d-none"
        );

    }

    if (devotionsContainer) {

        devotionsContainer.innerHTML = "";

    }

    if (noDevotions) {

        noDevotions.classList.remove(
            "d-none"
        );

    }

}


// ========================================
// ERROR STATE
// ========================================

function renderErrorState() {

    if (devotionLoading) {

        devotionLoading.classList.add(
            "d-none"
        );

    }

    if (noDevotions) {

        noDevotions.classList.add(
            "d-none"
        );

    }

    if (!devotionsContainer) {
        return;
    }

    devotionsContainer.innerHTML = `

        <div class="col-12">

            <div class="empty-state">

                <div class="empty-state-icon">

                    <i class="bi bi-exclamation-triangle-fill"></i>

                </div>

                <h4>
                    Unable to load devotions
                </h4>

                <p>
                    There was a problem loading your
                    devotional journals.
                    Please refresh the page and try again.
                </p>

            </div>

        </div>

    `;

}


// ========================================
// GET STATUS HTML
// ========================================

function getStatusHTML(item) {

    const checked =
        isDevotionChecked(item);

    if (checked) {

        return `

            <span class="devotion-status text-success">

                <i class="bi bi-check-circle-fill me-1"></i>

                Checked by Pastor

            </span>

        `;

    }

    return `

        <span class="devotion-status text-muted">

            <i class="bi bi-clock me-1"></i>

            Waiting for Pastor

        </span>

    `;

}


// ========================================
// RENDER DEVOTIONAL CARDS
// ========================================

function renderDevotionals(devotionals) {

    if (devotionLoading) {

        devotionLoading.classList.add(
            "d-none"
        );

    }

    if (!devotionals.length) {

        renderEmptyState();

        return;

    }

    if (noDevotions) {

        noDevotions.classList.add(
            "d-none"
        );

    }

    if (!devotionsContainer) {
        return;
    }


    devotionsContainer.innerHTML =
        devotionals
            .map((item) => {

                const format =
                    (
                        item.format ||
                        "SOAP"
                    ).toUpperCase();

                const date =
                    item.date ||
                    "Unknown date";

                const content =
                    item.content ||
                    {};

                const checked =
                    isDevotionChecked(item);


                // Get short preview

                const scripture =
                    content.scripture ||
                    "";

                const preview =
                    scripture.length > 100
                        ? scripture.substring(0, 100) + "..."
                        : scripture;


                return `

                    <div class="col-12 col-md-6">

                        <article
                            class="devotion-card h-100"
                        >

                            <!-- HEADER -->

                            <div
                                class="
                                    d-flex
                                    justify-content-between
                                    align-items-start
                                    gap-3
                                    mb-3
                                "
                            >

                                <div>

                                    <span class="devotion-format">

                                        ${escapeHTML(format)}

                                    </span>

                                    <p class="devotion-date mt-2 mb-0">

                                        <i
                                            class="bi bi-calendar3 me-1"
                                        ></i>

                                        ${escapeHTML(date)}

                                    </p>

                                </div>


                                ${
                                    checked
                                        ? `
                                            <span
                                                class="
                                                    badge
                                                    text-success
                                                    bg-success-subtle
                                                "
                                            >

                                                <i
                                                    class="
                                                        bi
                                                        bi-check-circle-fill
                                                    "
                                                ></i>

                                            </span>
                                          `
                                        : `
                                            <span
                                                class="
                                                    badge
                                                    text-secondary
                                                    bg-secondary-subtle
                                                "
                                            >

                                                <i
                                                    class="
                                                        bi
                                                        bi-clock
                                                    "
                                                ></i>

                                            </span>
                                          `
                                }

                            </div>


                            <!-- PREVIEW -->

                            <div class="devotion-preview mb-3">

                                <small class="text-muted d-block mb-1">
                                    Scripture
                                </small>

                                <p class="mb-0">

                                    ${
                                        escapeHTML(preview) ||
                                        "No scripture preview available."
                                    }

                                </p>

                            </div>


                            <!-- STATUS -->

                            <div class="mb-3">

                                ${getStatusHTML(item)}

                            </div>


                            <!-- VIEW BUTTON -->

                            <button
                                type="button"
                                class="
                                    btn
                                    btn-outline-secondary
                                    w-100
                                    view-devotion-btn
                                "
                                data-devotion-id="${escapeHTML(item.id)}"
                            >

                                <i
                                    class="bi bi-eye me-2"
                                ></i>

                                View Devotion

                            </button>

                        </article>

                    </div>

                `;

            })
            .join("");


    // ====================================
    // VIEW BUTTON EVENTS
    // ====================================

    document
        .querySelectorAll(
            ".view-devotion-btn"
        )
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    const devotionId =
                        button.dataset.devotionId;

                    const devotion =
                        devotionals.find(
                            (item) =>
                                item.id ===
                                devotionId
                        );

                    if (devotion) {

                        openDevotionModal(
                            devotion
                        );

                    }

                }
            );

        });

}


// ========================================
// OPEN DEVOTION MODAL
// ========================================

function openDevotionModal(item) {

    const format =
        (
            item.format ||
            "SOAP"
        ).toUpperCase();

    const date =
        item.date ||
        "Unknown date";

    const content =
        item.content ||
        {};


    // ------------------------------------
    // BASIC INFORMATION
    // ------------------------------------

    if (viewDevotionTitle) {

        viewDevotionTitle.textContent =
            "My Devotion";

    }

    if (viewDevotionDate) {

        viewDevotionDate.textContent =
            date;

    }

    if (viewDevotionFormat) {

        viewDevotionFormat.textContent =
            format;

    }


    // ------------------------------------
    // STATUS
    // ------------------------------------

    if (viewDevotionStatus) {

        if (isDevotionChecked(item)) {

            viewDevotionStatus.innerHTML = `

                <div
                    class="
                        alert
                        alert-success
                        d-flex
                        align-items-center
                    "
                >

                    <i
                        class="
                            bi
                            bi-check-circle-fill
                            me-2
                        "
                    ></i>

                    <div>

                        <strong>
                            Checked by Pastor
                        </strong>

                        <br>

                        <small>
                            Your devotion has been checked.
                        </small>

                    </div>

                </div>

            `;

        } else {

            viewDevotionStatus.innerHTML = `

                <div
                    class="
                        alert
                        alert-secondary
                        d-flex
                        align-items-center
                    "
                >

                    <i
                        class="bi bi-clock me-2"
                    ></i>

                    <div>

                        <strong>
                            Waiting for Pastor
                        </strong>

                        <br>

                        <small>
                            Your devotion is waiting to be checked.
                        </small>

                    </div>

                </div>

            `;

        }

    }

    if (viewAdminRemarkSection) {

        const adminRemark =
            String(item.adminRemark || "").trim();

        viewAdminRemarkSection.classList.toggle(
            "d-none",
            !adminRemark
        );

        if (viewAdminRemark) {
            viewAdminRemark.textContent = adminRemark;
        }

    }


    // ------------------------------------
    // SCRIPTURE
    // ------------------------------------

    if (viewScripture) {

        viewScripture.textContent =
            content.scripture ||
            "-";

    }


    // ------------------------------------
    // SOAP OBSERVATION
    // ------------------------------------

    if (format === "SOAP") {

        if (viewObservationSection) {

            viewObservationSection.classList.remove(
                "d-none"
            );

        }

        if (viewObservation) {

            viewObservation.textContent =
                content.observation ||
                "-";

        }


        // Hide Lesson

        if (viewLessonSection) {

            viewLessonSection.classList.add(
                "d-none"
            );

        }

    }


    // ------------------------------------
    // SLAP LESSON
    // ------------------------------------

    else {

        if (viewObservationSection) {

            viewObservationSection.classList.add(
                "d-none"
            );

        }

        if (viewLessonSection) {

            viewLessonSection.classList.remove(
                "d-none"
            );

        }

        if (viewLesson) {

            viewLesson.textContent =
                content.lesson ||
                "-";

        }

    }


    // ------------------------------------
    // APPLICATION
    // ------------------------------------

    if (viewApplication) {

        viewApplication.textContent =
            content.application ||
            "-";

    }


    // ------------------------------------
    // PRAYER
    // ------------------------------------

    if (viewPrayer) {

        viewPrayer.textContent =
            content.prayer ||
            "-";

    }


    // ------------------------------------
    // SHOW MODAL
    // ------------------------------------

    if (viewDevotionModal) {

        viewDevotionModal.show();

    }

}


// ========================================
// LOAD DEVOTIONALS
// ========================================

async function loadDevotionals(userId) {

    if (!myDevotionalsList) {
        return;
    }

    showLoading();


    try {

        const devotionalsQuery =
            query(

                collection(
                    db,
                    "devotionals"
                ),

                where(
                    "userId",
                    "==",
                    userId
                )

            );


        const snapshot =
            await getDocs(
                devotionalsQuery
            );


        const items = [];


        snapshot.forEach(
            (docSnapshot) => {

                const data =
                    docSnapshot.data();


                items.push({

                    id: docSnapshot.id,

                    ...data

                });

            }
        );


        // =================================
        // SORT NEWEST FIRST
        // =================================

        items.sort(
            (a, b) => {

                const dateA =
                    a.date ||
                    "";

                const dateB =
                    b.date ||
                    "";


                if (dateA === dateB) {

                    return (
                        (
                            b.createdAt?.seconds ||
                            0
                        ) -
                        (
                            a.createdAt?.seconds ||
                            0
                        )
                    );

                }


                return dateB.localeCompare(
                    dateA
                );

            }
        );


        renderDevotionals(
            items
        );

    } catch (error) {

        console.error(
            "Failed to load devotions:",
            error
        );

        renderErrorState();

    }

}


// ========================================
// AUTH STATE
// ========================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "./index.html";

            return;

        }


        try {

            await loadDevotionals(
                user.uid
            );

        } catch (error) {

            console.error(
                "Auth state load error:",
                error
            );

            renderErrorState();

        }

    }
);


// ========================================
// LOGOUT FUNCTION
// ========================================

async function handleLogout(event) {

    event.preventDefault();


    try {

        // Sign out Firebase user

        await signOut(auth);


        // Redirect to login page

        window.location.href =
            "./index.html";

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );


        // Show error if SweetAlert is available

        if (typeof Swal !== "undefined") {

            Swal.fire({

                icon: "error",

                title: "Logout Failed",

                text:
                    "Something went wrong while logging out."

            });

        } else {

            alert(
                "Something went wrong while logging out."
            );

        }

    }

}


// ========================================
// DESKTOP LOGOUT
// ========================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        handleLogout
    );

}


// ========================================
// MOBILE LOGOUT
// ========================================

if (mobileLogoutBtn) {

    mobileLogoutBtn.addEventListener(
        "click",
        handleLogout
    );

}


// ========================================
// START DEVOTION
// ========================================

if (startDevotionalBtn) {

    startDevotionalBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "./user-dashboard.html";

        }
    );

}


if (emptyStartDevotionBtn) {

    emptyStartDevotionBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "./user-dashboard.html";

        }
    );

}
