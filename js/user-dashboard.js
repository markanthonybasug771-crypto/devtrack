import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  setDoc,
  deleteDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ========================================
// DOM ELEMENTS
// ========================================

const greeting = document.getElementById("greeting");

const userAvatar = document.getElementById("userAvatar");

const currentDate = document.getElementById("currentDate");

const logoutButton = document.getElementById("logoutButton");

const mobileLogoutButton = document.getElementById("mobileLogoutButton");

const myDevotionalsButtons = document.querySelectorAll(".myDevotionalsBtn");

const myDevotionalsSection = document.getElementById("myDevotionalsSection");

const totalDevotionalsEl = document.getElementById("totalDevotionals");

const monthlyDevotionalsEl = document.getElementById("monthlyDevotionals");

const currentStreakValueEl = document.getElementById("currentStreakValue");

const devotionConsistencyValueEl = document.getElementById(
  "devotionConsistencyValue",
);

const devotionConsistencyProgressEl = document.getElementById(
  "devotionConsistencyProgress",
);

const dailyQuoteEl = document.getElementById("dailyQuote");

const dailyQuoteReferenceEl = document.getElementById("dailyQuoteReference");

// ========================================
// TODAY'S DEVOTION ELEMENT
// ========================================

const todayDevotionContainer = document.getElementById(
  "todayDevotionContainer",
);

// ========================================
// PRAYER REQUEST ELEMENTS
// ========================================

const prayerRequestForm = document.getElementById("prayerRequestForm");

const prayerRequestInput = document.getElementById("prayerRequestInput");

const prayerRequestsList = document.getElementById("prayerRequestsList");

const savePrayerButton = document.getElementById("savePrayerButton");

// ========================================
// DEVOTIONAL FORM ELEMENTS
// ========================================

const devotionalForm = document.getElementById("devotionalForm");

const devotionalFormat = document.getElementById("devotionalFormat");

const devotionTitleInput = document.getElementById("devotionTitle");

const devotionalDate = document.getElementById("devotionalDate");

const soapFields = document.getElementById("soapFields");

const slapFields = document.getElementById("slapFields");

const formatDescription = document.getElementById("formatDescription");

const saveDevotionalButton = document.getElementById("saveDevotionalButton");

