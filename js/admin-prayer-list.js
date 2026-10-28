import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ========================================
// ELEMENTS
// ========================================

const allPrayerCount = document.getElementById("allPrayerCount");

const activePrayerCount = document.getElementById("activePrayerCount");

const answeredPrayerCount = document.getElementById("answeredPrayerCount");

const prayerLoading = document.getElementById("prayerLoading");

const prayerRequestsList = document.getElementById("prayerRequestsList");

// ========================================
// LOGOUT ELEMENTS
// ========================================

const logoutBtn = document.getElementById("logoutBtn");

const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

// ========================================
// MOBILE SIDEBAR
// ========================================

const mobileSidebar = document.getElementById("mobileSidebar");

// ========================================
// DATA
// ========================================

let prayerRequests = [];

let devotionalPrayers = [];

let prayerRequestsLoaded = false;

let devotionalPrayersLoaded = false;

// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const div = document.createElement("div");

  div.textContent = String(value);

  return div.innerHTML;
}

// ========================================
// FORMAT DATE
// ========================================

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  try {
    // --------------------------------
    // FIRESTORE TIMESTAMP
    // --------------------------------

    if (value && typeof value.toDate === "function") {
      return value.toDate().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    // --------------------------------
    // FIRESTORE TIMESTAMP OBJECT
    // --------------------------------

    if (value && typeof value.seconds === "number") {
      return new Date(value.seconds * 1000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    // --------------------------------
    // JAVASCRIPT DATE
    // --------------------------------

    if (value instanceof Date) {
      return value.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    // --------------------------------
    // STRING DATE
    // --------------------------------

    if (typeof value === "string") {
      const date = new Date(value.includes("T") ? value : value + "T00:00:00");

      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }

      return value;
    }
  } catch (error) {
    console.error("Date formatting error:", error);
  }

  return "Unknown date";
}

// ========================================
// GET TIMESTAMP
// ========================================

function getTimestamp(value) {
  if (!value) {
    return 0;
  }

  try {
    // Firestore Timestamp

    if (typeof value.toMillis === "function") {
      return value.toMillis();
    }

    // Firestore timestamp object

    if (typeof value.seconds === "number") {
      return value.seconds * 1000;
    }

    // JavaScript Date

    if (value instanceof Date) {
      return value.getTime();
    }

    // String

    if (typeof value === "string") {
      const timestamp = new Date(value).getTime();

      return isNaN(timestamp) ? 0 : timestamp;
    }
  } catch (error) {
    console.error("Timestamp error:", error);

    return 0;
  }

  return 0;
}

// ========================================
// GET CREATED TIMESTAMP
// ========================================

function getCreatedTimestamp(prayer) {
  return getTimestamp(prayer.createdAt || prayer.updatedAt || prayer.date);
}

// ========================================
// GET PRAYER TEXT
// ========================================

function getPrayerText(prayer) {
  // ------------------------------------
  // DEVOTIONAL PRAYER
  // ------------------------------------

  if (prayer.source === "devotion") {
    return prayer.prayerText || prayer.request || "No prayer entered.";
  }

  // ------------------------------------
  // NORMAL PRAYER REQUEST
  // ------------------------------------

  return prayer.request || prayer.prayerText || "No prayer request.";
}

// ========================================
// GET SOURCE LABEL
// ========================================

function getSourceLabel(prayer) {
  if (prayer.source === "devotion") {
    return `
            <span
                class="badge rounded-pill"
                style="
                    background:#6f4e37;
                    color:white;
                    font-size:.68rem;
                "
            >
                Devotion
            </span>
        `;
  }

  return `
        <span
            class="badge rounded-pill"
            style="
                background:#eee7df;
                color:#6f4e37;
                font-size:.68rem;
            "
        >
            Prayer Request
        </span>
    `;
}

// ========================================
// GET SOURCE ICON
// ========================================

function getSourceIcon(prayer) {
  if (prayer.source === "devotion") {
    return "bi-journal-heart-fill";
  }

  return "bi-chat-heart-fill";
}

// ========================================
// SORT PRAYERS
// ========================================

function sortPrayers(prayers) {
  return prayers.sort((a, b) => {
    return getCreatedTimestamp(b) - getCreatedTimestamp(a);
  });
}

// ========================================
// SHOW LOADING
// ========================================

function showLoading() {
  if (!prayerLoading) {
    return;
  }

  prayerLoading.classList.remove("d-none");
}

// ========================================
// HIDE LOADING
// ========================================

function hideLoading() {
  if (!prayerLoading) {
    return;
  }

  prayerLoading.classList.add("d-none");
}

// ========================================
// EMPTY STATE
// ========================================

function renderEmptyState() {
  if (!prayerRequestsList) {
    return;
  }

  prayerRequestsList.innerHTML = `

        <div class="admin-prayer-empty">

            <div class="admin-prayer-empty-icon">

                <i class="bi bi-heart"></i>

            </div>

            <h4>
                No Prayer Requests
            </h4>

            <p>
                There are currently no prayer
                requests to display.
            </p>

        </div>

    `;
}

// ========================================
// ERROR STATE
// ========================================

function renderErrorState() {
  if (!prayerRequestsList) {
    return;
  }

  prayerRequestsList.innerHTML = `

        <div class="admin-prayer-error">

            <i class="bi bi-exclamation-triangle"></i>

            <h4>
                Unable to Load Prayer Requests
            </h4>

            <p>
                Something went wrong while loading
                the prayer requests. Please try again.
            </p>

        </div>

    `;
}

// ========================================
// RENDER SINGLE PRAYER
// ========================================

function renderPrayerItem(prayer) {
  const isAnswered = prayer.answered === true;

  const item = document.createElement("div");

  item.className = "admin-prayer-item";

  // ====================================
  // ANSWERED DATE
  // ====================================

  let answeredDateHtml = "";

  if (isAnswered && prayer.answeredAt) {
    answeredDateHtml = `

            <div class="admin-prayer-answered-date">

                <i class="bi bi-check-circle-fill me-1"></i>

                Answered on
                ${escapeHtml(formatDate(prayer.answeredAt))}

            </div>

        `;
  }

  // ====================================
  // STATUS
  // ====================================

  const statusHtml = isAnswered
    ? `

            <div class="admin-prayer-status answered">

                <i class="bi bi-check-circle-fill"></i>

                Answered

            </div>

        `
    : `

            <div class="admin-prayer-status active">

                <i class="bi bi-hourglass-split"></i>

                Active

            </div>

        `;

  // ====================================
  // ITEM HTML
  // ====================================

  item.innerHTML = `

        <div class="admin-prayer-item-main">

            <div class="admin-prayer-item-header">

                <div class="admin-prayer-icon">

                    <i
                        class="bi ${getSourceIcon(prayer)}"
                    ></i>

                </div>


                <div class="admin-prayer-item-label">

                    Anonymous Prayer

                </div>


                ${getSourceLabel(prayer)}

            </div>


            <p class="admin-prayer-text">

                ${escapeHtml(getPrayerText(prayer))}

            </p>


            <div class="admin-prayer-date">

                <i class="bi bi-calendar3"></i>

                ${escapeHtml(formatDate(prayer.date || prayer.createdAt))}

            </div>


            ${answeredDateHtml}

        </div>


        ${statusHtml}

    `;

  return item;
}

// ========================================
// RENDER ACTIVE SECTION
// ========================================

function renderActiveSection(prayers) {
  const section = document.createElement("div");

  section.className = "admin-prayer-status-section";

  section.innerHTML = `

        <div class="admin-prayer-section-heading">

            <h3>

                <i class="bi bi-hourglass-split"></i>

                Active Prayers

            </h3>

            <span>
                ${prayers.length}
            </span>

        </div>


        <div class="admin-prayer-section-list"></div>

    `;

  const list = section.querySelector(".admin-prayer-section-list");

  prayers.forEach((prayer) => {
    list.appendChild(renderPrayerItem(prayer));
  });

  return section;
}

// ========================================
// RENDER ANSWERED SECTION
// ========================================

function renderAnsweredSection(prayers) {
  const section = document.createElement("div");

  section.className = "admin-prayer-status-section";

  section.innerHTML = `

        <div class="admin-prayer-section-heading">

            <h3>

                <i class="bi bi-check-circle-fill"></i>

                Answered Prayers

            </h3>

            <span>
                ${prayers.length}
            </span>

        </div>


        <div class="admin-prayer-section-list"></div>

    `;

  const list = section.querySelector(".admin-prayer-section-list");

  prayers.forEach((prayer) => {
    list.appendChild(renderPrayerItem(prayer));
  });

  return section;
}

// ========================================
// RENDER ALL PRAYERS
// ========================================

function renderAllPrayers() {
  hideLoading();

  if (!prayerRequestsList) {
    return;
  }

  // ====================================
  // COMBINE BOTH SOURCES
  // ====================================

  const allPrayers = [...prayerRequests, ...devotionalPrayers];

  // ====================================
  // TOTAL COUNT
  // ====================================

  if (allPrayerCount) {
    allPrayerCount.textContent = allPrayers.length;
  }

  // ====================================
  // ACTIVE / ANSWERED
  // ====================================

  const activePrayers = [];

  const answeredPrayers = [];

  allPrayers.forEach((prayer) => {
    if (prayer.answered === true) {
      answeredPrayers.push(prayer);
    } else {
      activePrayers.push(prayer);
    }
  });

  // ====================================
  // SORT
  // ====================================

  sortPrayers(activePrayers);

  sortPrayers(answeredPrayers);

  // ====================================
  // COUNTS
  // ====================================

  if (activePrayerCount) {
    activePrayerCount.textContent = activePrayers.length;
  }

  if (answeredPrayerCount) {
    answeredPrayerCount.textContent = answeredPrayers.length;
  }

  // ====================================
  // EMPTY
  // ====================================

  if (allPrayers.length === 0) {
    renderEmptyState();

    return;
  }

  // ====================================
  // CLEAR
  // ====================================

  prayerRequestsList.innerHTML = "";

  // ====================================
  // ACTIVE
  // ====================================

  if (activePrayers.length > 0) {
    prayerRequestsList.appendChild(renderActiveSection(activePrayers));
  }

  // ====================================
  // ANSWERED
  // ====================================

  if (answeredPrayers.length > 0) {
    prayerRequestsList.appendChild(renderAnsweredSection(answeredPrayers));
  }
}

// ========================================
// LOAD PRAYER REQUESTS
// ========================================

function loadPrayerRequests() {
  showLoading();

  // ====================================
  // NORMAL PRAYER REQUESTS
  // ====================================

  const prayerRequestQuery = query(collection(db, "prayerRequests"));

  // ====================================
  // DEVOTIONAL PRAYERS
  // ====================================

  const devotionalPrayerQuery = query(collection(db, "prayers"));

  // ====================================
  // PRAYER REQUEST LISTENER
  // ====================================

  onSnapshot(
    prayerRequestQuery,

    (snapshot) => {
      prayerRequests = [];

      snapshot.forEach((docSnapshot) => {
        prayerRequests.push({
          id: docSnapshot.id,

          source: "request",

          ...docSnapshot.data(),
        });
      });

      prayerRequestsLoaded = true;

      renderWhenReady();
    },

    (error) => {
      console.error("Prayer requests error:", error);

      prayerRequests = [];

      prayerRequestsLoaded = true;

      renderWhenReady();
    },
  );

  // ====================================
  // DEVOTIONAL PRAYER LISTENER
  // ====================================

  onSnapshot(
    devotionalPrayerQuery,

    (snapshot) => {
      devotionalPrayers = [];

      snapshot.forEach((docSnapshot) => {
        devotionalPrayers.push({
          id: docSnapshot.id,

          source: "devotion",

          ...docSnapshot.data(),
        });
      });

      devotionalPrayersLoaded = true;

      renderWhenReady();
    },

    (error) => {
      console.error("Devotional prayers error:", error);

      devotionalPrayers = [];

      devotionalPrayersLoaded = true;

      renderWhenReady();
    },
  );
}

// ========================================
// RENDER WHEN BOTH ARE LOADED
// ========================================

function renderWhenReady() {
  if (!prayerRequestsLoaded || !devotionalPrayersLoaded) {
    return;
  }

  renderAllPrayers();
}

// ========================================
// MARK PRAYER AS ANSWERED
// ========================================

async function markPrayerAnswered(prayer) {
  const collectionName =
    prayer.source === "devotion" ? "prayers" : "prayerRequests";

  try {
    await updateDoc(
      doc(db, collectionName, prayer.id),

      {
        answered: true,

        answeredAt: serverTimestamp(),
      },
    );

    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "success",

        title: "Prayer Answered! 🙏",

        text: "The prayer has been marked as answered.",

        confirmButtonColor: "#6f4e37",

        timer: 1800,

        showConfirmButton: false,
      });
    }
  } catch (error) {
    console.error("Mark prayer answered error:", error);

    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "error",

        title: "Something Went Wrong",

        text: "We couldn't update this prayer.",

        confirmButtonColor: "#6f4e37",
      });
    }
  }
}

