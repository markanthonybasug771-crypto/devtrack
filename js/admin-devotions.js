import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ========================================
// ELEMENTS
// ========================================

const usersView = document.getElementById("usersView");

const selectedUserView = document.getElementById("selectedUserView");

const usersContainer = document.getElementById("usersContainer");

const userCount = document.getElementById("userCount");

const userSearch = document.getElementById("userSearch");

const userSort = document.getElementById("userSort");

const selectedUserHeader = document.getElementById("selectedUserHeader");

const userDevotionsContainer = document.getElementById(
  "userDevotionsContainer",
);

const backToUsersBtn = document.getElementById("backToUsersBtn");

const devotionStatusFilter = document.getElementById("devotionStatusFilter");

const devotionFormatFilter = document.getElementById("devotionFormatFilter");

const devotionSort = document.getElementById("devotionSort");

const logoutBtn = document.getElementById("logoutBtn");

const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

// ========================================
// MODAL ELEMENTS
// ========================================

const devotionModalElement = document.getElementById("devotionViewModal");

const devotionModal = new bootstrap.Modal(devotionModalElement);

const modalUserName = document.getElementById("modalUserName");

const modalDevotionTitle = document.getElementById("modalDevotionTitle");

const modalDevotionMeta = document.getElementById("modalDevotionMeta");

const modalStatus = document.getElementById("modalStatus");

const modalScripture = document.getElementById("modalScripture");

const modalObservation = document.getElementById("modalObservation");

const modalObservationSection = document.getElementById(
  "modalObservationSection",
);

const modalLesson = document.getElementById("modalLesson");

const modalLessonSection = document.getElementById("modalLessonSection");

const modalApplication = document.getElementById("modalApplication");

const modalPrayer = document.getElementById("modalPrayer");

const modalCheckDevotion = document.getElementById("modalCheckDevotion");

const modalAdminRemark = document.getElementById("modalAdminRemark");

const saveAdminRemarkBtn = document.getElementById("saveAdminRemarkBtn");

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
// DATA
// ========================================

let allUsers = [];
let allDevotions = [];

let selectedUser = null;
let selectedDevotion = null;

// ========================================
// HELPERS
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

function isChecked(devotion) {
  return (
    devotion.checked === true ||
    devotion.reviewed === true ||
    devotion.isChecked === true ||
    devotion.status === "checked" ||
    devotion.status === "Checked"
  );
}

// ========================================
// USER NAME
// ========================================

function getFirstName(user) {
  return (user.firstName || user.firstname || "").trim();
}

function getLastName(user) {
  return (user.lastName || user.lastname || "").trim();
}

function getFullName(user) {
  const firstName = getFirstName(user);

  const lastName = getLastName(user);

  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Unnamed User";
}

function getSortName(user) {
  const firstName = getFirstName(user);

  const lastName = getLastName(user);

  return `${lastName} ${firstName}`.trim().toLowerCase();
}

function getInitials(user) {
  const firstName = getFirstName(user);

  const lastName = getLastName(user);

  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
}

// ========================================
// LOAD DATA
// ========================================

async function loadData() {
  try {
    usersContainer.innerHTML = `
            <div class="admin-empty">
                <div class="spinner-border"></div>
                <p class="mt-3 mb-0">
                    Loading users and devotionals...
                </p>
            </div>
        `;

    const [usersSnapshot, devotionsSnapshot] = await Promise.all([
      getDocs(collection(db, "users")),

      getDocs(collection(db, "devotionals")),
    ]);

    allUsers = [];

    usersSnapshot.forEach((snapshot) => {
      allUsers.push({
        id: snapshot.id,
        ...snapshot.data(),
      });
    });

    allDevotions = [];

    devotionsSnapshot.forEach((snapshot) => {
      allDevotions.push({
        id: snapshot.id,

        ...snapshot.data(),
      });
    });

    /*
     * Connect devotion to user
     * using userId.
     */

    allUsers.forEach((user) => {
      user.devotions = allDevotions.filter(
        (devotion) => devotion.userId === user.id,
      );
    });

    renderUsers();
  } catch (error) {
    console.error("Failed to load admin devotion data:", error);

    usersContainer.innerHTML = `
            <div class="admin-empty">

                <i class="bi bi-exclamation-triangle-fill"></i>

                <h5>
                    Unable to load users
                </h5>

                <p>
                    Please check your Firestore rules
                    and try again.
                </p>

            </div>
        `;
  }
}

// ========================================
// USER STATS
// ========================================

function getUserStats(user) {
  const devotions = user.devotions || [];

  const checked = devotions.filter(isChecked).length;

  const pending = devotions.length - checked;

  return {
    total: devotions.length,

    checked,

    pending,
  };
}

// ========================================
// RENDER USERS
// ========================================

