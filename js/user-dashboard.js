import { auth, db, messaging } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getToken
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging.js";

import {
    doc,
    getDoc,
    getDocs,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    setDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";




const greeting = document.getElementById("greeting");

const userAvatar =
    document.getElementById("userAvatar");

const currentDate =
    document.getElementById("currentDate");

const logoutButton =
    document.getElementById("logoutButton");

const mobileLogoutButton =
    document.getElementById("mobileLogoutButton");

const myDevotionalsButtons =
    document.querySelectorAll(
        ".myDevotionalsBtn"
    );

const myDevotionalsSection =
    document.getElementById(
        "myDevotionalsSection"
    );

const totalDevotionalsEl =
    document.getElementById("totalDevotionals");

const monthlyDevotionalsEl =
    document.getElementById("monthlyDevotionals");

const currentStreakValueEl =
    document.getElementById("currentStreakValue");

const devotionConsistencyValueEl =
    document.getElementById(
        "devotionConsistencyValue");

const devotionConsistencyProgressEl =
    document.getElementById(
        "devotionConsistencyProgress");

const dailyQuoteEl =
    document.getElementById("dailyQuote");

const dailyQuoteReferenceEl =
    document.getElementById("dailyQuoteReference");

// ========================================
// TODAY'S DEVOTION ELEMENT
// ========================================

const todayDevotionContainer =
    document.getElementById(
        "todayDevotionContainer"
    );


if (myDevotionalsButtons.length && myDevotionalsSection) {
    myDevotionalsButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
            e.preventDefault();
            myDevotionalsSection.classList.remove("d-none");
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });
}


// ========================================
// CURRENT DATE
// ========================================

const today = new Date();

currentDate.textContent =
    today.toLocaleDateString(
        "en-US",
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    );


// ========================================
// CHECK AUTHENTICATION
// ========================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "./index.html";

        return;
    }


    try {

        // Get Firestore profile

        const userDocRef =
            doc(db, "users", user.uid);

        const userDoc =
            await getDoc(userDocRef);


        if (!userDoc.exists()) {

            await signOut(auth);

            window.location.href =
                "./index.html";

            return;
        }

        await enablePushNotifications(user);


        const userData =
            userDoc.data();

        currentUserData = userData;


        const firstName =
            userData.firstName || "there";

        const gender =
            userData.gender;

        loadPrayerRequests();

await loadDashboardStats(user.uid);

await loadDailyEncouragement();

await loadTodaysDevotion(user.uid);

// ========================================
// ENABLE PUSH NOTIFICATIONS
// ========================================

const VAPID_KEY =
    "BNwoM26xnnryzuAW3kkOKdG9I-6gEdTuM2I-mSnBPHNnu7nsSQC54wJvPincrEEVQtmblCxixfY0rpCSB2N1pDI";


async function enablePushNotifications(user) {

    try {

        // ========================================
        // CHECK BROWSER SUPPORT
        // ========================================

        if (
            !("Notification" in window)
        ) {

            console.log(
                "This browser does not support notifications."
            );

            return;

        }


        // ========================================
        // CHECK SERVICE WORKER SUPPORT
        // ========================================

        if (
            !("serviceWorker" in navigator)
        ) {

            console.log(
                "Service workers are not supported."
            );

            return;

        }


        // ========================================
        // REQUEST PERMISSION
        // ========================================

        let permission =
            Notification.permission;


        if (
            permission === "default"
        ) {

            permission =
                await Notification.requestPermission();

        }


        // ========================================
        // USER DENIED
        // ========================================

        if (
            permission !== "granted"
        ) {

            console.log(
                "Notification permission was not granted."
            );

            return;

        }


        // ========================================
        // REGISTER SERVICE WORKER
        // ========================================

        const registration =
            await navigator.serviceWorker.register(
                "/firebase-messaging-sw.js"
            );


        console.log(
            "Firebase Messaging Service Worker registered.",
            registration
        );


        // ========================================
        // GET FCM TOKEN
        // ========================================

        const token =
            await getToken(
                messaging,
                {
                    vapidKey:
                        VAPID_KEY,

                    serviceWorkerRegistration:
                        registration
                }
            );


        if (!token) {

            console.log(
                "No FCM token available."
            );

            return;

        }


        console.log(
            "FCM Token:",
            token
        );


        // ========================================
        // SAVE TOKEN TO USER DOCUMENT
        // ========================================

        await setDoc(

            doc(
                db,
                "users",
                user.uid
            ),

            {

                notificationTokens:
                    arrayUnion(token)

            },

            {
                merge: true
            }

        );


        console.log(
            "FCM token saved successfully."
        );


    } catch (error) {

        console.error(
            "Push notification setup error:",
            error
        );

    }

}

        // ========================================
        // BRO / SISTER
        // ========================================

        let title = "Bro";

        if (gender === "Female") {

            title = "Sister";

        }


        // ========================================
        // GREETING
        // ========================================

        greeting.textContent =
            `Hello, ${title} ${firstName}! 👋`;


        // ========================================
        // AVATAR
        // ========================================

        if (firstName) {

            userAvatar.textContent =
                firstName.charAt(0).toUpperCase();

        }


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }

});