// Keep long-form inputs fully visible while the user writes.
function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(textarea.scrollHeight, textarea.offsetHeight)}px`;
}

document.querySelectorAll(".auto-expand-textarea").forEach((textarea) => {
  textarea.addEventListener("input", () => autoResizeTextarea(textarea));
  autoResizeTextarea(textarea);
});

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("shown.bs.modal", () => {
    modal.querySelectorAll(".auto-expand-textarea").forEach(autoResizeTextarea);
  });
});

// ========================================
// GLOBAL USER DATA
// ========================================

let currentUserData = null;

// ========================================
// FIREBASE VAPID KEY
// ========================================

const VAPID_KEY =
  "BNwoM26xnnryzuAW3kkOKdG9I-6gEdTuM2I-mSnBPHNnu7nsSQC54wJvPincrEEVQtmblCxixfY0rpCSB2N1pDI";

// ========================================
// LOCAL DATE
// IMPORTANT:
// Uses browser's local timezone instead of UTC.
// ========================================

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ========================================
// ALIAS FOR LOCAL DATE
// ========================================

function getLocalDateValue(date = new Date()) {
  return getLocalDate(date);
}

// ========================================
// CURRENT DATE DISPLAY
// ========================================

if (currentDate) {
  const today = new Date();

  currentDate.textContent = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ========================================
// MY DEVOTIONALS BUTTONS
// ========================================

if (myDevotionalsButtons.length && myDevotionalsSection) {
  myDevotionalsButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();

      myDevotionalsSection.classList.remove("d-none");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  });
}

// ========================================
// CHECK AUTHENTICATION
// ========================================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./index.html";

    return;
  }

  try {
    // ========================================
    // GET FIRESTORE PROFILE
    // ========================================

    const userDocRef = doc(db, "users", user.uid);

    const userDoc = await getDoc(userDocRef);

    // ========================================
    // PROFILE DOES NOT EXIST
    // ========================================

    if (!userDoc.exists()) {
      await signOut(auth);

      window.location.href = "./index.html";

      return;
    }

    const userData = userDoc.data();

    currentUserData = userData;

    // ========================================
    // FIRST NAME
    // ========================================

    const firstName =
      userData.firstName ||
      userData.firstname ||
      userData.first_name ||
      "there";

    // ========================================
    // GENDER
    // ========================================

    const gender = userData.gender || userData.Gender || "";

    // ========================================
    // LOAD PRAYER REQUESTS
    // ========================================

    loadPrayerRequests();

    // ========================================
    // LOAD DASHBOARD STATS
    // ========================================

    await loadDashboardStats(user.uid);

    // ========================================
    // LOAD DAILY ENCOURAGEMENT
    // ========================================

    await loadDailyEncouragement();

    // ========================================
    // LOAD TODAY'S DEVOTION
    // ========================================

    await loadTodaysDevotion(user.uid);

    // ========================================
    // BRO / SISTER
    // ========================================

    let title = "Bro.";

    if (gender === "Female" || gender === "female") {
      title = "Sis.";
    }

    // ========================================
    // GREETING
    // ========================================

    if (greeting) {
      greeting.textContent = `Hello, ${title} ${firstName}! 👋`;
    }

    // ========================================
    // AVATAR
    // ========================================

    if (userAvatar && firstName) {
      userAvatar.textContent = firstName.charAt(0).toUpperCase();
    }
  } catch (error) {
    console.error("Dashboard error:", error);
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

    cancelButtonText: "Cancel",
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

      showConfirmButton: false,
    });

    window.location.href = "./index.html";
  } catch (error) {
    console.error("Logout error:", error);

    Swal.fire({
      icon: "error",

      title: "Logout Failed",

      text: "We couldn't logout your account.",

      confirmButtonColor: "#6f4e37",
    });
  }
}

// ========================================
// DESKTOP LOGOUT
// ========================================

if (logoutButton) {
  logoutButton.addEventListener("click", (event) => {
    event.preventDefault();

    logout();
  });
}

// ========================================
// MOBILE LOGOUT
// ========================================

if (mobileLogoutButton) {
  mobileLogoutButton.addEventListener("click", (event) => {
    event.preventDefault();

    logout();
  });
}

// ========================================
// COUNT CONSECUTIVE STREAK
// ========================================

function countConsecutiveStreak(dates) {
  if (!dates.length) {
    return 0;
  }

  const uniqueDates = [...new Set(dates)].sort();

  const todayKey = getLocalDateValue();

  // ========================================
  // CURRENT STREAK ONLY COUNTS IF TODAY
  // HAS A DEVOTION
  // ========================================

  if (!uniqueDates.includes(todayKey)) {
    return 0;
  }

  let streak = 0;

  let currentDate = new Date();

  while (true) {
    const dateKey = getLocalDateValue(currentDate);

    if (uniqueDates.includes(dateKey)) {
      streak += 1;

      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ========================================
// CALCULATE DEVOTIONAL CONSISTENCY
// SAME LOGIC AS ADMIN SIDE
// ========================================

function calculateConsistency(devotionals) {
  const dates = [
    ...new Set(devotionals.map((devotion) => devotion.date).filter(Boolean)),
  ];

  // ========================================
  // NO DEVOTION YET
  // ========================================

  if (!dates.length) {
    return 0;
  }

  // ========================================
  // FIRST DEVOTION DATE
  // ========================================

  dates.sort();

  const firstDate = new Date(dates[0] + "T00:00:00");

  firstDate.setHours(0, 0, 0, 0);

  // ========================================
  // TODAY
  // ========================================

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  // ========================================
  // TRACKED DAYS
  // ========================================

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  const trackedDays = Math.max(
    1,
    Math.floor((today.getTime() - firstDate.getTime()) / millisecondsPerDay) +
      1,
  );

  // ========================================
  // CONSISTENCY
  // ========================================

  const consistency = Math.round((dates.length / trackedDays) * 100);

  return Math.min(100, Math.max(0, consistency));
}

// ========================================
// LOAD DASHBOARD STATS
// ========================================

async function loadDashboardStats(userId) {
  try {
    const devotionalsQuery = query(
      collection(db, "devotionals"),
      where("userId", "==", userId),
    );

    const snapshot = await getDocs(devotionalsQuery);

    const devotionals = [];

    snapshot.forEach((docSnapshot) => {
      devotionals.push({
        id: docSnapshot.id,

        ...docSnapshot.data(),
      });
    });

    // ========================================
    // TOTAL DEVOTIONS
    // ========================================

    const total = devotionals.length;

    // ========================================
    // CURRENT MONTH
    // ========================================

    const today = new Date();

    const currentMonth = today.getMonth() + 1;

    const currentYear = today.getFullYear();

    const monthly = devotionals.filter((item) => {
      if (!item.date) {
        return false;
      }

      const [year, month] = item.date.split("-").map(Number);

      return year === currentYear && month === currentMonth;
    }).length;

    // ========================================
    // DEVOTION DATES
    // ========================================

    const dates = devotionals
      .map((item) => item.date)
      .filter(Boolean)
      .sort();

    // ========================================
    // CURRENT STREAK
    // ========================================

    const streak = countConsecutiveStreak(dates);

    // ========================================
    // CONSISTENCY
    // ========================================

    const consistency = calculateConsistency(devotionals);

    // ========================================
    // UPDATE TOTAL
    // ========================================

    if (totalDevotionalsEl) {
      totalDevotionalsEl.textContent = total;
    }

    // ========================================
    // UPDATE MONTHLY
    // ========================================

    if (monthlyDevotionalsEl) {
      monthlyDevotionalsEl.textContent = monthly;
    }

    // ========================================
    // UPDATE STREAK
    // ========================================

    if (currentStreakValueEl) {
      currentStreakValueEl.textContent = `${streak} day${
        streak === 1 ? "" : "s"
      }`;
    }

    // ========================================
    // UPDATE CONSISTENCY
    // ========================================

    if (devotionConsistencyValueEl) {
      devotionConsistencyValueEl.textContent = `${consistency}%`;
    }

    // ========================================
    // UPDATE PROGRESS BAR
    // ========================================

    if (devotionConsistencyProgressEl) {
      devotionConsistencyProgressEl.style.width = `${consistency}%`;

      devotionConsistencyProgressEl.setAttribute("aria-valuenow", consistency);
    }
  } catch (error) {
    console.error("Dashboard stats error:", error);

    // ========================================
    // FALLBACK VALUES
    // ========================================

    if (totalDevotionalsEl) {
      totalDevotionalsEl.textContent = "0";
    }

    if (monthlyDevotionalsEl) {
      monthlyDevotionalsEl.textContent = "0";
    }

    if (currentStreakValueEl) {
      currentStreakValueEl.textContent = "0 days";
    }

    if (devotionConsistencyValueEl) {
      devotionConsistencyValueEl.textContent = "0%";
    }

    if (devotionConsistencyProgressEl) {
      devotionConsistencyProgressEl.style.width = "0%";

      devotionConsistencyProgressEl.setAttribute("aria-valuenow", "0");
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

  // ========================================
  // DEFAULT CONTENT
  // ========================================

  renderNoTodaysDevotion();

  try {
    const today = getLocalDateValue();

    // ========================================
    // LOAD USER'S DEVOTIONS
    // ========================================

    const devotionQuery = query(
      collection(db, "devotionals"),
      where("userId", "==", userId),
    );

    const snapshot = await getDocs(devotionQuery);

    // ========================================
    // FIND TODAY'S DEVOTION
    // ========================================

    const todaysDevotionDoc = snapshot.docs.find((docSnapshot) => {
      const data = docSnapshot.data();

      return data.date === today;
    });

    // ========================================
    // NO DEVOTION TODAY
    // ========================================

    if (!todaysDevotionDoc) {
      return;
    }

    // ========================================
    // GET TODAY'S DEVOTION
    // ========================================

    const devotion = {
      id: todaysDevotionDoc.id,

      ...todaysDevotionDoc.data(),
    };

    // ========================================
    // RENDER
    // ========================================

    renderTodaysDevotion(devotion);
  } catch (error) {
    console.error("Today's devotion error:", error);

    renderNoTodaysDevotion();
  }
}

// ========================================
// RENDER NO TODAY'S DEVOTION
// ========================================

function renderNoTodaysDevotion() {
  if (!todayDevotionContainer) {
    return;
  }

  todayDevotionContainer.innerHTML = `
    <div class="dashboard-card text-center p-4">

      <div class="mb-3">

        <i
          class="bi bi-journal-x"
          style="
            font-size: 2.5rem;
            opacity: .5;
          "
        ></i>

      </div>

      <h5>
        No devotion for today yet
      </h5>

    </div>
  `;
}

// ========================================
// ESCAPE DEVOTIONAL TEXT
// ========================================
//
// The CSS preserves the original line breaks
// and spacing after the text is escaped.
// ========================================

function formatDevotionalText(text) {
  if (!text) {
    return "";
  }

  let nextNumber = 1;

  // Older shared devotions may have numbered points typed on one line, e.g.
  // "First point 1. Next point". Render every numbered marker as a new
  // visible line so it never runs together with the preceding sentence.
  const normalizedText = String(text)
    .replace(/\r\n?/g, "\n")
    .replace(
      /(^|\n|[^\S\r\n]+)(\d+)\s*([.)])(?=\s)/g,
      (match, separator, currentNumber, punctuation, offset, source) => {
        const markerStart = offset + separator.length;
        const currentLine = source.slice(
          source.lastIndexOf("\n", markerStart - 1) + 1,
          markerStart,
        );

        // Keep verse labels such as "(Verse 1)" as normal text.
        const openParentheses = (currentLine.match(/\(/g) || []).length;
        const closeParentheses = (currentLine.match(/\)/g) || []).length;

        if (openParentheses > closeParentheses) {
          return match;
        }

        const lineStart = separator && separator !== "\n" ? "\n" : separator;

        return `${lineStart}${nextNumber++}${punctuation}`;
      },
    );

  const escapedText = escapeHtml(normalizedText);

  return escapedText
    .replace(/\n/g, "<br>")
    .replace(
      /(^|<br>)(\d+\s*[.)])(?=\s)/g,
      (match, separator, marker) =>
        `${separator}<strong>${marker}</strong>`,
    );
}

// ========================================
// RENDER TODAY'S DEVOTION
// ========================================

function renderTodaysDevotion(devotion) {
  if (!todayDevotionContainer) {
    return;
  }

  const format = (devotion.format || "SOAP").toUpperCase();

  const content = devotion.content || {};

  const scripture = content.scripture || "No scripture entered.";

  const observation = content.observation || "";

  const lesson = content.lesson || "";

  const application = content.application || "";

  const prayer = content.prayer || "";

  const date = devotion.date || getLocalDate();

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

        <div
          class="text-muted devotion-formatted-content"
          style="
            line-height:1.7;
            word-break:break-word;
          "
        >

          ${
            observation
              ? formatDevotionalText(observation)
              : "No observation entered."
          }

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

        <div
          class="text-muted devotion-formatted-content"
          style="
            line-height:1.7;
            word-break:break-word;
          "
        >

          ${lesson ? formatDevotionalText(lesson) : "No lesson entered."}

        </div>

      </div>
    `;
  }

  // ========================================
  // COMPLETE DEVOTION CARD
  // ========================================

  todayDevotionContainer.innerHTML = `
    <div class="dashboard-card p-4">

      <!-- HEADER -->

      <div
        class="
          d-flex
          justify-content-between
          align-items-start
          gap-3
          flex-wrap
          mb-4
        "
      >

        <div>

          <div
            class="
              d-flex
              align-items-center
              gap-2
              mb-2
            "
          >

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
            ${escapeHtml(getDevotionTitle(devotion))}
          </h4>

        </div>

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
            white-space:pre-wrap;
            word-break:break-word;
          "
        >

          ${formatDevotionalText(scripture)}

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

        <div
          class="text-muted devotion-formatted-content"
          style="
            line-height:1.7;
            word-break:break-word;
          "
        >

          ${
            application
              ? formatDevotionalText(application)
              : "No application entered."
          }

        </div>

      </div>

      <!-- PRAYER -->

      <div>

        <div class="fw-semibold mb-2">

          <i class="bi bi-heart me-2"></i>

          Prayer

        </div>

        <div
          class="text-muted devotion-formatted-content"
          style="
            line-height:1.7;
            word-break:break-word;
          "
        >

          ${prayer ? formatDevotionalText(prayer) : "No prayer entered."}

        </div>

      </div>

      <!-- SHARE BUTTON -->

      <div class="d-flex justify-content-end mt-4 pt-3 border-top">

        <button
          type="button"
          class="btn btn-outline-secondary"
          id="shareTodaysDevotion"
        >

          <i class="bi bi-share me-2"></i>

          Share

        </button>

      </div>

    </div>
  `;

  // ========================================
  // SHARE BUTTON
  // ========================================

  const shareButton = document.getElementById("shareTodaysDevotion");

  if (shareButton) {
    shareButton.addEventListener("click", () => {
      shareTodaysDevotion(devotion);
    });
  }
}

