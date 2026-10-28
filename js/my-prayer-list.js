import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ========================================
// ELEMENTS
// ========================================

const activePrayersList = document.getElementById("activePrayersList");

const answeredPrayersList = document.getElementById("answeredPrayersList");

const activeLoading = document.getElementById("activeLoading");

const answeredLoading = document.getElementById("answeredLoading");

const activePrayerCount = document.getElementById("activePrayerCount");

const answeredPrayerCount = document.getElementById("answeredPrayerCount");

// ========================================
// LOGOUT BUTTONS
// ========================================

const logoutButton = document.getElementById("logoutButton");

const mobileLogoutButton = document.getElementById("mobileLogoutButton");

// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(text) {
  if (text === null || text === undefined) {
    return "";
  }

  const div = document.createElement("div");

  div.textContent = String(text);

  return div.innerHTML;
}

// ========================================
// LOADING
// ========================================

function showLoading() {
  if (activeLoading) {
    activeLoading.classList.remove("d-none");
  }

  if (answeredLoading) {
    answeredLoading.classList.remove("d-none");
  }
}

function hideActiveLoading() {
  if (activeLoading) {
    activeLoading.classList.add("d-none");
  }
}

function hideAnsweredLoading() {
  if (answeredLoading) {
    answeredLoading.classList.add("d-none");
  }
}

// ========================================
// EMPTY ACTIVE
// ========================================

function renderEmptyActive() {
  if (!activePrayersList) {
    return;
  }

  activePrayersList.innerHTML = `

        <div class="empty-prayer">

            <div class="prayer-empty-icon">

                <i class="bi bi-heart"></i>

            </div>

            <h5>
                No Active Prayer Requests
            </h5>

            <p>
                You don't have any active prayer
                requests right now.
            </p>

        </div>

    `;
}

// ========================================
// EMPTY ANSWERED
// ========================================

function renderEmptyAnswered() {
  if (!answeredPrayersList) {
    return;
  }

  answeredPrayersList.innerHTML = `

        <div class="empty-prayer">

            <div class="prayer-empty-icon">

                <i class="bi bi-check-circle"></i>

            </div>

            <h5>
                No Answered Prayers Yet
            </h5>

            <p>
                Keep praying and trusting God.
                Your answered prayers will appear here.
            </p>

        </div>

    `;
}

// ========================================
// FORMAT DATE
// ========================================

function formatDate(dateValue) {
  if (!dateValue) {
    return "Unknown date";
  }

  try {
    const date = new Date(dateValue + "T00:00:00");

    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    return dateValue;
  }
}

// ========================================
// GET CREATED TIME
// ========================================

function getCreatedTime(prayer) {
  if (prayer.createdAt && typeof prayer.createdAt.seconds === "number") {
    return prayer.createdAt.seconds;
  }

  return 0;
}

// ========================================
// SORT
// ========================================

function sortPrayers(prayers) {
  return prayers.sort((a, b) => {
    return getCreatedTime(b) - getCreatedTime(a);
  });
}

// ========================================
// GET PRAYER TEXT
// ========================================

function getPrayerText(prayer) {
  // ====================================
  // DEVOTIONAL PRAYER
  // ====================================

  if (prayer.source === "devotion") {
    return prayer.prayerText || "No prayer entered.";
  }

  // ====================================
  // PRAYER REQUEST
  // ====================================

  return prayer.request || "No prayer request.";
}

// ========================================
// GET PRAYER SOURCE LABEL
// ========================================

function getPrayerSourceLabel(prayer) {
  if (prayer.source === "devotion") {
    return `
            <span class="badge rounded-pill"
                style="
                    background:#6f4e37;
                    color:white;
                    font-size:.7rem;
                ">
                Devotion
            </span>
        `;
  }

  return `
        <span class="badge rounded-pill"
            style="
                background:#eee7df;
                color:#6f4e37;
                font-size:.7rem;
            ">
            Prayer Request
        </span>
    `;
}