function renderUsers() {
  const search = userSearch.value.trim().toLowerCase();

  const sort = userSort.value;

  let users = [...allUsers];

  // SEARCH

  if (search) {
    users = users.filter((user) => {
      const name = getFullName(user).toLowerCase();

      const email = (user.email || "").toLowerCase();

      return name.includes(search) || email.includes(search);
    });
  }

  // SORT

  if (sort === "name") {
    users.sort((a, b) => getSortName(a).localeCompare(getSortName(b)));
  }

  if (sort === "most") {
    users.sort((a, b) => getUserStats(b).total - getUserStats(a).total);
  }

  if (sort === "checked") {
    users.sort((a, b) => getUserStats(b).checked - getUserStats(a).checked);
  }

  userCount.textContent = users.length;

  if (!users.length) {
    usersContainer.innerHTML = `

            <div class="admin-empty">

                <i class="bi bi-people"></i>

                <h5>
                    No users found
                </h5>

                <p>
                    Try another search.
                </p>

            </div>

        `;

    return;
  }

  usersContainer.innerHTML = users.map(createUserCard).join("");

  document.querySelectorAll("[data-user-id]").forEach((element) => {
    element.addEventListener("click", () => {
      const user = allUsers.find((item) => item.id === element.dataset.userId);

      if (user) {
        openUser(user);
      }
    });
  });
}

// ========================================
// USER CARD
// ========================================

function createUserCard(user) {
  const stats = getUserStats(user);

  const name = getFullName(user);

  const email = user.email || "";

  return `

        <article
            class="admin-user-item"
            data-user-id="${escapeHTML(user.id)}"
        >

            <div class="admin-user-info">

                <div class="admin-user-avatar">
                    ${escapeHTML(getInitials(user))}
                </div>

                <div>

                    <p class="admin-user-name">
                        ${escapeHTML(name)}
                    </p>

                    <p class="admin-user-email">
                        ${escapeHTML(email)}
                    </p>

                </div>

            </div>


            <div class="admin-user-stats">

                <div class="admin-user-stat">

                    <span
                        class="admin-user-stat-number"
                    >
                        ${stats.total}
                    </span>

                    <span
                        class="admin-user-stat-label"
                    >
                        Devotions
                    </span>

                </div>


                <div class="admin-user-stat">

                    <span
                        class="admin-user-stat-number"
                        style="color:#287a3d;"
                    >
                        ${stats.checked}
                    </span>

                    <span
                        class="admin-user-stat-label"
                    >
                        Checked
                    </span>

                </div>


                <div class="admin-user-stat">

                    <span
                        class="admin-user-stat-number"
                        style="color:#b42318;"
                    >
                        ${stats.pending}
                    </span>

                    <span
                        class="admin-user-stat-label"
                    >
                        Pending
                    </span>

                </div>


                <i class="bi bi-chevron-right text-muted"></i>

            </div>

        </article>

    `;
}

// ========================================
// OPEN USER
// ========================================

function openUser(user) {
  selectedUser = user;

  usersView.classList.add("d-none");

  selectedUserView.classList.remove("d-none");

  renderSelectedUser();

  renderUserDevotions();
}

// ========================================
// SELECTED USER HEADER
// ========================================

function renderSelectedUser() {
  const stats = getUserStats(selectedUser);

  selectedUserHeader.innerHTML = `

        <div class="admin-user-avatar">
            ${escapeHTML(getInitials(selectedUser))}
        </div>


        <div class="flex-grow-1">

            <p class="admin-selected-user-name">
                ${escapeHTML(getFullName(selectedUser))}
            </p>

            <p class="admin-selected-user-email">
                ${escapeHTML(selectedUser.email || "")}
            </p>

        </div>


        <div class="d-flex gap-3">

            <div class="text-center">

                <strong>
                    ${stats.total}
                </strong>

                <small
                    class="d-block text-muted"
                >
                    Total
                </small>

            </div>


            <div class="text-center">

                <strong
                    style="color:#287a3d;"
                >
                    ${stats.checked}
                </strong>

                <small
                    class="d-block text-muted"
                >
                    Checked
                </small>

            </div>


            <div class="text-center">

                <strong
                    style="color:#b42318;"
                >
                    ${stats.pending}
                </strong>

                <small
                    class="d-block text-muted"
                >
                    Pending
                </small>

            </div>

        </div>

    `;
}

// ========================================
// RENDER USER DEVOTIONS
// ========================================