// ========================================
// LOGOUT FUNCTION
// ========================================

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


    if (!result.isConfirmed) {
        return;
    }


    try {

        await signOut(auth);


        await Swal.fire({

            icon: "success",

            title: "Logged Out",

            text: "You have been successfully logged out.",

            timer: 1200,

            showConfirmButton: false

        });


        window.location.href =
            "./index.html";


    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }

}


// Desktop logout
logoutButton.addEventListener(
    "click",
    (e) => {

        e.preventDefault();

        logout();

    }
);


// Mobile logout
mobileLogoutButton.addEventListener(
    "click",
    (e) => {

        e.preventDefault();

        logout();

    }
);

// ========================================
// PRAYER REQUESTS
// ========================================

const prayerRequestForm =
    document.getElementById("prayerRequestForm");

const prayerRequestInput =
    document.getElementById("prayerRequestInput");

const prayerRequestsList =
    document.getElementById("prayerRequestsList");

const savePrayerButton =
    document.getElementById("savePrayerButton");


let currentUserData = null;


// ========================================
// LOAD DASHBOARD DEVOTIONAL STATS
// ========================================

function getLocalDateValue(date = new Date()) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


// ========================================
// COUNT CONSECUTIVE STREAK
// ========================================

function countConsecutiveStreak(dates) {

    if (!dates.length) {
        return 0;
    }


    const uniqueDates =
        [
            ...new Set(dates)
        ].sort();


    const today =
        new Date();


    const todayKey =
        getLocalDateValue(
            today
        );


    let streak = 0;


    let currentDate =
        new Date(
            today
        );


    while (true) {

        const dateKey =
            getLocalDateValue(
                currentDate
            );


        if (
            uniqueDates.includes(
                dateKey
            )
        ) {

            streak += 1;

        } else {

            if (
                streak > 0
            ) {

                break;

            }

        }


        if (
            dateKey === todayKey &&
            streak === 0
        ) {

            break;

        }


        currentDate.setDate(
            currentDate.getDate() - 1
        );


        if (
            streak > 0 &&
            !uniqueDates.includes(
                getLocalDateValue(
                    currentDate
                )
            )
        ) {

            break;

        }

    }


    return streak;

}


// ========================================
// CALCULATE DEVOTIONAL CONSISTENCY
// SAME LOGIC AS ADMIN SIDE
// ========================================