// ========================================
// RENDER ACTIVE PRAYERS
// ========================================

function renderActivePrayers(prayers) {
  hideActiveLoading();

  if (!activePrayersList) {
    return;
  }

  if (!prayers.length) {
    if (activePrayerCount) {
      activePrayerCount.textContent = "0";
    }

    renderEmptyActive();

    return;
  }

  if (activePrayerCount) {
    activePrayerCount.textContent = prayers.length;
  }

  activePrayersList.innerHTML = "";

  prayers.forEach((prayer) => {
    const item = document.createElement("div");

    item.className = "prayer-item";

    item.innerHTML = `

                <div class="prayer-item-content">

                    <div class="prayer-request-icon">

                        <i class="bi bi-chat-heart-fill"></i>

                    </div>


                    <div class="prayer-text-wrapper">

                        <div class="mb-1">

                            ${getPrayerSourceLabel(prayer)}

                        </div>


                        <p class="prayer-text">

                            ${escapeHtml(getPrayerText(prayer))}

                        </p>


                        <small class="prayer-date">

                            <i
                                class="bi bi-calendar3 me-1"
                            ></i>

                            ${escapeHtml(formatDate(prayer.date))}

                        </small>

                    </div>

                </div>


                <div class="prayer-action">

                    <label
                        class="answered-check"
                        title="Mark as answered"
                    >

                        <input
                            type="checkbox"
                            class="answer-prayer-checkbox"
                            data-id="${prayer.id}"
                            data-source="${prayer.source}"
                        >

                        <span class="checkmark"></span>

                        <span class="check-label">
                            Answered
                        </span>

                    </label>

                </div>

            `;

    activePrayersList.appendChild(item);
  });

  // ====================================
  // CHECKBOX EVENTS
  // ====================================

  activePrayersList
    .querySelectorAll(".answer-prayer-checkbox")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", async () => {
        if (!checkbox.checked) {
          return;
        }

        const prayerId = checkbox.dataset.id;

        const source = checkbox.dataset.source;

        await markPrayerAnswered(prayerId, source, checkbox);
      });
    });
}

// ========================================
// RENDER ANSWERED
// ========================================

function renderAnsweredPrayers(prayers) {
  hideAnsweredLoading();

  if (!answeredPrayersList) {
    return;
  }

  if (!prayers.length) {
    if (answeredPrayerCount) {
      answeredPrayerCount.textContent = "0";
    }

    renderEmptyAnswered();

    return;
  }

  if (answeredPrayerCount) {
    answeredPrayerCount.textContent = prayers.length;
  }

  answeredPrayersList.innerHTML = "";

  prayers.forEach((prayer) => {
    const item = document.createElement("div");

    item.className = "prayer-item answered-prayer-item";

    let answeredDate = "Answered prayer";

    if (prayer.answeredAt) {
      try {
        const date = prayer.answeredAt.toDate();

        answeredDate = `Answered ${date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}`;
      } catch (error) {
        answeredDate = "Answered prayer";
      }
    }

    item.innerHTML = `

                <div class="prayer-item-content">

                    <div class="prayer-request-icon answered-icon">

                        <i class="bi bi-check-circle-fill"></i>

                    </div>


                    <div class="prayer-text-wrapper">

                        <div class="mb-1">

                            ${getPrayerSourceLabel(prayer)}

                        </div>


                        <p
                            class="prayer-text answered-text"
                        >

                            ${escapeHtml(getPrayerText(prayer))}

                        </p>


                        <small class="prayer-date">

                            <i
                                class="bi bi-check-circle me-1"
                            ></i>

                            ${escapeHtml(answeredDate)}

                        </small>

                    </div>

                </div>


                <div class="answered-badge">

                    <i class="bi bi-check-lg me-1"></i>

                    Answered

                </div>

            `;

    answeredPrayersList.appendChild(item);
  });
}

