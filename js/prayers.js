import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ========================================
// ELEMENTS
// ========================================

const prayerList = document.getElementById("prayerList");

const totalPrayers = document.getElementById("totalPrayers");

const pendingPrayers = document.getElementById("pendingPrayers");

const answeredPrayers = document.getElementById("answeredPrayers");

const logoutButton = document.getElementById("logoutButton");

const mobileLogoutButton = document.getElementById("mobileLogoutButton");

const currentDate = document.getElementById("currentDate");

// ========================================
// CURRENT DATE
// ========================================

if (currentDate) {
  currentDate.textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ========================================
// AUTH CHECK
// ========================================

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "./index.html";

    return;
  }

  loadMyPrayers(user.uid);
});

// ========================================
// LOAD MY PRAYERS
// ========================================

function loadMyPrayers(userId) {
  const prayerQuery = query(
    collection(db, "prayerRequests"),

    where("userId", "==", userId),

    orderBy("createdAt", "desc"),
  );

  onSnapshot(
    prayerQuery,

    (snapshot) => {
      prayerList.innerHTML = "";

      // ========================================
      // NO PRAYERS
      // ========================================

      if (snapshot.empty) {
        prayerList.innerHTML = `

                    <div class="dashboard-card text-center p-5">

                        <i
                            class="bi bi-chat-heart"
                            style="
                                font-size:3rem;
                                opacity:.5;
                            "
                        ></i>

                        <h5 class="mt-3">
                            No prayer requests yet
                        </h5>

                        <p class="text-muted mb-0">
                            Your prayer requests will appear here.
                        </p>

                    </div>

                `;

        updatePrayerStats([]);

        return;
      }

      const prayers = [];

      snapshot.forEach((docSnapshot) => {
        prayers.push({
          id: docSnapshot.id,

          ...docSnapshot.data(),
        });
      });

      updatePrayerStats(prayers);

      prayers.forEach((prayer) => {
        renderPrayer(prayer);
      });
    },

    (error) => {
      console.error("Prayer loading error:", error);

      prayerList.innerHTML = `

                <div class="alert alert-danger">

                    <i class="bi bi-exclamation-triangle me-2"></i>

                    Unable to load your prayer requests.

                </div>

            `;
    },
  );
}

// ========================================
// PRAYER STATS
// ========================================

function updatePrayerStats(prayers) {
  const total = prayers.length;

  const answered = prayers.filter((prayer) => prayer.answered === true).length;

  const pending = total - answered;

  if (totalPrayers) {
    totalPrayers.textContent = total;
  }

  if (pendingPrayers) {
    pendingPrayers.textContent = pending;
  }

  if (answeredPrayers) {
    answeredPrayers.textContent = answered;
  }
}

// ========================================
// RENDER PRAYER
// ========================================

function renderPrayer(prayer) {
  const answered = prayer.answered === true;

  const date = prayer.date || "Unknown date";

  const item = document.createElement("div");

  item.className = "dashboard-card prayer-card mb-3";

  item.innerHTML = `

        <div class="d-flex justify-content-between align-items-start gap-3">


            <div class="flex-grow-1">


                <div class="d-flex align-items-center gap-2 mb-2">

                    <span
                        class="badge rounded-pill prayer-status ${
                          answered ? "bg-success" : "bg-warning text-dark"
                        }"
                    >

                        <i
                            class="bi ${
                              answered
                                ? "bi-check-circle-fill"
                                : "bi-hourglass-split"
                            } me-1"
                        ></i>

                        ${answered ? "Answered" : "Still Praying"}

                    </span>


                    <small class="text-muted">

                        ${escapeHtml(date)}

                    </small>

                </div>


                <div class="prayer-request-content">

                    <i class="bi bi-quote me-1"></i>

                    ${escapeHtml(prayer.request || "")}

                </div>


            </div>


            <!-- CHECKBOX -->

            <div class="form-check prayer-checkbox">

                <input
                    class="form-check-input prayer-answered-checkbox"
                    type="checkbox"
                    id="prayer-${prayer.id}"
                    ${answered ? "checked" : ""}
                >

                <label
                    class="form-check-label"
                    for="prayer-${prayer.id}"
                >

                    Answered

                </label>

            </div>


        </div>

    `;

  const checkbox = item.querySelector(".prayer-answered-checkbox");

  checkbox.addEventListener("change", async () => {
    await updatePrayerStatus(prayer.id, checkbox.checked);
  });

  prayerList.appendChild(item);
}

// ========================================
// UPDATE PRAYER STATUS
// ========================================

async function updatePrayerStatus(prayerId, answered) {
  try {
    const prayerRef = doc(db, "prayerRequests", prayerId);

    await updateDoc(prayerRef, {
      answered: answered,

      answeredAt: answered ? new Date() : null,

      answeredBy: answered ? auth.currentUser.uid : null,
    });

    Swal.fire({
      icon: "success",

      title: answered
        ? "Prayer Marked as Answered! 🙏"
        : "Prayer Marked as Unanswered",

      text: answered
        ? "Praise God for His answer to your prayer!"
        : "Your prayer has been moved back to Still Praying.",

      timer: 1800,

      showConfirmButton: false,
    });
  } catch (error) {
    console.error("Prayer status update error:", error);

    Swal.fire({
      icon: "error",

      title: "Update Failed",

      text: "We couldn't update your prayer status.",

      confirmButtonColor: "#6f4e37",
    });
  }
}

// ========================================
// LOGOUT
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

    cancelButtonText: "Cancel",
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    await signOut(auth);

    window.location.href = "./index.html";
  } catch (error) {
    console.error("Logout error:", error);
  }
}

if (logoutButton) {
  logoutButton.addEventListener("click", (e) => {
    e.preventDefault();

    logout();
  });
}

if (mobileLogoutButton) {
  mobileLogoutButton.addEventListener("click", (e) => {
    e.preventDefault();

    logout();
  });
}

// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(text) {
  const div = document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}