// ========================================
// SHARE TODAY'S DEVOTION
// PRAYER IS PRIVATE
// ========================================

async function shareTodaysDevotion(devotion) {
  try {
    const user = auth.currentUser;

    if (!user) {
      Swal.fire({
        icon: "error",

        title: "Not Logged In",

        text: "Please login again.",

        confirmButtonColor: "#6f4e37",
      });

      return;
    }

    const format = (devotion.format || "SOAP").toUpperCase();

    const originalContent = devotion.content || {};

    // ========================================
    // PUBLIC CONTENT ONLY
    // PRAYER IS EXCLUDED
    // ========================================

    let publicContent = {};

    if (format === "SOAP") {
      publicContent = {
        scripture: originalContent.scripture || "",

        observation: originalContent.observation || "",

        application: originalContent.application || "",
      };
    }

    if (format === "SLAP") {
      publicContent = {
        scripture: originalContent.scripture || "",

        lesson: originalContent.lesson || "",

        application: originalContent.application || "",
      };
    }

    // ========================================
    // CREATE SHARED DEVOTION
    // ========================================

    const sharedRef = await addDoc(collection(db, "sharedDevotions"), {
      userId: user.uid,

      title: getDevotionTitle(devotion),

      format: format,

      content: publicContent,

      date: devotion.date || getLocalDate(),

      createdAt: serverTimestamp(),
    });

    // ========================================
    // CREATE SHARE URL
    // ========================================

    const shareUrl = `${window.location.origin}/shared-devotion.html?id=${sharedRef.id}`;

    // ========================================
    // NATIVE SHARE
    // ========================================

    if (navigator.share) {
      await navigator.share({
        title: "My Today's Devotion",

        text: "🙏 My Today's Devotion",

        url: shareUrl,
      });

      return;
    }

    // ========================================
    // FALLBACK COPY LINK
    // ========================================

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);

      Swal.fire({
        icon: "success",

        title: "Share Link Copied!",

        text: "Your devotion link has been copied. You can now share it on Facebook, Messenger, or other apps.",

        confirmButtonColor: "#6f4e37",
      });

      return;
    }

    // ========================================
    // CLIPBOARD FALLBACK
    // ========================================

    const temporaryInput = document.createElement("input");

    temporaryInput.value = shareUrl;

    document.body.appendChild(temporaryInput);

    temporaryInput.select();

    document.execCommand("copy");

    temporaryInput.remove();

    Swal.fire({
      icon: "success",

      title: "Share Link Copied!",

      text: "Your devotion link has been copied. You can now share it.",

      confirmButtonColor: "#6f4e37",
    });
  } catch (error) {
    console.error("Share devotion error:", error);

    // ========================================
    // USER CANCELLED SHARE
    // ========================================

    if (error.name === "AbortError") {
      return;
    }

    Swal.fire({
      icon: "error",

      title: "Unable to Share",

      text: "We couldn't create your devotion sharing link.",

      confirmButtonColor: "#6f4e37",
    });
  }
}