// ========================================
// MARK PRAYER AS ANSWERED
// ========================================

async function markPrayerAnswered(prayerId, source, checkbox) {
  try {
    checkbox.disabled = true;

    // ====================================
    // DETERMINE COLLECTION
    // ====================================

    const collectionName = source === "devotion" ? "prayers" : "prayerRequests";

    console.log("Marking prayer as answered:", {
      prayerId,
      source,
      collectionName,
    });

    // ====================================
    // UPDATE FIRESTORE
    // ====================================

    await updateDoc(doc(db, collectionName, prayerId), {
      answered: true,

      answeredAt: serverTimestamp(),
    });

    // ====================================
    // SUCCESS
    // ====================================

    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "success",

        title: "Prayer Answered! 🙏",

        text: "This prayer has been moved to your Answered Prayers.",

        confirmButtonColor: "#6f4e37",

        timer: 1800,

        showConfirmButton: false,
      });
    }
  } catch (error) {
    console.error("Mark prayer answered error:", error);

    checkbox.checked = false;

    checkbox.disabled = false;

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
// LOAD MY PRAYER LIST
// ========================================

function loadMyPrayerList(userId) {
  showLoading();

  if (!userId) {
    console.error("No user ID available.");

    return;
  }

  // ====================================
  // PRAYER REQUESTS LISTENER
  // ====================================

  const prayerRequestQuery = query(
    collection(db, "prayerRequests"),

    where("userId", "==", userId),
  );

  // ====================================
  // DEVOTIONAL PRAYERS LISTENER
  // ====================================

  const devotionalPrayerQuery = query(
    collection(db, "prayers"),

    where("userId", "==", userId),
  );

  let prayerRequests = [];

  let devotionalPrayers = [];

  let requestLoaded = false;

  let devotionalLoaded = false;

  // ====================================
  // COMBINE AND RENDER
  // ====================================

  function renderCombinedPrayers() {
    if (!requestLoaded || !devotionalLoaded) {
      return;
    }

    const allPrayers = [...prayerRequests, ...devotionalPrayers];

    const activePrayers = [];

    const answeredPrayers = [];

    allPrayers.forEach((prayer) => {
      if (prayer.answered === true) {
        answeredPrayers.push(prayer);
      } else {
        activePrayers.push(prayer);
      }
    });

    sortPrayers(activePrayers);

    sortPrayers(answeredPrayers);

    renderActivePrayers(activePrayers);

    renderAnsweredPrayers(answeredPrayers);
  }

  // ====================================
  // LISTEN PRAYER REQUESTS
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

      requestLoaded = true;

      renderCombinedPrayers();
    },

    (error) => {
      console.error("Prayer requests listener error:", error);

      requestLoaded = true;

      renderCombinedPrayers();
    },
  );

  // ====================================
  // LISTEN DEVOTIONAL PRAYERS
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

      devotionalLoaded = true;

      renderCombinedPrayers();
    },

    (error) => {
      console.error("Devotional prayers listener error:", error);

      devotionalLoaded = true;

      renderCombinedPrayers();
    },
  );
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

    console.log("Logged-in user:", user.uid);

    loadMyPrayerList(user.uid);
  },
);

// ========================================
// LOGOUT FUNCTION
// ========================================

async function logout() {
  if (typeof Swal === "undefined") {
    await signOut(auth);

    window.location.href = "./index.html";

    return;
  }

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

      text: "We couldn't log you out. Please try again.",

      confirmButtonColor: "#6f4e37",
    });
  }
}

// ========================================
// DESKTOP LOGOUT
// ========================================

if (logoutButton) {
  logoutButton.addEventListener("click", (e) => {
    e.preventDefault();

    logout();
  });
}

// ========================================
// MOBILE LOGOUT
// ========================================

if (mobileLogoutButton) {
  mobileLogoutButton.addEventListener("click", (e) => {
    e.preventDefault();

    logout();
  });
}
