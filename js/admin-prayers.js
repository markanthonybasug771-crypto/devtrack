import { auth, db } from "./firebase.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const list =
    document.getElementById(
        "prayerRequestsList"
    );

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );

const mobileLogoutBtn =
    document.getElementById(
        "mobileLogoutBtn"
    );


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function getTodayString() {

    const now = new Date();

    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).format(now);

}


async function loadPrayerRequests() {

    try {

        const today =
            getTodayString();


        const q =
            query(
                collection(
                    db,
                    "prayerRequests"
                ),
                where(
                    "date",
                    "==",
                    today
                )
            );


        const snapshot =
            await getDocs(q);


        if (snapshot.empty) {

            list.innerHTML = `

                <div class="admin-empty">

                    <i class="bi bi-chat-heart"></i>

                    <h5>
                        No prayer requests today
                    </h5>

                    <p>
                        There are currently no prayer requests for today.
                    </p>

                </div>

            `;

            return;

        }


        const requests = [];


        snapshot.forEach(docSnapshot => {

            requests.push({

                id: docSnapshot.id,

                ...docSnapshot.data()

            });

        });


        requests.sort(
            (a, b) =>
                (a.createdAt?.seconds || 0) -
                (b.createdAt?.seconds || 0)
        );


        list.innerHTML =
            requests.map(item => `

                <div class="admin-prayer-item">

                    <div class="admin-prayer-date">

                        <i class="bi bi-calendar3"></i>

                        ${escapeHTML(item.date || today)}

                    </div>

                    <p class="admin-prayer-text">

                        ${escapeHTML(item.request || "")}

                    </p>

                </div>

            `).join("");


    } catch (error) {

        console.error(
            "Prayer request error:",
            error
        );


        list.innerHTML = `

            <div class="admin-empty">

                <i class="bi bi-exclamation-triangle"></i>

                <h5>
                    Unable to load requests
                </h5>

                <p>
                    Please check your Firestore rules.
                </p>

            </div>

        `;

    }

}


async function logout() {

    await signOut(auth);

    window.location.href =
        "./index.html";

}


logoutBtn?.addEventListener(
    "click",
    e => {

        e.preventDefault();

        logout();

    }
);


mobileLogoutBtn?.addEventListener(
    "click",
    e => {

        e.preventDefault();

        logout();

    }
);


loadPrayerRequests();