function renderUserDevotions() {
  if (!selectedUser) {
    return;
  }

  const status = devotionStatusFilter.value;

  const format = devotionFormatFilter.value;

  const sort = devotionSort.value;

  let devotions = [...(selectedUser.devotions || [])];

  // STATUS

  if (status === "checked") {
    devotions = devotions.filter(isChecked);
  }

  if (status === "pending") {
    devotions = devotions.filter((item) => !isChecked(item));
  }

  // FORMAT

  if (format !== "all") {
    devotions = devotions.filter(
      (item) => (item.format || "SOAP").toUpperCase() === format,
    );
  }

  // SORT

  devotions.sort((a, b) => {
    const dateA = a.date || "";

    const dateB = b.date || "";

    if (sort === "oldest") {
      return dateA.localeCompare(dateB);
    }

    return dateB.localeCompare(dateA);
  });

  if (!devotions.length) {
    userDevotionsContainer.innerHTML = `

            <div class="admin-empty">

                <i class="bi bi-journal-x"></i>

                <h5>
                    No devotionals found
                </h5>

                <p>
                    There are no devotionals
                    matching the selected filters.
                </p>

            </div>

        `;

    return;
  }

  userDevotionsContainer.innerHTML = devotions.map(createDevotionCard).join("");

  document.querySelectorAll("[data-devotion-id]").forEach((element) => {
    element.addEventListener("click", () => {
      const devotion = selectedUser.devotions.find(
        (item) => item.id === element.dataset.devotionId,
      );

      if (devotion) {
        openDevotion(devotion);
      }
    });
  });
}

// ========================================
// DEVOTION CARD
// ========================================

function createDevotionCard(devotion) {
  const checked = isChecked(devotion);

  const format = (devotion.format || "SOAP").toUpperCase();

  const date = devotion.date || "Unknown date";

  const content = devotion.content || {};

  const scripture = content.scripture || "No scripture entered.";

  const preview =
    format === "SOAP"
      ? content.observation || content.application || ""
      : content.lesson || content.application || "";

  return `

        <article
            class="admin-devotion-item"
            data-devotion-id="${escapeHTML(devotion.id)}"
        >

            <div class="flex-grow-1">

                <div
                    class="d-flex align-items-center gap-2 flex-wrap mb-2"
                >

                  <h5 class="w-100 mb-0">
                    ${escapeHTML(devotion.title || "Untitled Devotion")}
                  </h5>

                    <span
                        class="admin-format-badge ${format.toLowerCase()}"
                    >
                        ${escapeHTML(format)}
                    </span>


                    <span class="
                        admin-devotion-status
                        ${checked ? "checked" : "pending"}
                    ">

                        <i class="bi ${
                          checked ? "bi-check-circle-fill" : "bi-clock-fill"
                        }"></i>

                        ${checked ? "Checked" : "Pending"}

                    </span>

                </div>


                <div class="admin-devotion-user">
                    ${escapeHTML(date)}
                </div>


                <div class="admin-devotion-meta">

                    <strong>
                        Scripture:
                    </strong>

                    ${escapeHTML(scripture)}

                </div>


                ${
                  preview
                    ? `
                            <div
                                class="text-muted small mt-2"
                            >
                                ${escapeHTML(preview)}
                            </div>
                        `
                    : ""
                }

            </div>


            <div class="admin-devotion-actions">

                <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    data-devotion-id="${escapeHTML(devotion.id)}"
                >
                    <i class="bi bi-eye me-1"></i>
                    View
                </button>


                <div class="form-check">

                    <input
                        class="form-check-input admin-check"
                        type="checkbox"
                        ${checked ? "checked" : ""}
                        data-check-devotion="${escapeHTML(devotion.id)}"
                    >

                </div>

            </div>

        </article>

    `;
}

// ========================================
// DEVOTION CLICK EVENTS
// ========================================

document.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-devotion-id]");

  const checkbox = event.target.closest("[data-check-devotion]");

  if (checkbox && selectedUser) {
    event.stopPropagation();

    await updateDevotionCheck(checkbox.dataset.checkDevotion, checkbox.checked);

    return;
  }

  if (viewButton && !checkbox) {
    const devotionId = viewButton.dataset.devotionId;

    const devotion = selectedUser?.devotions?.find(
      (item) => item.id === devotionId,
    );

    if (devotion) {
      openDevotion(devotion);
    }
  }
});

// ========================================
// UPDATE CHECK
// ========================================

async function updateDevotionCheck(devotionId, checked) {
  try {
    await updateDoc(doc(db, "devotionals", devotionId), {
      checked: checked,
    });

    const devotion = allDevotions.find((item) => item.id === devotionId);

    if (devotion) {
      devotion.checked = checked;
    }

    const userDevotion = selectedUser.devotions.find(
      (item) => item.id === devotionId,
    );

    if (userDevotion) {
      userDevotion.checked = checked;
    }

    renderSelectedUser();

    renderUserDevotions();

    Swal.fire({
      icon: "success",

      title: checked ? "Devotion Checked" : "Check Removed",

      text: checked
        ? "The devotion has been marked as checked."
        : "The devotion has been returned to pending status.",

      timer: 1300,

      showConfirmButton: false,
    });
  } catch (error) {
    console.error("Failed to update devotion:", error);

    Swal.fire({
      icon: "error",

      title: "Update Failed",

      text: "The devotion status could not be updated.",

      confirmButtonColor: "#6f4e37",
    });
  }
}