// ========================================
// LOAD USER PROFILE
// ========================================

async function loadUserProfile(user) {
  try {
    const userDocRef = doc(db, "users", user.uid);

    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return null;
    }

    return userDoc.data();
  } catch (error) {
    console.error("Load user profile error:", error);

    return null;
  }
}

/// ========================================
// PRAYER REQUEST REACTION VARIABLES
// ========================================

const prayerReactionUnsubscribers = [];

const prayerReactionProcessing = new Set();

const prayerReactionTypes = {
  love: "❤️",
  praying: "🙏",
  amen: "🤍",
  support: "🫶",
};

// ========================================
// LOAD TODAY'S PRAYER REQUESTS
// ========================================

function loadPrayerRequests() {
  if (!prayerRequestsList) {
    return;
  }

  // ========================================
  // REMOVE OLD REACTION LISTENERS
  // ========================================

  prayerReactionUnsubscribers.forEach((unsubscribe) => {
    if (typeof unsubscribe === "function") {
      unsubscribe();
    }
  });

  prayerReactionUnsubscribers.length = 0;

  // ========================================
  // TODAY
  // ========================================

  const todayDate = getLocalDate();

  const prayerQuery = query(
    collection(db, "prayerRequests"),
    where("date", "==", todayDate),
  );

  // ========================================
  // LISTEN FOR PRAYER REQUESTS
  // ========================================

  onSnapshot(
    prayerQuery,
    (snapshot) => {
      prayerRequestsList.innerHTML = "";

      // ========================================
      // EMPTY
      // ========================================

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

      // ========================================
      // GET REQUESTS
      // ========================================

      snapshot.forEach((docSnapshot) => {
        const prayer = docSnapshot.data();

        requests.push({
          id: docSnapshot.id,

          ...prayer,
        });
      });

      // ========================================
      // SORT BY CREATED TIME
      // ========================================

      requests.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;

        const timeB = b.createdAt?.seconds || 0;

        return timeA - timeB;
      });

      // ========================================
      // LIST CONTAINER
      // ========================================

      const listContainer = document.createElement("div");

      listContainer.className = "prayer-list";

      // ========================================
      // RENDER REQUESTS
      // ========================================

      requests.forEach((prayer) => {
        const item = document.createElement("div");

        item.className = "prayer-bullet-item prayer-request-item";

        item.innerHTML = `
          <span class="prayer-bullet">
            •
          </span>

          <div class="prayer-request-content">

            <p class="prayer-text">
              ${escapeHtml(prayer.request || "")}
            </p>

            <div
              class="prayer-reactions"
              data-prayer-id="${escapeHtml(prayer.id)}"
            >

              <div class="prayer-reactions-loading">

                <span
                  class="spinner-border spinner-border-sm"
                ></span>

              </div>

            </div>

          </div>
        `;

        listContainer.appendChild(item);

        // ========================================
        // REACTION CONTAINER
        // ========================================

        const reactionContainer = item.querySelector(".prayer-reactions");

        if (reactionContainer) {
          setupPrayerReactionButtons(prayer.id, reactionContainer);

          listenToPrayerReactions(prayer.id, reactionContainer);
        }
      });

      prayerRequestsList.appendChild(listContainer);
    },
    (error) => {
      console.error("Prayer request loading error:", error);

      prayerRequestsList.innerHTML = `
        <div class="empty-prayer">

          <i class="bi bi-exclamation-circle"></i>

          <p>
            Unable to load prayer requests.
          </p>

        </div>
      `;
    },
  );
}