function calculateConsistency(
    devotionals
) {

    const dates = [

        ...new Set(

            devotionals

                .map(
                    devotion =>
                        devotion.date
                )

                .filter(Boolean)

        )

    ];


    // No devotion yet

    if (
        !dates.length
    ) {

        return 0;

    }


    // ========================================
    // FIRST DEVOTION DATE
    // ========================================

    dates.sort();


    const firstDate =
        new Date(
            dates[0] + "T00:00:00"
        );


    firstDate.setHours(
        0,
        0,
        0,
        0
    );


    // ========================================
    // TODAY
    // ========================================

    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    // ========================================
    // TRACKED DAYS
    // ========================================

    const millisecondsPerDay =
        24 *
        60 *
        60 *
        1000;


    const trackedDays =
        Math.max(

            1,

            Math.floor(

                (
                    today.getTime() -
                    firstDate.getTime()
                ) /
                millisecondsPerDay

            ) + 1

        );


    // ========================================
    // CONSISTENCY
    // ========================================

    const consistency =
        Math.round(

            (
                dates.length /
                trackedDays
            ) * 100

        );


    return Math.min(
        100,
        Math.max(
            0,
            consistency
        )
    );

}


// ========================================
// LOAD DASHBOARD STATS
// ========================================

async function loadDashboardStats(
    userId
) {

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


        const devotionals = [];


        snapshot.forEach(
            (docSnapshot) => {

                devotionals.push({

                    id:
                        docSnapshot.id,

                    ...docSnapshot.data()

                });

            }
        );


        // ========================================
        // TOTAL DEVOTIONS
        // ========================================

        const total =
            devotionals.length;


        // ========================================
        // CURRENT MONTH
        // ========================================

        const today =
            new Date();


        const currentMonth =
            today.getMonth() + 1;


        const currentYear =
            today.getFullYear();


        const monthly =
            devotionals.filter(
                (item) => {

                    if (
                        !item.date
                    ) {

                        return false;

                    }


                    const [
                        year,
                        month
                    ] =
                        item.date
                            .split("-")
                            .map(Number);


                    return (

                        year ===
                        currentYear

                        &&

                        month ===
                        currentMonth

                    );

                }
            ).length;


        // ========================================
        // DEVOTION DATES
        // ========================================

        const dates =
            devotionals

                .map(
                    item =>
                        item.date
                )

                .filter(Boolean)

                .sort();


        // ========================================
        // CURRENT STREAK
        // ========================================

        const streak =
            countConsecutiveStreak(
                dates
            );


        // ========================================
        // CONSISTENCY
        // ========================================

        const consistency =
            calculateConsistency(
                devotionals
            );


        // ========================================
        // UPDATE TOTAL
        // ========================================

        if (
            totalDevotionalsEl
        ) {

            totalDevotionalsEl.textContent =
                total;

        }


        // ========================================
        // UPDATE MONTHLY
        // ========================================

        if (
            monthlyDevotionalsEl
        ) {

            monthlyDevotionalsEl.textContent =
                monthly;

        }


        // ========================================
        // UPDATE STREAK
        // ========================================

        if (
            currentStreakValueEl
        ) {

            currentStreakValueEl.textContent =

                `${streak} day${
                    streak === 1
                        ? ""
                        : "s"
                }`;

        }


        // ========================================
        // UPDATE CONSISTENCY %
        // ========================================

        if (
            devotionConsistencyValueEl
        ) {

            devotionConsistencyValueEl.textContent =
                `${consistency}%`;

        }


        // ========================================
        // UPDATE PROGRESS BAR
        // ========================================

        if (
            devotionConsistencyProgressEl
        ) {

            devotionConsistencyProgressEl.style.width =
                `${consistency}%`;


            devotionConsistencyProgressEl.setAttribute(
                "aria-valuenow",
                consistency
            );

        }


    } catch (error) {

        console.error(
            "Dashboard stats error:",
            error
        );


        if (
            totalDevotionalsEl
        ) {

            totalDevotionalsEl.textContent =
                "0";

        }


        if (
            monthlyDevotionalsEl
        ) {

            monthlyDevotionalsEl.textContent =
                "0";

        }


        if (
            currentStreakValueEl
        ) {

            currentStreakValueEl.textContent =
                "0 days";

        }


        if (
            devotionConsistencyValueEl
        ) {

            devotionConsistencyValueEl.textContent =
                "0%";

        }


        if (
            devotionConsistencyProgressEl
        ) {

            devotionConsistencyProgressEl.style.width =
                "0%";


            devotionConsistencyProgressEl.setAttribute(
                "aria-valuenow",
                "0"
            );

        }

    }

}