// ========================================
// AUTH STATE
// ========================================

onAuthStateChanged(
  auth,

  (user) => {
    if (!user) {
      window.location.href = "./index.html";

      return;
    }

    console.log("Admin Prayer List logged in:", user.uid);

    loadPrayerRequests();
  },
);

// ========================================
// LOGOUT
// ========================================

async function logout() {
  // ====================================
  // SWEETALERT NOT AVAILABLE
  // ====================================

  if (typeof Swal === "undefined") {
    try {
      await signOut(auth);

      window.location.href = "./index.html";
    } catch (error) {
      console.error("Logout error:", error);
    }

    return;
  }

  // ====================================
  // CONFIRM LOGOUT
  // ====================================

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

  // ====================================
  // SIGN OUT
  // ====================================

  try {
    await signOut(auth);

    await Swal.fire({
      icon: "success",

      title: "Logged Out",

      text: "You have been successfully logged out.",

      timer: 1200,

      showConfirmButton: false,
    });

    window.location.href = "./index.html";
  } catch (error) {
    console.error("Logout error:", error);

    Swal.fire({
      icon: "error",

      title: "Logout Failed",

      text: "We couldn't log you out. Please try again.",

      confirmButtonColor: "#6f4e37",
    });
  }
}

// ========================================
// DESKTOP LOGOUT
// ========================================