// ========================================
// SETUP PRAYER REACTION BUTTONS
// ========================================

function setupPrayerReactionButtons(prayerId, reactionContainer) {
  if (!reactionContainer) {
    return;
  }

  if (reactionContainer._prayerReactionClickHandler) {
    reactionContainer.removeEventListener(
      "click",
      reactionContainer._prayerReactionClickHandler,
    );
  }

  const handleReactionClick = async (event) => {
    const button = event.target.closest(".prayer-reaction-btn");

    if (!button || !reactionContainer.contains(button)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const reactionType = button.dataset.reaction;

    if (!reactionType) {
      return;
    }

    await togglePrayerReaction(prayerId, reactionType, button);
  };

  reactionContainer._prayerReactionClickHandler = handleReactionClick;

  reactionContainer.addEventListener("click", handleReactionClick);
}

// ========================================
// LISTEN TO PRAYER REACTIONS
// ========================================

function listenToPrayerReactions(prayerId, reactionContainer) {
  const reactionsRef = collection(db, "prayerRequests", prayerId, "reactions");

  const unsubscribe = onSnapshot(
    reactionsRef,
    (snapshot) => {
      const counts = {
        love: 0,
        praying: 0,
        amen: 0,
        support: 0,
      };

      let currentUserReaction = null;

      snapshot.forEach((reactionDoc) => {
        const reactionData = reactionDoc.data();

        const reaction = reactionData.reaction;

        if (Object.prototype.hasOwnProperty.call(counts, reaction)) {
          counts[reaction]++;
        }

        if (auth.currentUser && reactionDoc.id === auth.currentUser.uid) {
          currentUserReaction = reaction;
        }
      });

      reactionContainer.dataset.currentReaction = currentUserReaction || "";
      renderPrayerReactions(reactionContainer, counts, currentUserReaction);
    },
    (error) => {
      console.error("Prayer reaction loading error:", error);

      reactionContainer.innerHTML = `
        <div class="prayer-reactions-error">
          Unable to load reactions.
        </div>
      `;
    },
  );

  prayerReactionUnsubscribers.push(unsubscribe);
}

// ========================================
// RENDER PRAYER REACTIONS
// ========================================

function renderPrayerReactions(reactionContainer, counts, currentUserReaction) {
  reactionContainer.innerHTML = `
    <div class="prayer-reaction-buttons">

      <!-- LOVE -->

      <button
        type="button"
        class="prayer-reaction-btn ${
          currentUserReaction === "love" ? "active" : ""
        }"
        data-reaction="love"
        aria-label="Love"
        title="Love"
        aria-pressed="${currentUserReaction === "love"}"
      >

        <span class="reaction-emoji">
          ❤️
        </span>

        <span class="reaction-count">
          ${counts.love}
        </span>

      </button>


      <!-- PRAYING -->

      <button
        type="button"
        class="prayer-reaction-btn ${
          currentUserReaction === "praying" ? "active" : ""
        }"
        data-reaction="praying"
        aria-label="Praying"
        title="Praying"
        aria-pressed="${currentUserReaction === "praying"}"
      >

        <span class="reaction-emoji">
          🙏
        </span>

        <span class="reaction-count">
          ${counts.praying}
        </span>

      </button>


      <!-- AMEN -->

      <button
        type="button"
        class="prayer-reaction-btn ${
          currentUserReaction === "amen" ? "active" : ""
        }"
        data-reaction="amen"
        aria-label="Amen"
        title="Amen"
        aria-pressed="${currentUserReaction === "amen"}"
      >

        <span class="reaction-emoji">
          🤍
        </span>

        <span class="reaction-count">
          ${counts.amen}
        </span>

      </button>


      <!-- SUPPORT -->

      <button
        type="button"
        class="prayer-reaction-btn ${
          currentUserReaction === "support" ? "active" : ""
        }"
        data-reaction="support"
        aria-label="Support"
        title="Support"
        aria-pressed="${currentUserReaction === "support"}"
      >

        <span class="reaction-emoji">
          🫶
        </span>

        <span class="reaction-count">
          ${counts.support}
        </span>

      </button>

    </div>
  `;
}

// ========================================
// TOGGLE PRAYER REACTION
// ========================================

async function togglePrayerReaction(
  prayerId,
  reactionType,
  clickedButton = null,
) {
  const user = auth.currentUser;

  // ========================================
  // USER CHECK
  // ========================================

  if (!user) {
    if (typeof Swal !== "undefined") {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "Please login again.",
        showConfirmButton: false,
        timer: 1800,
      });
    }

    return;
  }

  if (!Object.prototype.hasOwnProperty.call(prayerReactionTypes, reactionType)) {
    return;
  }

  // ========================================
  // PREVENT DOUBLE CLICK
  // ========================================

  const processingKey = `${prayerId}_${user.uid}`;

  if (prayerReactionProcessing.has(processingKey)) {
    return;
  }

  prayerReactionProcessing.add(processingKey);

  if (clickedButton) {
    clickedButton.disabled = true;
  }

  try {
    // ========================================
    // USER REACTION DOCUMENT
    // ========================================

    const reactionRef = doc(
      db,
      "prayerRequests",
      prayerId,
      "reactions",
      user.uid,
    );

    const reactionContainer =
      clickedButton?.closest(".prayer-reactions") ||
      document.querySelector(
        `.prayer-reactions[data-prayer-id="${CSS.escape(prayerId)}"]`,
      );

    const currentReaction =
      reactionContainer?.dataset.currentReaction || "";

    if (currentReaction === reactionType) {
      await deleteDoc(reactionRef);

      return;
    }

    await setDoc(
      reactionRef,
      {
        reaction: reactionType,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

  } catch (error) {
    console.error("Prayer reaction error:", error);

    if (typeof Swal !== "undefined") {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Unable to update reaction.",
        text: error?.message || "Please try again.",
        showConfirmButton: false,
        timer: 2200,
      });
    }
  } finally {
    prayerReactionProcessing.delete(processingKey);

    if (clickedButton) {
      clickedButton.disabled = false;
    }
  }
}