// ========================================
// LOAD TODAY'S DEVOTION
// ========================================

async function loadTodaysDevotion(userId) {

    if (!todayDevotionContainer) {
        return;
    }

    try {

        const today =
            getLocalDateValue();

        const devotionQuery =
            query(
                collection(
                    db,
                    "devotionals"
                ),
                where(
                    "userId",
                    "==",
                    userId
                ),
                where(
                    "date",
                    "==",
                    today
                )
            );


        const snapshot =
            await getDocs(
                devotionQuery
            );


        // ========================================
        // NO DEVOTION TODAY
        // ========================================

        if (snapshot.empty) {

            todayDevotionContainer.innerHTML = `

                <div class="dashboard-card text-center p-4">

                    <div class="mb-3">

                        <i
                            class="bi bi-journal-x"
                            style="font-size: 2.5rem; opacity: .5;"
                        ></i>

                    </div>

                    <h5>
                        No devotion for today yet
                    </h5>

                    <p class="text-muted mb-3">
                        You haven't submitted your devotion for today.
                    </p>

                    <a
                        href="devotionals.html"
                        class="btn btn-login"
                    >
                        <i class="bi bi-plus-circle me-2"></i>
                        Write Today's Devotion
                    </a>

                </div>

            `;

            return;
        }


        // ========================================
        // GET TODAY'S DEVOTION
        // ========================================

        const devotionDoc =
            snapshot.docs[0];

        const devotion = {
            id: devotionDoc.id,
            ...devotionDoc.data()
        };


        renderTodaysDevotion(
            devotion
        );


    } catch (error) {

        console.error(
            "Today's devotion error:",
            error
        );


        todayDevotionContainer.innerHTML = `

            <div class="alert alert-danger">

                <i class="bi bi-exclamation-triangle-fill me-2"></i>

                Unable to load today's devotion.

            </div>

        `;

    }
}

// ========================================
// RENDER TODAY'S DEVOTION
// ========================================

function renderTodaysDevotion(
    devotion
) {

    const format =
        (
            devotion.format ||
            "SOAP"
        ).toUpperCase();


    const content =
        devotion.content ||
        {};


    const scripture =
        content.scripture ||
        "No scripture entered.";


    const observation =
        content.observation ||
        "";


    const lesson =
        content.lesson ||
        "";


    const application =
        content.application ||
        "";


    const prayer =
        content.prayer ||
        "";


    const date =
        devotion.date ||
        getLocalDateValue();


    let mainContent = "";


    // ========================================
    // SOAP
    // ========================================

    if (format === "SOAP") {

        mainContent = `

            <div class="mb-4">

                <div class="fw-semibold mb-2">
                    <i class="bi bi-eye me-2"></i>
                    Observation
                </div>

                <div class="text-muted">
                    ${escapeHtml(
                        observation ||
                        "No observation entered."
                    )}
                </div>

            </div>

        `;

    }


    // ========================================
    // SLAP
    // ========================================

    if (format === "SLAP") {

        mainContent = `

            <div class="mb-4">

                <div class="fw-semibold mb-2">
                    <i class="bi bi-lightbulb me-2"></i>
                    Lesson
                </div>

                <div class="text-muted">
                    ${escapeHtml(
                        lesson ||
                        "No lesson entered."
                    )}
                </div>

            </div>

        `;

    }


    todayDevotionContainer.innerHTML = `

        <div class="dashboard-card p-4">

            <!-- HEADER -->

            <div class="
                d-flex
                justify-content-between
                align-items-start
                gap-3
                flex-wrap
                mb-4
            ">

                <div>

                    <div class="d-flex align-items-center gap-2 mb-2">

                        <span
                            class="badge rounded-pill"
                            style="
                                background:#6f4e37;
                                color:white;
                            "
                        >
                            ${escapeHtml(format)}
                        </span>

                        <span class="text-muted small">
                            ${escapeHtml(date)}
                        </span>

                    </div>

                    <h4 class="mb-0">
                        My Devotion
                    </h4>

                </div>


                <!-- SHARE BUTTON -->

                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    id="shareTodaysDevotion"
                >

                    <i class="bi bi-share me-2"></i>

                    Share

                </button>

            </div>


            <!-- SCRIPTURE -->

            <div class="mb-4">

                <div class="fw-semibold mb-2">

                    <i class="bi bi-book me-2"></i>

                    Scripture

                </div>

                <div
                    class="p-3 rounded"
                    style="
                        background:#f8f5f1;
                        border-left:4px solid #6f4e37;
                    "
                >

                    ${escapeHtml(scripture)}

                </div>

            </div>


            <!-- OBSERVATION / LESSON -->

            ${mainContent}


            <!-- APPLICATION -->

            <div class="mb-4">

                <div class="fw-semibold mb-2">

                    <i class="bi bi-arrow-right-circle me-2"></i>

                    Application

                </div>

                <div class="text-muted">

                    ${escapeHtml(
                        application ||
                        "No application entered."
                    )}

                </div>

            </div>


            <!-- PRAYER -->

            <div>

                <div class="fw-semibold mb-2">

                    <i class="bi bi-heart me-2"></i>

                    Prayer

                </div>

                <div class="text-muted">

                    ${escapeHtml(
                        prayer ||
                        "No prayer entered."
                    )}

                </div>

            </div>

        </div>

    `;


    // ========================================
    // SHARE BUTTON
    // ========================================

    const shareButton =
        document.getElementById(
            "shareTodaysDevotion"
        );


    if (shareButton) {

        shareButton.addEventListener(
            "click",
            () => {

                shareTodaysDevotion(
                    devotion
                );

            }
        );

    }

}

