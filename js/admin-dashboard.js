import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ========================================
// ELEMENTS
// ========================================

const totalUsers = document.getElementById("totalUsers");

const totalDevotions = document.getElementById("totalDevotions");

const pendingDevotions = document.getElementById("pendingDevotions");

const checkedDevotions = document.getElementById("checkedDevotions");

const todayDevotionsContainer = document.getElementById(
  "todayDevotionsContainer",
);

const logoutBtn = document.getElementById("logoutBtn");

const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");
// ========================================
// MODAL ELEMENTS
// ========================================

const modalElement = document.getElementById("adminViewDevotionModal");

const modal = modalElement ? new bootstrap.Modal(modalElement) : null;

const modalTitle = document.getElementById("adminViewDevotionTitle");

const modalDate = document.getElementById("adminViewDevotionDate");

const modalStatus = document.getElementById("adminViewDevotionStatus");

const modalFormat = document.getElementById("adminViewDevotionFormat");

const modalScripture = document.getElementById("adminViewScripture");

const modalObservation = document.getElementById("adminViewObservation");

const modalObservationSection = document.getElementById(
  "adminViewObservationSection",
);

const modalLesson = document.getElementById("adminViewLesson");

const modalLessonSection = document.getElementById("adminViewLessonSection");

const modalApplication = document.getElementById("adminViewApplication");

const modalPrayer = document.getElementById("adminViewPrayer");

// ========================================
// DATA
// ========================================

let allDevotions = [];

// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {
  if (value === null || value === undefined) {
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

function isChecked(item) {
  return (
    item.checked === true ||
    item.reviewed === true ||
    item.isChecked === true ||
    item.status === "checked" ||
    item.status === "Checked"
  );
}

// ========================================
// TODAY
// ========================================

function getTodayString() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ========================================
// LOAD DASHBOARD
// ========================================

async function loadDashboard() {
  try {
    // ------------------------------
    // USERS
    // ------------------------------

    const usersSnapshot = await getDocs(collection(db, "users"));

    if (totalUsers) {
      totalUsers.textContent = usersSnapshot.size;
    }

    // ------------------------------
    // DEVOTIONS
    // ------------------------------

    const devotionSnapshot = await getDocs(collection(db, "devotionals"));

    allDevotions = [];

    devotionSnapshot.forEach((docSnapshot) => {
      allDevotions.push({
        id: docSnapshot.id,

        ...docSnapshot.data(),
      });
    });

    // ------------------------------
    // STATISTICS
    // ------------------------------

    const checkedCount = allDevotions.filter((item) => isChecked(item)).length;

    const pendingCount = allDevotions.length - checkedCount;

    if (totalDevotions) {
      totalDevotions.textContent = allDevotions.length;
    }

    if (checkedDevotions) {
      checkedDevotions.textContent = checkedCount;
    }

    if (pendingDevotions) {
      pendingDevotions.textContent = pendingCount;
    }

    // ------------------------------
    // TODAY
    // ------------------------------

    renderTodayDevotions();
  } catch (error) {
    console.error("Failed to load admin dashboard:", error);

    if (todayDevotionsContainer) {
      todayDevotionsContainer.innerHTML = `

                <div class="text-center py-5">

                    <i
                        class="bi bi-exclamation-triangle-fill
                               text-warning"
                        style="font-size: 2rem;"
                    ></i>

                    <p class="text-muted mt-3">
                        Unable to load dashboard data.
                    </p>

                </div>

            `;
    }
  }
}

// ========================================
// RENDER TODAY'S DEVOTIONS
// ========================================

function renderTodayDevotions() {
  if (!todayDevotionsContainer) {
    return;
  }

  const today = getTodayString();

  const todayItems = allDevotions.filter((item) => item.date === today);

  if (!todayItems.length) {
    todayDevotionsContainer.innerHTML = `

            <div class="text-center py-5">

                <i
                    class="bi bi-journal-x text-muted"
                    style="font-size: 2rem;"
                ></i>

                <p class="text-muted mt-3 mb-0">

                    No devotional submissions
                    for today yet.

                </p>

            </div>

        `;

    return;
  }

  todayItems.sort(
    (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
  );

  todayDevotionsContainer.innerHTML = todayItems
    .map((item) => createDevotionRow(item))
    .join("");

  attachDevotionEvents();
}

// ========================================
// CREATE DEVOTION ROW
// ========================================

function createDevotionRow(item) {
  const checked = isChecked(item);

  const format = (item.format || "SOAP").toUpperCase();

  const date = item.date || "Unknown date";

  const userName = item.userName || item.fullName || "Music Team Member";

  return `

        <div
            class="admin-devotion-row"
            data-id="${escapeHTML(item.id)}"
        >


            <div class="admin-devotion-info">

                <p class="admin-devotion-name">

                  ${escapeHTML(item.title || "Untitled Devotion")}

                </p>


                <p class="admin-devotion-meta">

                    ${escapeHTML(format)}

                    •

                    ${escapeHTML(userName)}

                    •
                    
                    ${escapeHTML(date)}

                </p>

            </div>


            <div class="admin-devotion-actions">


                <!-- VIEW -->

                <button
                    type="button"
                    class="btn btn-sm
                           btn-outline-secondary
                           admin-view-btn
                           view-devotion-btn"
                    data-id="${escapeHTML(item.id)}"
                >

                    <i class="bi bi-eye"></i>

                    View

                </button>


                <!-- CHECK -->

                <div class="admin-check-wrapper">

                    <input
                        type="checkbox"
                        class="devotion-check"
                        id="check-${escapeHTML(item.id)}"
                        data-id="${escapeHTML(item.id)}"
                        ${checked ? "checked" : ""}
                    >


                    <label
                        for="check-${escapeHTML(item.id)}"
                    >

                        Checked

                    </label>

                </div>

            </div>

        </div>

    `;
}

// ========================================
// ATTACH EVENTS
// ========================================

function attachDevotionEvents() {
  // ------------------------------------
  // VIEW BUTTON
  // ------------------------------------

  document.querySelectorAll(".view-devotion-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;

      const devotion = allDevotions.find((item) => item.id === id);

      if (devotion) {
        openDevotionModal(devotion);
      }
    });
  });

  // ------------------------------------
  // CHECKBOX
  // ------------------------------------

  document.querySelectorAll(".devotion-check").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      updateDevotionStatus(checkbox.dataset.id, checkbox.checked);
    });
  });
}

// ========================================
// UPDATE DEVOTION STATUS
// ========================================

async function updateDevotionStatus(devotionId, checked) {
  const checkbox = document.querySelector(
    `.devotion-check[data-id="${devotionId}"]`,
  );

  if (checkbox) {
    checkbox.disabled = true;
  }

  try {
    await updateDoc(
      doc(db, "devotionals", devotionId),

      {
        checked: checked,
      },
    );

    // Update local data

    const devotion = allDevotions.find((item) => item.id === devotionId);

    if (devotion) {
      devotion.checked = checked;
    }

    // Update statistics

    const checkedCount = allDevotions.filter((item) => isChecked(item)).length;

    const pendingCount = allDevotions.length - checkedCount;

    if (checkedDevotions) {
      checkedDevotions.textContent = checkedCount;
    }

    if (pendingDevotions) {
      pendingDevotions.textContent = pendingCount;
    }

    // Success notification

    Swal.fire({
      icon: "success",

      title: checked ? "Devotion Checked" : "Check Removed",

      text: checked
        ? "The devotion has been marked as checked."
        : "The devotion is now marked as pending.",

      timer: 1500,

      showConfirmButton: false,
    });
  } catch (error) {
    console.error("Failed to update devotion:", error);

    // Restore checkbox

    if (checkbox) {
      checkbox.checked = !checked;
    }

    Swal.fire({
      icon: "error",

      title: "Something went wrong",

      text: "Unable to update the devotion status.",
    });
  } finally {
    if (checkbox) {
      checkbox.disabled = false;
    }
  }
}