// ========================================
// SAVE PRAYER REQUEST
// ========================================

if (prayerRequestForm) {
  prayerRequestForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const request = prayerRequestInput ? prayerRequestInput.value.trim() : "";

    // ========================================
    // EMPTY REQUEST
    // ========================================

    if (!request) {
      Swal.fire({
        icon: "warning",

        title: "Empty Request",

        text: "Please enter your prayer request.",

        confirmButtonColor: "#6f4e37",
      });

      return;
    }

    // ========================================
    // USER DATA CHECK
    // ========================================

    if (!currentUserData) {
      Swal.fire({
        icon: "error",

        title: "User Error",

        text: "Your account information could not be loaded.",

        confirmButtonColor: "#6f4e37",
      });

      return;
    }

    // ========================================
    // CHECK CURRENT USER
    // ========================================

    const user = auth.currentUser;

    if (!user) {
      Swal.fire({
        icon: "error",

        title: "Not Logged In",

        text: "Please login again.",

        confirmButtonColor: "#6f4e37",
      });

      return;
    }

    // ========================================
    // DISABLE BUTTON
    // ========================================

    if (savePrayerButton) {
      savePrayerButton.disabled = true;

      savePrayerButton.innerHTML = `
          <span
            class="spinner-border spinner-border-sm me-1">
          </span>

          Saving...
        `;
    }

    try {
      // ========================================
      // TODAY
      // ========================================

      const todayDate = getLocalDate();

      // ========================================
      // FULL NAME
      // ========================================

      const firstName =
        currentUserData.firstName || currentUserData.firstname || "";

      const lastName =
        currentUserData.lastName || currentUserData.lastname || "";

      const fullName = `${firstName} ${lastName}`.trim();

      // ========================================
      // SAVE PRAYER REQUEST
      // ========================================

      await addDoc(collection(db, "prayerRequests"), {
        userId: user.uid,

        userName: fullName,

        role: currentUserData.role || "user",

        request: request,

        date: todayDate,

        createdAt: serverTimestamp(),
      });

      // ========================================
      // RESET FORM
      // ========================================

      prayerRequestForm.reset();

      // ========================================
      // CLOSE MODAL
      // ========================================

      const modalElement = document.getElementById("prayerRequestModal");

      if (modalElement && typeof bootstrap !== "undefined") {
        const modal = bootstrap.Modal.getInstance(modalElement);

        if (modal) {
          modal.hide();
        }
      }

      // ========================================
      // SUCCESS
      // ========================================

      Swal.fire({
        icon: "success",

        title: "Prayer Request Added!",

        text: "Your prayer request has been shared with the team.",

        timer: 1800,

        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Save prayer request error:", error);

      Swal.fire({
        icon: "error",

        title: "Something Went Wrong",

        text: "We couldn't save your prayer request.",

        confirmButtonColor: "#6f4e37",
      });
    } finally {
      // ========================================
      // ENABLE BUTTON
      // ========================================

      if (savePrayerButton) {
        savePrayerButton.disabled = false;

        savePrayerButton.innerHTML = `
            <i class="bi bi-send me-1"></i>
            Submit Request
          `;
      }
    }
  });
}

// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(text) {
  const div = document.createElement("div");

  div.textContent = String(text ?? "");

  return div.innerHTML;
}