// ========================================
// OPEN DEVOTION MODAL
// ========================================

function openDevotion(devotion) {
  selectedDevotion = devotion;

  const format = (devotion.format || "SOAP").toUpperCase();

  const content = devotion.content || {};

  const checked = isChecked(devotion);

  modalUserName.textContent = getFullName(selectedUser);

  if (modalDevotionTitle) {
    modalDevotionTitle.textContent = devotion.title || "Untitled Devotion";
  }

  modalDevotionMeta.textContent = `${devotion.date || "Unknown date"} • ${format}`;

  modalStatus.innerHTML = `

        <span
            class="
                admin-devotion-status
                ${checked ? "checked" : "pending"}
            "
        >

            <i class="bi ${
              checked ? "bi-check-circle-fill" : "bi-clock-fill"
            }"></i>

            ${checked ? "Checked by Pastor" : "Pending Review"}

        </span>

    `;

  modalScripture.textContent = content.scripture || "No scripture entered.";

  modalApplication.textContent =
    content.application || "No application entered.";

  modalPrayer.textContent = content.prayer || "No prayer entered.";

  if (format === "SLAP") {
    modalObservationSection.classList.add("d-none");

    modalLessonSection.classList.remove("d-none");

    modalLesson.textContent = content.lesson || "No lesson entered.";
  } else {
    modalObservationSection.classList.remove("d-none");

    modalLessonSection.classList.add("d-none");

    modalObservation.textContent =
      content.observation || "No observation entered.";
  }

  modalCheckDevotion.checked = checked;

  if (modalAdminRemark) {
    modalAdminRemark.value = devotion.adminRemark || "";
    autoResizeTextarea(modalAdminRemark);
  }

  devotionModal.show();
}

// ========================================
// MODAL CHECKBOX
// ========================================

modalCheckDevotion.addEventListener("change", async () => {
  if (!selectedDevotion) {
    return;
  }

  const checked = modalCheckDevotion.checked;

  await updateDevotionCheck(selectedDevotion.id, checked);

  selectedDevotion.checked = checked;

  modalStatus.innerHTML = `

            <span
                class="
                    admin-devotion-status
                    ${checked ? "checked" : "pending"}
                "
            >

                <i class="bi ${
                  checked ? "bi-check-circle-fill" : "bi-clock-fill"
                }"></i>

                ${checked ? "Checked by Pastor" : "Pending Review"}

            </span>

        `;
});

// ========================================
// BACK TO USERS
// ========================================

backToUsersBtn.addEventListener("click", () => {
  selectedUser = null;

  selectedDevotion = null;

  selectedUserView.classList.add("d-none");

  usersView.classList.remove("d-none");

  renderUsers();
});

// ========================================
// FILTER EVENTS
// ========================================

userSearch.addEventListener("input", renderUsers);

userSort.addEventListener("change", renderUsers);

devotionStatusFilter.addEventListener("change", renderUserDevotions);

devotionFormatFilter.addEventListener("change", renderUserDevotions);

devotionSort.addEventListener("change", renderUserDevotions);

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
  logoutBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    await logout();
  });
}

if (mobileLogoutBtn) {
  mobileLogoutBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    await logout();
  });
}

// ========================================
// AUTH
// ========================================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./index.html";

    return;
  }

  await loadData();
});

saveAdminRemarkBtn?.addEventListener("click", async () => {
  if (!selectedDevotion || !modalAdminRemark) {
    return;
  }

  const adminRemark = modalAdminRemark.value.trim();

  saveAdminRemarkBtn.disabled = true;

  try {
    await updateDoc(doc(db, "devotionals", selectedDevotion.id), {
      adminRemark,
    });

    selectedDevotion.adminRemark = adminRemark;

    const devotion = allDevotions.find(
      (item) => item.id === selectedDevotion.id,
    );

    if (devotion) {
      devotion.adminRemark = adminRemark;
    }

    const userDevotion = selectedUser?.devotions.find(
      (item) => item.id === selectedDevotion.id,
    );

    if (userDevotion) {
      userDevotion.adminRemark = adminRemark;
    }

    Swal.fire({
      icon: "success",
      title: "Remarks Saved",
      timer: 1200,
      showConfirmButton: false,
    });
  } catch (error) {
    console.error("Failed to save admin remarks:", error);

    Swal.fire({
      icon: "error",
      title: "Save Failed",
      text: "The admin remarks could not be saved.",
    });
  } finally {
    saveAdminRemarkBtn.disabled = false;
  }
});
