import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ========================================
// ELEMENTS
// ========================================

const myDevotionalsList = document.getElementById("myDevotionalsList");

const devotionsContainer = document.getElementById("devotionsContainer");

const devotionLoading = document.getElementById("devotionLoading");

const noDevotions = document.getElementById("noDevotions");

// ========================================
// LOGOUT BUTTONS
// ========================================

const logoutBtn = document.getElementById("logoutButton");

const mobileLogoutBtn = document.getElementById("mobileLogoutButton");

const startDevotionalBtn = document.getElementById("startDevotionalBtn");

const emptyStartDevotionBtn = document.getElementById("emptyStartDevotionBtn");

// ========================================
// MODAL ELEMENTS
// ========================================

const viewDevotionModalElement = document.getElementById("viewDevotionModal");

const viewDevotionTitle = document.getElementById("viewDevotionTitle");

const editDevotionTitle = document.getElementById("editDevotionTitle");

const viewDevotionDate = document.getElementById("viewDevotionDate");

const viewDevotionStatus = document.getElementById("viewDevotionStatus");

const viewDevotionFormat = document.getElementById("viewDevotionFormat");

const viewScripture = document.getElementById("viewScripture");

const viewObservation = document.getElementById("viewObservation");

const viewObservationSection = document.getElementById(
  "viewObservationSection",
);

const viewLesson = document.getElementById("viewLesson");

const viewLessonSection = document.getElementById("viewLessonSection");

const viewApplication = document.getElementById("viewApplication");

const viewPrayer = document.getElementById("viewPrayer");

const viewAdminRemark = document.getElementById("viewAdminRemark");

const viewAdminRemarkSection = document.getElementById(
  "viewAdminRemarkSection",
);