// ========================================
// SHARE TODAY'S DEVOTION
// PRAYER IS PRIVATE
// ========================================

async function shareTodaysDevotion(devotion) {

    try {

        const format =
            (devotion.format || "SOAP").toUpperCase();

        const originalContent =
            devotion.content || {};

        // ========================================
        // PUBLIC CONTENT ONLY
        // PRAYER IS EXCLUDED
        // ========================================

        let publicContent = {};

        if (format === "SOAP") {

            publicContent = {

                scripture:
                    originalContent.scripture || "",

                observation:
                    originalContent.observation || "",

                application:
                    originalContent.application || ""

            };

        }

        if (format === "SLAP") {

            publicContent = {

                scripture:
                    originalContent.scripture || "",

                lesson:
                    originalContent.lesson || "",

                application:
                    originalContent.application || ""

            };

        }


        // ========================================
        // CREATE SHARED DEVOTION
        // ========================================

        const sharedRef =
            await addDoc(
                collection(
                    db,
                    "sharedDevotions"
                ),
                {

                    userId:
                        auth.currentUser.uid,

                    format:
                        format,

                    content:
                        publicContent,

                    date:
                        devotion.date ||
                        getLocalDate(),

                    createdAt:
                        serverTimestamp()

                }
            );


        // ========================================
        // CREATE SHARE URL
        // ========================================

        const shareUrl =
            `${window.location.origin}/shared-devotion.html?id=${sharedRef.id}`;


        // ========================================
        // NATIVE SHARE
        // ========================================

        if (navigator.share) {

            await navigator.share({

                title:
                    "My Today's Devotion",

                text:
                    "🙏 My Today's Devotion",

                url:
                    shareUrl

            });

            return;

        }


        // ========================================
        // FALLBACK COPY LINK
        // ========================================

        await navigator.clipboard.writeText(
            shareUrl
        );


        Swal.fire({

            icon:
                "success",

            title:
                "Share Link Copied!",

            text:
                "Your devotion link has been copied. You can now share it on Facebook, Messenger, or other apps.",

            confirmButtonColor:
                "#6f4e37"

        });


    } catch (error) {

        console.error(
            "Share devotion error:",
            error
        );


        // ========================================
        // USER CANCELLED SHARE
        // ========================================

        if (
            error.name ===
            "AbortError"
        ) {

            return;

        }


        Swal.fire({

            icon:
                "error",

            title:
                "Unable to Share",

            text:
                "We couldn't create your devotion sharing link.",

            confirmButtonColor:
                "#6f4e37"

        });

    }

}