if (logoutBtn) {
  logoutBtn.addEventListener("click", (event) => {
    event.preventDefault();

    logout();
  });
}

// ========================================
// MOBILE LOGOUT
// ========================================

if (mobileLogoutBtn) {
  mobileLogoutBtn.addEventListener("click", (event) => {
    event.preventDefault();

    logout();
  });
}

// ========================================
// CLOSE MOBILE SIDEBAR
// AFTER NAVIGATION
// ========================================

if (mobileSidebar) {
  const mobileLinks = mobileSidebar.querySelectorAll("a.sidebar-link");

  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      // Bootstrap Offcanvas will normally
      // close automatically after navigation.
      // This simply removes focus.

      link.blur();
    });
  });
}

// ========================================
// MOBILE SIDEBAR
// ========================================
//
// Bootstrap handles:
// - Opening
// - Closing
// - Overlay
// - ESC key
// - Body scroll
//
// Therefore we DO NOT manually handle:
// .show
// .admin-sidebar
// .admin-sidebar-overlay
//
// ========================================

// ========================================
// OPTIONAL: CLOSE OFFCANVAS AFTER
// CLICKING MOBILE LOGOUT
// ========================================

function closeMobileSidebar() {
  if (!mobileSidebar || typeof bootstrap === "undefined") {
    return;
  }

  const offcanvas = bootstrap.Offcanvas.getInstance(mobileSidebar);

  if (offcanvas) {
    offcanvas.hide();
  }
}

// ========================================
// MOBILE LOGOUT WITH SIDEBAR CLOSE
// ========================================

if (mobileLogoutBtn) {
  mobileLogoutBtn.addEventListener("click", () => {
    closeMobileSidebar();
  });
}