function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(textarea.scrollHeight, textarea.offsetHeight)}px`;
}

document.querySelectorAll(".auto-expand-textarea").forEach((textarea) => {
  textarea.addEventListener("input", () => autoResizeTextarea(textarea));
  autoResizeTextarea(textarea);
});

// ========================================
// DEVOTION STATE
// ========================================

let currentDevotion = null;

let currentUserId = null;

let isEditMode = false;

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
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ========================================
// FORMAT DEVOTION TEXT
// ========================================

function formatDevotionText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function normalizeNumberedPoints(value) {
  let nextNumber = 1;

  return String(value).replace(
    /(^|\n|[^\S\r\n]+)(\d+)\s*([.)])(?=\s)/g,
    (match, separator, currentNumber, punctuation, offset, source) => {
      const markerStart = offset + separator.length;
      const currentLine = source.slice(
        source.lastIndexOf("\n", markerStart - 1) + 1,
        markerStart,
      );

      // A verse label such as "(Verse 1)" is text, not a numbered point.
      // Do not renumber a marker while it is inside unmatched parentheses.
      const openParentheses = (currentLine.match(/\(/g) || []).length;
      const closeParentheses = (currentLine.match(/\)/g) || []).length;

      if (openParentheses > closeParentheses) {
        return match;
      }

      const lineStart = separator && separator !== "\n" ? "\n" : separator;

      return `${lineStart}${nextNumber++}${punctuation}`;
    },
  );
}

function setViewText(element, value, fallback) {
  if (!element) {
    return;
  }

  // Use the same raw value used by edit mode. textContent keeps the content
  // safe while CSS preserves the user's line breaks in the read-only view.
  element.textContent = normalizeNumberedPoints(
    formatDevotionText(value || fallback),
  );
}

function showViewDevotionModal() {
  const Modal = window.bootstrap?.Modal;

  if (!viewDevotionModalElement || !Modal) {
    console.error("Bootstrap modal is unavailable.");
    showAlert(
      "error",
      "Unable to open devotion",
      "Please refresh the page and try again.",
    );
    return;
  }

  // Resolve the instance at click time so the View button still works after
  // Bootstrap or the modal markup has been re-rendered.
  Modal.getOrCreateInstance(viewDevotionModalElement).show();
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
    devotionLoading.classList.remove("d-none");
  }

  if (noDevotions) {
    noDevotions.classList.add("d-none");
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
    devotionLoading.classList.add("d-none");
  }

  if (devotionsContainer) {
    devotionsContainer.innerHTML = "";
  }

  if (noDevotions) {
    noDevotions.classList.remove("d-none");
  }
}

// ========================================
// ERROR STATE
// ========================================

function renderErrorState() {
  if (devotionLoading) {
    devotionLoading.classList.add("d-none");
  }

  if (noDevotions) {
    noDevotions.classList.add("d-none");
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
  const checked = isDevotionChecked(item);

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
    devotionLoading.classList.add("d-none");
  }

  if (!devotionals.length) {
    renderEmptyState();

    return;
  }

  if (noDevotions) {
    noDevotions.classList.add("d-none");
  }

  if (!devotionsContainer) {
    return;
  }

  devotionsContainer.innerHTML = devotionals
    .map((item) => {
      const format = (item.format || "SOAP").toUpperCase();

      const date = item.date || "Unknown date";

      const content = item.content || {};

      const checked = isDevotionChecked(item);

      // Get short preview

      const scripture = content.scripture || "";

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

                        <h5 class="mb-2">

                          ${escapeHTML(
                            item.title ||
                              item.content?.title ||
                              "Untitled Devotion",
                          )}

                        </h5>

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

  document.querySelectorAll(".view-devotion-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const devotionId = button.dataset.devotionId;

      const devotion = devotionals.find((item) => item.id === devotionId);

      if (devotion) {
        openDevotionModal(devotion);
      }
    });
  });
}

// ========================================
// CREATE EDIT BUTTON
// ========================================

function createEditButton() {
  if (!viewDevotionModalElement) {
    return null;
  }

  let editButton = document.getElementById("editDevotionBtn");

  if (editButton) {
    return editButton;
  }

  // Try to find modal footer

  let modalFooter = viewDevotionModalElement.querySelector(".modal-footer");

  if (!modalFooter) {
    modalFooter = document.createElement("div");

    modalFooter.className = "modal-footer";

    viewDevotionModalElement
      .querySelector(".modal-content")
      ?.appendChild(modalFooter);
  }

  editButton = document.createElement("button");

  editButton.type = "button";

  editButton.id = "editDevotionBtn";

  editButton.className = "btn btn-primary";

  editButton.innerHTML = `
    <i class="bi bi-pencil-square me-2"></i>
    Edit Devotion
  `;

  modalFooter.insertBefore(editButton, modalFooter.firstChild);

  editButton.addEventListener("click", () => {
    if (currentDevotion) {
      enterEditMode(currentDevotion);
    }
  });

  return editButton;
}

// ========================================
// GET CONTENT VALUE
// ========================================

function getContentValue(content, field) {
  if (!content) {
    return "";
  }

  return content[field] || "";
}

function getDevotionTitle(devotion) {
  return devotion?.title || devotion?.content?.title || "Untitled Devotion";
}

// ========================================
// EDIT FIELD VISIBILITY
// ========================================

const editFieldElements = {
  scripture: { view: viewScripture, editId: "editScripture" },
  observation: { view: viewObservation, editId: "editObservation" },
  lesson: { view: viewLesson, editId: "editLesson" },
  application: { view: viewApplication, editId: "editApplication" },
  prayer: { view: viewPrayer, editId: "editPrayer" },
};

function setEditField(fieldName, value, editing) {
  const field = editFieldElements[fieldName];

  if (!field) {
    return;
  }

  const textarea = document.getElementById(field.editId);

  if (textarea) {
    textarea.value = value || "";
    textarea.classList.toggle("d-none", !editing);
  }

  if (field.view) {
    field.view.classList.toggle("d-none", editing);
  }
}

function restoreViewFields() {
  Object.keys(editFieldElements).forEach((fieldName) => {
    setEditField(fieldName, "", false);
  });
}

// ========================================
// ENTER EDIT MODE
// ========================================

function enterEditMode(item) {
  if (!item || !viewDevotionModalElement) {
    return;
  }

  currentDevotion = item;

  isEditMode = true;

  const format = (item.format || "SOAP").toUpperCase();

  const content = item.content || {};

  // ------------------------------------
  // TITLE
  // ------------------------------------

  if (viewDevotionTitle) {
    viewDevotionTitle.classList.add("d-none");
  }

  if (editDevotionTitle) {
    editDevotionTitle.value = getDevotionTitle(item);
    editDevotionTitle.classList.remove("d-none");
  }

  // ------------------------------------
  // STATUS
  // ------------------------------------

  if (viewDevotionStatus) {
    viewDevotionStatus.innerHTML = `
      <div class="alert alert-info d-flex align-items-center">

        <i class="bi bi-pencil-square me-2"></i>

        <div>

          <strong>
            Editing your devotion
          </strong>

          <br>

          <small>
            Make your changes below, then click Save Changes.
          </small>

        </div>

      </div>
    `;
  }

  // ------------------------------------
  // FORMAT
  // ------------------------------------

  if (viewDevotionFormat) {
    viewDevotionFormat.innerHTML = `
      <span class="badge text-bg-primary">
        ${escapeHTML(format)}
      </span>
    `;
  }

  // ------------------------------------
  // DATE
  // ------------------------------------

  if (viewDevotionDate) {
    viewDevotionDate.innerHTML = `
      <span class="text-muted">
        <i class="bi bi-calendar3 me-1"></i>
        ${escapeHTML(item.date || "Unknown date")}
      </span>
    `;
  }

  // ------------------------------------
  // SCRIPTURE
  // ------------------------------------

  setEditField("scripture", getContentValue(content, "scripture"), true);

  // ------------------------------------
  // OBSERVATION
  // ------------------------------------

  if (format === "SOAP") {
    if (viewObservationSection) {
      viewObservationSection.classList.remove("d-none");
    }

    setEditField(
      "observation",
      getContentValue(content, "observation"),
      true,
    );

    setEditField("lesson", "", false);

    if (viewLessonSection) {
      viewLessonSection.classList.add("d-none");
    }
  }

  // ------------------------------------
  // LESSON
  // ------------------------------------
  else {
    if (viewObservationSection) {
      viewObservationSection.classList.add("d-none");
    }

    if (viewLessonSection) {
      viewLessonSection.classList.remove("d-none");
    }

    setEditField("observation", "", false);
    setEditField("lesson", getContentValue(content, "lesson"), true);
  }

  // ------------------------------------
  // APPLICATION
  // ------------------------------------

  setEditField("application", getContentValue(content, "application"), true);

  // ------------------------------------
  // PRAYER
  // ------------------------------------

  setEditField("prayer", getContentValue(content, "prayer"), true);

  // ------------------------------------
  // ADMIN REMARK
  // ------------------------------------

  // Admin remark remains VIEW ONLY.
  // User cannot edit pastor/admin remarks.

  if (viewAdminRemarkSection) {
    const adminRemark = String(item.adminRemark || "").trim();

    viewAdminRemarkSection.classList.toggle("d-none", !adminRemark);

    if (viewAdminRemark) {
      setViewText(viewAdminRemark, adminRemark, "");
    }
  }

  // ------------------------------------
  // FOOTER BUTTONS
  // ------------------------------------

  setupEditFooter();

  // ------------------------------------
  // EDIT TEXTAREA STYLE
  // ------------------------------------

  const textareas = viewDevotionModalElement.querySelectorAll(
    ".devotion-edit-field",
  );

  textareas.forEach((textarea) => {
    textarea.style.width = "100%";
    textarea.style.minHeight = "180px";
    textarea.style.resize = "vertical";
  });
}

// ========================================
// SETUP EDIT FOOTER
// ========================================

function setupEditFooter() {
  if (!viewDevotionModalElement) {
    return;
  }

  let modalFooter = viewDevotionModalElement.querySelector(".modal-footer");

  if (!modalFooter) {
    modalFooter = document.createElement("div");

    modalFooter.className = "modal-footer";

    viewDevotionModalElement
      .querySelector(".modal-content")
      ?.appendChild(modalFooter);
  }

  modalFooter.innerHTML = "";

  const cancelButton = document.createElement("button");

  cancelButton.type = "button";

  cancelButton.id = "cancelEditDevotionBtn";

  cancelButton.className = "btn btn-outline-secondary";

  cancelButton.innerHTML = `
    <i class="bi bi-x-lg me-2"></i>
    Cancel
  `;

  const saveButton = document.createElement("button");

  saveButton.type = "button";

  saveButton.id = "saveEditDevotionBtn";

  saveButton.className = "btn btn-primary";

  saveButton.innerHTML = `
    <i class="bi bi-check-lg me-2"></i>
    Save Changes
  `;

  modalFooter.appendChild(cancelButton);

  modalFooter.appendChild(saveButton);

  // ------------------------------------
  // CANCEL
  // ------------------------------------

  cancelButton.addEventListener("click", () => {
    if (currentDevotion) {
      openDevotionModal(currentDevotion);
    }
  });

  // ------------------------------------
  // SAVE
  // ------------------------------------

  saveButton.addEventListener("click", async () => {
    await saveEditedDevotion();
  });
}

// ========================================
// GET EDITED VALUES
// ========================================

function getEditedFieldValue(fieldName) {
  if (!viewDevotionModalElement) {
    return "";
  }

  const textarea = viewDevotionModalElement.querySelector(
    `#${editFieldElements[fieldName]?.editId || ""}`,
  );

  if (!textarea) {
    return "";
  }

  return textarea.value.trim();
}