// ========================================
// LOAD USER PROFILE
// ========================================

async function loadUserProfile(user) {

    const userDocRef =
        doc(db, "users", user.uid);

    const userDoc =
        await getDoc(userDocRef);


    if (!userDoc.exists()) {
        return null;
    }


    return userDoc.data();

}


// ========================================
// LOAD TODAY'S PRAYER REQUESTS
// ========================================

function loadPrayerRequests() {

    const todayDate =
        new Date().toISOString().split("T")[0];


    const prayerQuery = query(
        collection(db, "prayerRequests"),
        where("date", "==", todayDate)
    );


    onSnapshot(
        prayerQuery,
        (snapshot) => {

            prayerRequestsList.innerHTML = "";


            if (snapshot.empty) {

                prayerRequestsList.innerHTML = `
                    <div class="empty-prayer">

                        <i class="bi bi-chat-heart"></i>

                        <p>
                            No prayer requests for today.
                        </p>

                    </div>
                `;

                return;
            }


            const requests = [];


            snapshot.forEach((docSnapshot) => {

                const prayer =
                    docSnapshot.data();

                requests.push(prayer);

            });


            requests.sort((a, b) => {

                const timeA =
                    a.createdAt?.seconds || 0;

                const timeB =
                    b.createdAt?.seconds || 0;

                return timeA - timeB;

            });


            const listContainer =
                document.createElement("div");

            listContainer.className =
                "prayer-list";


            requests.forEach((prayer) => {

                const item =
                    document.createElement("div");

                item.className =
                    "prayer-bullet-item";

                item.innerHTML = `
                    <span class="prayer-bullet">•</span>
                    <p class="prayer-text">
                        ${escapeHtml(prayer.request)}
                    </p>
                `;

                listContainer.appendChild(item);

            });


            prayerRequestsList.appendChild(listContainer);

        },


        (error) => {

            console.error(
                "Prayer request loading error:",
                error
            );


            prayerRequestsList.innerHTML = `

                <div class="empty-prayer">

                    <i class="bi bi-exclamation-circle"></i>

                    <p>
                        Unable to load prayer requests.
                    </p>

                </div>

            `;

        }

    );

}


// ========================================
// SAVE PRAYER REQUEST
// ========================================

prayerRequestForm.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();


        const request =
            prayerRequestInput.value.trim();


        if (!request) {

            Swal.fire({
                icon: "warning",
                title: "Empty Request",
                text: "Please enter your prayer request.",
                confirmButtonColor: "#6f4e37"
            });

            return;
        }


        if (!currentUserData) {

            Swal.fire({
                icon: "error",
                title: "User Error",
                text: "Your account information could not be loaded.",
                confirmButtonColor: "#6f4e37"
            });

            return;
        }


        savePrayerButton.disabled = true;


        savePrayerButton.innerHTML = `
            <span class="spinner-border spinner-border-sm me-1"></span>
            Saving...
        `;


        try {

            const todayDate =
                new Date()
                    .toISOString()
                    .split("T")[0];


            const fullName =
                `${currentUserData.firstName} ${currentUserData.lastName}`;


            await addDoc(
                collection(db, "prayerRequests"),
                {

                    userId: auth.currentUser.uid,

                    userName: fullName,

                    role:
                        currentUserData.role || "user",

                    request: request,

                    date: todayDate,

                    createdAt:
                        serverTimestamp()

                }
            );


            prayerRequestForm.reset();


            const modalElement =
                document.getElementById(
                    "prayerRequestModal"
                );


            const modal =
                bootstrap.Modal.getInstance(
                    modalElement
                );


            if (modal) {
                modal.hide();
            }


            Swal.fire({

                icon: "success",

                title: "Prayer Request Added!",

                text:
                    "Your prayer request has been shared with the team.",

                timer: 1800,

                showConfirmButton: false

            });


        } catch (error) {

            console.error(
                "Save prayer request error:",
                error
            );


            Swal.fire({

                icon: "error",

                title: "Something Went Wrong",

                text:
                    "We couldn't save your prayer request.",

                confirmButtonColor:
                    "#6f4e37"

            });

        } finally {

            savePrayerButton.disabled = false;


            savePrayerButton.innerHTML = `
                <i class="bi bi-send me-1"></i>
                Submit Request
            `;

        }

    }
);


// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}

// ========================================
// DEVOTIONAL FORM
// ========================================

const devotionalForm =
    document.getElementById("devotionalForm");

const devotionalFormat =
    document.getElementById("devotionalFormat");

const devotionalDate =
    document.getElementById("devotionalDate");

const soapFields =
    document.getElementById("soapFields");

const slapFields =
    document.getElementById("slapFields");

const formatDescription =
    document.getElementById("formatDescription");

const saveDevotionalButton =
    document.getElementById("saveDevotionalButton");


// ========================================
// GET TODAY'S DATE
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

if (devotionalDate) {
    devotionalDate.value = getLocalDate();
}


// ========================================
// FORMAT SELECTION
// ========================================

if (devotionalFormat) {

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

                formatDescription.classList.remove(
                    "d-none"
                );

                formatDescription.innerHTML = `
                    <strong>SOAP</strong><br>
                    Scripture, Observation,
                    Application, and Prayer.
                `;
            }


            if (format === "SLAP") {

                slapFields.classList.remove("d-none");

                formatDescription.classList.remove(
                    "d-none"
                );

                formatDescription.innerHTML = `
                    <strong>SLAP</strong><br>
                    Learn, Apply, and Pray.
                `;
            }

        }
    );

}


// ========================================
// PARSE PRAYER INTO INDIVIDUAL PRAYERS
// ========================================

function parsePrayerPoints(prayerText) {

    if (!prayerText) {
        return [];
    }

    const lines = prayerText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    const prayers = [];

    let currentPrayer = "";

    /*
        Supported markers:

        • Prayer
        - Prayer
        – Prayer
        — Prayer
        * Prayer
        ▪ Prayer
        ◦ Prayer
        ‣ Prayer
        ⁃ Prayer

        1. Prayer
        1) Prayer
        1: Prayer
        1 - Prayer
        1 – Prayer
        1 — Prayer

        a. Prayer
        a) Prayer
        A. Prayer
        A) Prayer
    */

    const listMarkerRegex =
        /^(?:[•*▪◦‣⁃]|[-–—]|(?:\d+)\s*[.):\-–—]|(?:[a-zA-Z])\s*[.)\-–—])\s*/;


    lines.forEach((line) => {

        /*
            If this line starts a new prayer point
        */

        if (listMarkerRegex.test(line)) {

            // Save previous prayer
            if (currentPrayer.trim()) {

                prayers.push(
                    currentPrayer.trim()
                );

            }

            // Remove marker
            currentPrayer =
                line
                    .replace(
                        listMarkerRegex,
                        ""
                    )
                    .trim();

        }

        /*
            If no marker, treat it as continuation
            of the previous prayer.
        */

        else {

            if (currentPrayer) {

                currentPrayer +=
                    " " + line;

            }

            else {

                /*
                    If the user didn't use bullets
                    at all, the first line becomes
                    a prayer point.
                */

                currentPrayer =
                    line;

            }

        }

    });


    // Save last prayer
    if (currentPrayer.trim()) {

        prayers.push(
            currentPrayer.trim()
        );

    }


    return prayers.filter(
        prayer =>
            prayer.length > 0
    );

}


// ========================================
// SUBMIT DEVOTIONAL
// ========================================