// ========================================
// VIEW DEVOTION MODAL
// ========================================

function openDevotionModal(item) {
  const format = (item.format || "SOAP").toUpperCase();

  const content = item.content || {};

  const date = item.date || "Unknown date";

  // ------------------------------------
  // BASIC INFO
  // ------------------------------------

  if (modalTitle) {
    modalTitle.textContent = item.title || "Untitled Devotion";
  }

  if (modalDate) {
    modalDate.textContent = `${item.userName || item.fullName || "Music Team Member"} • ${date}`;
  }

  if (modalFormat) {
    modalFormat.textContent = format;
  }

  // ------------------------------------
  // STATUS
  // ------------------------------------

  if (modalStatus) {
    if (isChecked(item)) {
      modalStatus.innerHTML = `

                <div
                    class="alert alert-success mb-0"
                >

                    <i
                        class="bi bi-check-circle-fill
                               me-2"
                    ></i>

                    <strong>
                        Checked by Pastor
                    </strong>

                </div>

            `;
    } else {
      modalStatus.innerHTML = `

                <div
                    class="alert alert-warning mb-0"
                >

                    <i
                        class="bi bi-clock me-2"
                    ></i>

                    <strong>
                        Waiting for Pastor
                    </strong>

                </div>

            `;
    }
  }

  // ------------------------------------
  // SCRIPTURE
  // ------------------------------------

  if (modalScripture) {
    modalScripture.textContent = content.scripture || "-";
  }

  // ------------------------------------
  // SOAP
  // ------------------------------------

  if (format === "SOAP") {
    if (modalObservationSection) {
      modalObservationSection.classList.remove("d-none");
    }

    if (modalObservation) {
      modalObservation.textContent = content.observation || "-";
    }

    if (modalLessonSection) {
      modalLessonSection.classList.add("d-none");
    }
  }

  // ------------------------------------
  // SLAP
  // ------------------------------------
  else {
    if (modalObservationSection) {
      modalObservationSection.classList.add("d-none");
    }

    if (modalLessonSection) {
      modalLessonSection.classList.remove("d-none");
    }

    if (modalLesson) {
      modalLesson.textContent = content.lesson || "-";
    }
  }

  // ------------------------------------
  // APPLICATION
  // ------------------------------------

  if (modalApplication) {
    modalApplication.textContent = content.application || "-";
  }

  // ------------------------------------
  // PRAYER
  // ------------------------------------

  if (modalPrayer) {
    modalPrayer.textContent = content.prayer || "-";
  }

  if (modal) {
    modal.show();
  }
}

// ========================================
// LOGOUT
// ========================================

async function logout() {
  try {
    await signOut(auth);

    window.location.href = "./index.html";
  } catch (error) {
    console.error("Logout error:", error);
  }
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();

    logout();
  });
}

if (mobileLogoutBtn) {
  mobileLogoutBtn.addEventListener("click", (e) => {
    e.preventDefault();

    logout();
  });
}

// ========================================
// ADMIN AUTHENTICATION
// ========================================

// ========================================
// ADMIN AUTHENTICATION
// ========================================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./index.html";
    return;
  }

  // ========================================
  // ADMIN CHECK
  // ========================================

  const ADMIN_EMAIL = "admin@pas.com";

  if ((user.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    console.warn("Unauthorized admin access:", user.email);

    await signOut(auth);

    localStorage.removeItem("isAdmin");

    window.location.href = "./index.html";

    return;
  }

  // ========================================
  // ADMIN VERIFIED
  // ========================================

  localStorage.setItem("isAdmin", "true");

  console.log("Admin authenticated:", user.email);

  await loadDashboard();
});