// ========================================
// SAVE EDITED DEVOTION
// ========================================

async function saveEditedDevotion() {
  if (!currentDevotion) {
    return;
  }

  if (!currentUserId) {
    showAlert(
      "error",
      "Not signed in",
      "Please sign in again before editing your devotion.",
    );

    return;
  }

  const title = editDevotionTitle?.value.trim() || "";

  const scripture = getEditedFieldValue("scripture");

  const application = getEditedFieldValue("application");

  const prayer = getEditedFieldValue("prayer");

  const format = (currentDevotion.format || "SOAP").toUpperCase();

  let observation = "";

  let lesson = "";

  if (format === "SOAP") {
    observation = getEditedFieldValue("observation");
  } else {
    lesson = getEditedFieldValue("lesson");
  }

  // ------------------------------------
  // VALIDATION
  // ------------------------------------

  if (!title) {
    showAlert(
      "warning",
      "Title is required",
      "Please enter a title for your devotion.",
    );

    return;
  }

  if (!scripture) {
    showAlert(
      "warning",
      "Scripture is required",
      "Please enter the scripture for your devotion.",
    );

    return;
  }

  if (!application) {
    showAlert(
      "warning",
      "Application is required",
      "Please enter your application.",
    );

    return;
  }

  if (!prayer) {
    showAlert("warning", "Prayer is required", "Please enter your prayer.");

    return;
  }

  if (format === "SOAP" && !observation) {
    showAlert(
      "warning",
      "Observation is required",
      "Please enter your observation.",
    );

    return;
  }

  if (format === "SLAP" && !lesson) {
    showAlert("warning", "Lesson is required", "Please enter your lesson.");

    return;
  }

  // ------------------------------------
  // CONFIRMATION
  // ------------------------------------

  if (typeof Swal !== "undefined") {
    const result = await Swal.fire({
      icon: "question",

      title: "Save Changes?",

      text: "Are you sure you want to update this devotion?",

      showCancelButton: true,

      confirmButtonText: "Yes, Save Changes",

      cancelButtonText: "Cancel",

      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }
  } else {
    const confirmed = window.confirm(
      "Are you sure you want to save these changes?",
    );

    if (!confirmed) {
      return;
    }
  }

  // ------------------------------------
  // BUTTON LOADING
  // ------------------------------------

  const saveButton = document.getElementById("saveEditDevotionBtn");

  const cancelButton = document.getElementById("cancelEditDevotionBtn");

  if (saveButton) {
    saveButton.disabled = true;

    saveButton.innerHTML = `
      <span
        class="spinner-border spinner-border-sm me-2"
        role="status"
        aria-hidden="true"
      ></span>

      Saving...
    `;
  }

  if (cancelButton) {
    cancelButton.disabled = true;
  }

  try {
    // ------------------------------------
    // PREPARE CONTENT
    // ------------------------------------

    const existingContent = currentDevotion.content || {};

    const updatedContent = {
      scripture,
      application,
      prayer,
    };

    if (format === "SOAP") {
      updatedContent.observation = observation;

      // Preserve lesson if existing
      if (
        Object.prototype.hasOwnProperty.call(existingContent, "lesson")
      ) {
        updatedContent.lesson = existingContent.lesson || "";
      }
    } else {
      updatedContent.lesson = lesson;

      // Preserve observation if existing
      if (
        Object.prototype.hasOwnProperty.call(existingContent, "observation")
      ) {
        updatedContent.observation = existingContent.observation || "";
      }
    }

    // ------------------------------------
    // UPDATE FIRESTORE
    // ------------------------------------

    const devotionRef = doc(db, "devotionals", currentDevotion.id);

    await updateDoc(devotionRef, {
      title,

      content: updatedContent,

      updatedAt: serverTimestamp(),
    });

    // ------------------------------------
    // UPDATE LOCAL OBJECT
    // ------------------------------------

    currentDevotion = {
      ...currentDevotion,

      title,

      content: updatedContent,

      updatedAt: new Date(),
    };

    // ------------------------------------
    // SUCCESS
    // ------------------------------------

    isEditMode = false;

    if (typeof Swal !== "undefined") {
      await Swal.fire({
        icon: "success",

        title: "Devotion Updated",

        text: "Your devotion has been successfully updated.",

        confirmButtonText: "Okay",
      });
    }

    // ------------------------------------
    // SHOW UPDATED DEVOTION
    // ------------------------------------

    openDevotionModal(currentDevotion);

    // ------------------------------------
    // REFRESH LIST
    // ------------------------------------

    await loadDevotionals(currentUserId);
  } catch (error) {
    console.error("Failed to update devotion:", error);

    if (saveButton) {
      saveButton.disabled = false;

      saveButton.innerHTML = `
        <i class="bi bi-check-lg me-2"></i>
        Save Changes
      `;
    }

    if (cancelButton) {
      cancelButton.disabled = false;
    }

    showAlert(
      "error",
      "Update Failed",
      "Something went wrong while saving your devotion. Please try again.",
    );
  }
}

// ========================================
// SHOW ALERT
// ========================================

function showAlert(icon, title, text) {
  if (typeof Swal !== "undefined") {
    Swal.fire({
      icon: icon,

      title: title,

      text: text,
    });

    return;
  }

  alert(`${title}\n\n${text}`);
}

// ========================================
// RESTORE VIEW FOOTER
// ========================================

function setupViewFooter() {
  if (!viewDevotionModalElement) {
    return;
  }

  let modalFooter = viewDevotionModalElement.querySelector(".modal-footer");

  if (!modalFooter) {
    modalFooter = document.createElement("div");

    modalFooter.className = "modal-footer";

    viewDevotionModalElement
      .querySelector(".modal-content")
      ?.appendChild(modalFooter);
  }

  modalFooter.innerHTML = "";

  // ------------------------------------
  // EDIT BUTTON
  // ------------------------------------

  const editButton = document.createElement("button");

  editButton.type = "button";

  editButton.id = "editDevotionBtn";

  editButton.className = "btn btn-primary";

  editButton.innerHTML = `
    <i class="bi bi-pencil-square me-2"></i>
    Edit Devotion
  `;

  // ------------------------------------
  // CLOSE BUTTON
  // ------------------------------------

  const closeButton = document.createElement("button");

  closeButton.type = "button";

  closeButton.className = "btn btn-outline-secondary";

  closeButton.setAttribute("data-bs-dismiss", "modal");

  closeButton.innerHTML = `
    <i class="bi bi-x-lg me-2"></i>
    Close
  `;

  modalFooter.appendChild(editButton);

  modalFooter.appendChild(closeButton);

  // ------------------------------------
  // EDIT EVENT
  // ------------------------------------

  editButton.addEventListener("click", () => {
    if (currentDevotion) {
      enterEditMode(currentDevotion);
    }
  });
}

// ========================================
// OPEN DEVOTION MODAL
// ========================================

function openDevotionModal(item) {
  if (!item) {
    return;
  }

  currentDevotion = item;

  isEditMode = false;

  restoreViewFields();

  const format = (item.format || "SOAP").toUpperCase();

  const date = item.date || "Unknown date";

  const content = item.content || {};

  // ------------------------------------
  // BASIC INFORMATION
  // ------------------------------------

  if (viewDevotionTitle) {
    viewDevotionTitle.textContent =
      item.title || item.content?.title || "Untitled Devotion";
    viewDevotionTitle.classList.remove("d-none");
  }

  if (editDevotionTitle) {
    editDevotionTitle.value = "";
    editDevotionTitle.classList.add("d-none");
  }

  if (viewDevotionDate) {
    viewDevotionDate.textContent = date;
  }

  if (viewDevotionFormat) {
    viewDevotionFormat.textContent = format;
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

          <i class="bi bi-clock me-2"></i>

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

  // ------------------------------------
  // ADMIN REMARK
  // ------------------------------------

  if (viewAdminRemarkSection) {
    const adminRemark = String(item.adminRemark || "").trim();

    viewAdminRemarkSection.classList.toggle("d-none", !adminRemark);

    if (viewAdminRemark) {
      setViewText(viewAdminRemark, adminRemark, "");
    }
  }

  // ------------------------------------
  // SCRIPTURE
  // ------------------------------------

  setViewText(viewScripture, content.scripture, "No scripture entered.");

  // ------------------------------------
  // SOAP OBSERVATION
  // ------------------------------------

  if (format === "SOAP") {
    if (viewObservationSection) {
      viewObservationSection.classList.remove("d-none");
    }

    setViewText(
      viewObservation,
      content.observation,
      "No observation entered.",
    );

    // Hide Lesson

    if (viewLessonSection) {
      viewLessonSection.classList.add("d-none");
    }
  }

  // ------------------------------------
  // SLAP LESSON
  // ------------------------------------
  else {
    if (viewObservationSection) {
      viewObservationSection.classList.add("d-none");
    }

    if (viewLessonSection) {
      viewLessonSection.classList.remove("d-none");
    }

    setViewText(viewLesson, content.lesson, "No lesson entered.");
  }

  // ------------------------------------
  // APPLICATION
  // ------------------------------------

  setViewText(
    viewApplication,
    content.application,
    "No application entered.",
  );

  // ------------------------------------
  // PRAYER
  // ------------------------------------

  setViewText(viewPrayer, content.prayer, "No prayer entered.");

  // ------------------------------------
  // SETUP FOOTER
  // ------------------------------------

  setupViewFooter();

  // ------------------------------------
  // SHOW MODAL
  // ------------------------------------

  showViewDevotionModal();
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
    const devotionalsQuery = query(
      collection(db, "devotionals"),

      where("userId", "==", userId),
    );

    const snapshot = await getDocs(devotionalsQuery);

    const items = [];

    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();

      items.push({
        id: docSnapshot.id,

        ...data,
      });
    });

    // =================================
    // SORT NEWEST FIRST
    // =================================

    items.sort((a, b) => {
      const dateA = a.date || "";

      const dateB = b.date || "";

      if (dateA === dateB) {
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }

      return dateB.localeCompare(dateA);
    });

    renderDevotionals(items);
  } catch (error) {
    console.error("Failed to load devotions:", error);

    renderErrorState();
  }
}