function getDevotionTitle(devotion) {
  return devotion?.title || devotion?.content?.title || "Untitled Devotion";
}

// ========================================
// SET TODAY'S DEVOTIONAL DATE
// ========================================

if (devotionalDate) {
  devotionalDate.value = getLocalDate();
}

// ========================================
// FORMAT SELECTION
// ========================================

function updateDevotionalFormat() {
  if (!devotionalFormat) {
    return;
  }

  const format = devotionalFormat.value;

  // ========================================
  // HIDE BOTH
  // ========================================

  if (soapFields) {
    soapFields.classList.add("d-none");
  }

  if (slapFields) {
    slapFields.classList.add("d-none");
  }

  if (formatDescription) {
    formatDescription.classList.add("d-none");
  }

  // ========================================
  // SOAP
  // ========================================

  if (format === "SOAP") {
    if (soapFields) {
      soapFields.classList.remove("d-none");
    }

    if (formatDescription) {
      formatDescription.classList.remove("d-none");

      formatDescription.innerHTML = `
        <strong>SOAP</strong><br>
        Scripture, Observation,
        Application, and Prayer.
      `;
    }
  }

  // ========================================
  // SLAP
  // ========================================

  if (format === "SLAP") {
    if (slapFields) {
      slapFields.classList.remove("d-none");
    }

    if (formatDescription) {
      formatDescription.classList.remove("d-none");

      formatDescription.innerHTML = `
        <strong>SLAP</strong><br>
        Scripture, Lesson,
        Application, and Prayer.
      `;
    }
  }
}

if (devotionalFormat) {
  devotionalFormat.addEventListener("change", updateDevotionalFormat);

  // ========================================
  // INITIAL FORMAT
  // ========================================

  updateDevotionalFormat();
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
    .map((line) => line.trim())
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
    // ========================================
    // NEW PRAYER POINT
    // ========================================

    if (listMarkerRegex.test(line)) {
      // Save previous prayer
      if (currentPrayer.trim()) {
        prayers.push(currentPrayer.trim());
      }

      // Remove marker
      currentPrayer = line.replace(listMarkerRegex, "").trim();
    } else {
      // ========================================
      // CONTINUATION
      // ========================================

      if (currentPrayer) {
        currentPrayer += " " + line;
      } else {
        // ========================================
        // FIRST LINE WITHOUT BULLET
        // ========================================

        currentPrayer = line;
      }
    }
  });

  // ========================================
  // SAVE LAST PRAYER
  // ========================================

  if (currentPrayer.trim()) {
    prayers.push(currentPrayer.trim());
  }

  return prayers.filter((prayer) => prayer.length > 0);
}

// ========================================
// HELPER TO GET FIELD VALUE
// ========================================

function getInputValue(id) {
  const element = document.getElementById(id);

  if (!element) {
    return "";
  }

  return element.value.trim();
}

// ========================================
// SUBMIT DEVOTIONAL
// ========================================