if (devotionalForm) {

    devotionalForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


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
                    title: "Choose a Format",
                    text:
                        "Please select SOAP or SLAP.",
                    confirmButtonColor: "#6f4e37"
                });

                return;
            }


            const today =
                getLocalDate();


            try {

                // ========================================
                // CHECK IF ALREADY SUBMITTED TODAY
                // ========================================

                const existingQuery = query(

                    collection(
                        db,
                        "devotionals"
                    ),

                    where(
                        "userId",
                        "==",
                        user.uid
                    ),

                    where(
                        "date",
                        "==",
                        today
                    )

                );


                const existingSnapshot =
                    await getDocs(
                        existingQuery
                    );


                if (!existingSnapshot.empty) {

                    Swal.fire({
                        icon: "info",
                        title: "Already Submitted",
                        text:
                            "You have already submitted your devotional for today.",
                        confirmButtonColor:
                            "#6f4e37"
                    });

                    return;
                }


                let content = {};


                // ========================================
                // SOAP
                // ========================================

                if (format === "SOAP") {

                    const scripture =
                        document
                            .getElementById(
                                "soapScripture"
                            )
                            .value
                            .trim();


                    const observation =
                        document
                            .getElementById(
                                "soapObservation"
                            )
                            .value
                            .trim();


                    const application =
                        document
                            .getElementById(
                                "soapApplication"
                            )
                            .value
                            .trim();


                    const prayer =
                        document
                            .getElementById(
                                "soapPrayer"
                            )
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
                            title:
                                "Incomplete Devotional",
                            text:
                                "Please complete all SOAP sections.",
                            confirmButtonColor:
                                "#6f4e37"
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


                // ========================================
                // SLAP
                // ========================================

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
                                "Please complete all LAP sections.",
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
                    <span
                        class="spinner-border spinner-border-sm me-1">
                    </span>
                    Saving...
                `;


                // ========================================
                // SAVE TO FIRESTORE
                // ========================================
            const devotionRef =
                await addDoc(
                    collection(
                        db,
                        "devotionals"
                    ),
                    {

                        userId:
                            user.uid,

                        date:
                            today,

                        format:
                            format,

                        content:
                            content,

                        checked:
                            false,

                        checkedBy:
                            null,

                        checkedAt:
                            null,

                        createdAt:
                            serverTimestamp()

                    }
                );

                // ========================================
// SAVE PRAYER POINTS
// ========================================

const prayerText =
    content.prayer || "";

const prayerPoints =
    parsePrayerPoints(
        prayerText
    );


for (const prayerPoint of prayerPoints) {

    await addDoc(
        collection(
            db,
            "prayers"
        ),
        {

            userId:
                user.uid,

            devotionId:
                devotionRef.id,

            prayerText:
                prayerPoint,

            date:
                today,

            answered:
                false,

            answeredAt:
                null,

            createdAt:
                serverTimestamp()

        }
    );

}

// ========================================
// REFRESH DASHBOARD STATS
// ========================================

await loadDashboardStats(
    user.uid
);


                // ========================================
                // RESET FORM
                // ========================================

                devotionalForm.reset();

                devotionalDate.value =
                    getLocalDate();

                soapFields.classList.add(
                    "d-none"
                );

                slapFields.classList.add(
                    "d-none"
                );

                formatDescription.classList.add(
                    "d-none"
                );


                // ========================================
                // CLOSE MODAL
                // ========================================

                const modalElement =
                    document.getElementById(
                        "devotionalModal"
                    );


                const modal =
                    bootstrap.Modal
                        .getInstance(
                            modalElement
                        );


                if (modal) {
                    modal.hide();
                }


                // ========================================
                // SUCCESS
                // ========================================

                Swal.fire({

                    icon: "success",

                    title:
                        "Devotional Submitted!",

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

                    title:
                        "Something Went Wrong",

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

}

// ========================================
// MOBILE KEYBOARD INPUT FIX
// ========================================

document.addEventListener("focusin", (event) => {

    const element = event.target;

    if (
        element.tagName !== "INPUT" &&
        element.tagName !== "TEXTAREA" &&
        element.tagName !== "SELECT"
    ) {
        return;
    }

    // Give the mobile keyboard time to appear
    setTimeout(() => {

        element.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }, 300);

});