// ========================================
// AUTH STATE
// ========================================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./index.html";

    return;
  }

  currentUserId = user.uid;

  try {
    await loadDevotionals(user.uid);
  } catch (error) {
    console.error("Auth state load error:", error);

    renderErrorState();
  }
});

// ========================================
// LOGOUT FUNCTION
// ========================================

async function handleLogout(event) {
  event.preventDefault();

  try {
    // Sign out Firebase user

    await signOut(auth);

    // Redirect to login page

    window.location.href = "./index.html";
  } catch (error) {
    console.error("Logout error:", error);

    // Show error if SweetAlert is available

    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "error",

        title: "Logout Failed",

        text: "Something went wrong while logging out.",
      });
    } else {
      alert("Something went wrong while logging out.");
    }
  }
}

// ========================================
// DESKTOP LOGOUT
// ========================================

if (logoutBtn) {
  logoutBtn.addEventListener("click", handleLogout);
}

// ========================================
// MOBILE LOGOUT
// ========================================

if (mobileLogoutBtn) {
  mobileLogoutBtn.addEventListener("click", handleLogout);
}

// ========================================
// START DEVOTION
// ========================================

if (startDevotionalBtn) {
  startDevotionalBtn.addEventListener("click", () => {
    window.location.href = "./user-dashboard.html";
  });
}

if (emptyStartDevotionBtn) {
  emptyStartDevotionBtn.addEventListener("click", () => {
    window.location.href = "./user-dashboard.html";
  });
}