if (devotionalForm) {
  devotionalForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // ========================================
    // CURRENT USER
    // ========================================

    const user = auth.currentUser;

    if (!user) {
      Swal.fire({
        icon: "error",

        title: "Not Logged In",

        text: "Please login again.",

        confirmButtonColor: "#6f4e37",
      });

      return;
    }

    // ========================================
    // FORMAT
    // ========================================

    const format = devotionalFormat ? devotionalFormat.value : "";

    const title = getInputValue("devotionTitle");

    if (!format) {
      Swal.fire({
        icon: "warning",

        title: "Choose a Format",

        text: "Please select SOAP or SLAP.",

        confirmButtonColor: "#6f4e37",
      });

      return;
    }

    if (!title) {
      Swal.fire({
        icon: "warning",
        title: "Title Required",
        text: "Please enter a title for your devotion.",
        confirmButtonColor: "#6f4e37",
      });

      return;
    }

    // ========================================
    // ALWAYS USE TODAY
    // ========================================

    const today = getLocalDate();

    // ========================================
    // CHECK IF ALREADY SUBMITTED TODAY
    // ========================================

    try {
      const existingQuery = query(
        collection(db, "devotionals"),
        where("userId", "==", user.uid),
        where("date", "==", today),
      );

      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        Swal.fire({
          icon: "info",

          title: "Already Submitted",

          text: "You have already submitted your devotional for today.",

          confirmButtonColor: "#6f4e37",
        });

        return;
      }

      let content = {};

      // ========================================
      // SOAP
      // ========================================

      if (format === "SOAP") {
        const scripture = getInputValue("soapScripture");

        const observation = getInputValue("soapObservation");

        const application = getInputValue("soapApplication");

        const prayer = getInputValue("soapPrayer");

        // ========================================
        // VALIDATE SOAP
        // ========================================

        if (!scripture || !observation || !application || !prayer) {
          Swal.fire({
            icon: "warning",

            title: "Incomplete Devotional",

            text: "Please complete all SOAP sections.",

            confirmButtonColor: "#6f4e37",
          });

          return;
        }

        content = {
          scripture,

          observation,

          application,

          prayer,
        };
      }

      // ========================================
      // SLAP
      // ========================================

      if (format === "SLAP") {
        const scripture = getInputValue("slapScripture");

        const lesson = getInputValue("slapLesson");

        const application = getInputValue("slapApplication");

        const prayer = getInputValue("slapPrayer");

        // ========================================
        // VALIDATE SLAP
        // ========================================

        if (!scripture || !lesson || !application || !prayer) {
          Swal.fire({
            icon: "warning",

            title: "Incomplete Devotional",

            text: "Please complete all SLAP sections.",

            confirmButtonColor: "#6f4e37",
          });

          return;
        }

        content = {
          scripture,

          lesson,

          application,

          prayer,
        };
      }

      // ========================================
      // CHECK SAVE BUTTON
      // ========================================

      if (saveDevotionalButton) {
        saveDevotionalButton.disabled = true;

        saveDevotionalButton.innerHTML = `
            <span
              class="spinner-border spinner-border-sm me-1">
            </span>

            Saving...
          `;
      }

      // ========================================
      // SAVE DEVOTIONAL TO FIRESTORE
      // ========================================

      const devotionRef = await addDoc(collection(db, "devotionals"), {
        userId: user.uid,

        date: today,

        format: format,

          title: title,

        content: content,

        checked: false,

        checkedBy: null,

        checkedAt: null,

        createdAt: serverTimestamp(),
      });

      // ========================================
      // SAVE PRAYER POINTS
      // ========================================

      const prayerText = content.prayer || "";

      const prayerPoints = parsePrayerPoints(prayerText);

      for (const prayerPoint of prayerPoints) {
        await addDoc(collection(db, "prayers"), {
          userId: user.uid,

          devotionId: devotionRef.id,

          prayerText: prayerPoint,

          date: today,

          answered: false,

          answeredAt: null,

          createdAt: serverTimestamp(),
        });
      }

      // ========================================
      // REFRESH DASHBOARD STATS
      // ========================================

      await loadDashboardStats(user.uid);

      // ========================================
      // REFRESH TODAY'S DEVOTION
      // ========================================

      await loadTodaysDevotion(user.uid);

      // ========================================
      // RESET FORM
      // ========================================

      devotionalForm.reset();

      if (devotionalDate) {
        devotionalDate.value = getLocalDate();
      }

      if (soapFields) {
        soapFields.classList.add("d-none");
      }

      if (slapFields) {
        slapFields.classList.add("d-none");
      }

      if (formatDescription) {
        formatDescription.classList.add("d-none");
      }

      // ========================================
      // CLOSE MODAL
      // ========================================

      const modalElement = document.getElementById("devotionalModal");

      if (modalElement && typeof bootstrap !== "undefined") {
        const modal = bootstrap.Modal.getInstance(modalElement);

        if (modal) {
          modal.hide();
        }
      }

      // ========================================
      // SUCCESS
      // ========================================

      Swal.fire({
        icon: "success",

        title: "Devotional Submitted!",

        text: "Your devotional for today has been recorded.",

        confirmButtonColor: "#6f4e37",
      });
    } catch (error) {
      console.error("Devotional error:", error);

      Swal.fire({
        icon: "error",

        title: "Something Went Wrong",

        text: "We couldn't save your devotional.",

        confirmButtonColor: "#6f4e37",
      });
    } finally {
      // ========================================
      // ENABLE BUTTON AGAIN
      // ========================================

      if (saveDevotionalButton) {
        saveDevotionalButton.disabled = false;

        saveDevotionalButton.innerHTML = `
            <i class="bi bi-check-lg me-1"></i>
            Submit Devotional
          `;
      }
    }
  });
}

// ========================================
// MOBILE KEYBOARD INPUT FIX
// ========================================

document.addEventListener("focusin", (event) => {
  const element = event.target;

  if (
    !element ||
    (element.tagName !== "INPUT" &&
      element.tagName !== "TEXTAREA" &&
      element.tagName !== "SELECT")
  ) {
    return;
  }

  // ========================================
  // GIVE MOBILE KEYBOARD TIME TO APPEAR
  // ========================================

  setTimeout(() => {
    try {
      element.scrollIntoView({
        behavior: "smooth",

        block: "center",
      });
    } catch (error) {
      console.warn("Mobile input scroll error:", error);
    }
  }, 300);
});

// ========================================
// DAILY ENCOURAGEMENT
// LOAD FROM FIRESTORE
// ========================================

async function loadDailyEncouragement() {
  if (!dailyQuoteEl && !dailyQuoteReferenceEl) {
    return;
  }

  try {
    // ========================================
    // FIRESTORE REFERENCE
    // Same document used by Admin Settings
    // ========================================

    const encouragementRef = doc(db, "settings", "dailyEncouragement");

    // ========================================
    // GET ENCOURAGEMENT
    // ========================================

    const snapshot = await getDoc(encouragementRef);

    // ========================================
    // NO DATA
    // ========================================

    if (!snapshot.exists()) {
      if (dailyQuoteEl) {
        dailyQuoteEl.textContent =
          "No encouragement has been set for today yet.";
      }

      if (dailyQuoteReferenceEl) {
        dailyQuoteReferenceEl.textContent = "";
      }

      return;
    }

    // ========================================
    // GET DATA
    // ========================================

    const data = snapshot.data();

    const message = data.message || "";

    const reference = data.reference || "";

    // ========================================
    // DISPLAY MESSAGE
    // ========================================

    if (dailyQuoteEl) {
      dailyQuoteEl.textContent = message;
    }

    // ========================================
    // DISPLAY BIBLE REFERENCE
    // ========================================

    if (dailyQuoteReferenceEl) {
      dailyQuoteReferenceEl.textContent = reference;
    }
  } catch (error) {
    console.error("Load daily encouragement error:", error);

    // ========================================
    // FALLBACK
    // ========================================

    if (dailyQuoteEl) {
      dailyQuoteEl.textContent = "Unable to load today's encouragement.";
    }

    if (dailyQuoteReferenceEl) {
      dailyQuoteReferenceEl.textContent = "";
    }
  }
}
