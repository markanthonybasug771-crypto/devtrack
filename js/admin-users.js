import { auth, db } from "./firebase.js";

import { signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ========================================
// ELEMENTS
// ========================================

const usersTableBody = document.getElementById("usersTableBody");

const searchUser = document.getElementById("searchUser");

const sortUsers = document.getElementById("sortUsers");

const topRanking = document.getElementById("topRanking");

const totalUsers = document.getElementById("totalUsers");

const totalDevotions = document.getElementById("totalDevotions");

const averageConsistency = document.getElementById("averageConsistency");

const visibleUsers = document.getElementById("visibleUsers");

const logoutBtn = document.getElementById("logoutBtn");

const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

const missedDaysModalElement = document.getElementById("missedDaysModal");

const missedDaysModal = missedDaysModalElement
  ? new bootstrap.Modal(missedDaysModalElement)
  : null;

const missedDaysUserName = document.getElementById("missedDaysUserName");

const missedDaysCount = document.getElementById("missedDaysCount");

const missedDaysList = document.getElementById("missedDaysList");

// ========================================
// DATA
// ========================================

let allUsers = [];
let allDevotions = [];

// ========================================
// ADMIN AUTH
// ========================================

function checkAdmin() {
  const isAdmin = localStorage.getItem("isAdmin");

  if (isAdmin !== "true") {
    window.location.href = "./index.html";

    return false;
  }

  return true;
}

// ========================================
// NAME HELPERS
// ========================================

function getFirstName(data) {
  return (data.firstName || data.firstname || data.first_name || "").trim();
}

function getLastName(data) {
  return (data.lastName || data.lastname || data.last_name || "").trim();
}

function getFullName(data) {
  const firstName = getFirstName(data);

  const lastName = getLastName(data);

  if (lastName && firstName) {
    return `${lastName}, ${firstName}`;
  }

  return (
    lastName || firstName || data.displayName || data.email || "Unknown User"
  );
}

function getInitials(data) {
  const first = getFirstName(data);

  const last = getLastName(data);

  if (first && last) {
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
  }

  const name = getFullName(data).replace(",", "").split(" ").filter(Boolean);

  if (name.length >= 2) {
    return (name[0].charAt(0) + name[1].charAt(0)).toUpperCase();
  }

  return (name[0]?.charAt(0) || "U").toUpperCase();
}

// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ========================================
// DATE HELPERS
// ========================================

function getDateString(devotion) {
  if (devotion.date) {
    return String(devotion.date).substring(0, 10);
  }

  if (devotion.createdAt && typeof devotion.createdAt.toDate === "function") {
    const date = devotion.createdAt.toDate();

    return formatLocalDate(date);
  }

  return "";
}

function formatLocalDate(date) {
  if (!(date instanceof Date)) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateOnly(dateString) {
  if (!dateString) {
    return null;
  }

  const parts = String(dateString).substring(0, 10).split("-").map(Number);

  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }

  const [year, month, day] = parts;

  const date = new Date(year, month - 1, day);

  date.setHours(0, 0, 0, 0);

  return date;
}

// ========================================
// GET DEVOTION STATUS
// ========================================

function isChecked(devotion) {
  return (
    devotion.checked === true ||
    devotion.reviewed === true ||
    devotion.isChecked === true ||
    devotion.status === "checked" ||
    devotion.status === "Checked" ||
    devotion.status === "approved"
  );
}

// ========================================
// LOAD DATA
// ========================================

async function loadData() {
  try {
    showLoading();

    // ========================================
    // LOAD USERS
    // ========================================

    const usersSnapshot = await getDocs(collection(db, "users"));

    allUsers = [];

    usersSnapshot.forEach((docSnapshot) => {
      allUsers.push({
        id: docSnapshot.id,

        ...docSnapshot.data(),
      });
    });

    // ========================================
    // LOAD DEVOTIONALS
    // ========================================

    const devotionSnapshot = await getDocs(collection(db, "devotionals"));

    allDevotions = [];

    devotionSnapshot.forEach((docSnapshot) => {
      allDevotions.push({
        id: docSnapshot.id,

        ...docSnapshot.data(),
      });
    });

    console.log("Users loaded:", allUsers.length);

    console.log("Devotions loaded:", allDevotions.length);

    // ========================================
    // BUILD STATISTICS
    // ========================================

    buildUserStatistics();
  } catch (error) {
    console.error("Failed to load admin users data:", error);

    showLoadError(error);
  }
}

// ========================================
// LOADING STATE
// ========================================

function showLoading() {
  if (topRanking) {
    topRanking.innerHTML = `

            <div class="col-12">

                <div class="text-center py-5">

                    <div
                        class="spinner-border text-warning"
                        role="status"
                    ></div>

                    <p class="text-muted mt-3 mb-0">
                        Calculating rankings...
                    </p>

                </div>

            </div>

        `;
  }

  if (totalUsers) {
    totalUsers.textContent = "0";
  }

  if (totalDevotions) {
    totalDevotions.textContent = "0";
  }

  if (averageConsistency) {
    averageConsistency.textContent = "0%";
  }
}

// ========================================
// LOAD ERROR
// ========================================

function showLoadError(error) {
  console.error("Firestore error code:", error?.code);

  console.error("Firestore error message:", error?.message);

  if (topRanking) {
    topRanking.innerHTML = `

            <div class="col-12">

                <div class="admin-empty">

                    <i class="bi bi-exclamation-triangle-fill text-danger"></i>

                    <h5>
                        Unable to load rankings
                    </h5>

                    <p>
                        ${escapeHtml(
                          error?.message || "Unable to load Firestore data.",
                        )}
                    </p>

                </div>

            </div>

        `;
  }

  if (usersTableBody) {
    usersTableBody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="text-center py-5 text-danger"
                >

                    <i
                        class="bi bi-exclamation-triangle-fill fs-3"
                    ></i>

                    <div class="mt-2">

                        Unable to load user data.

                    </div>

                    <small class="text-muted">

                        Check your Firestore rules.

                    </small>

                </td>

            </tr>

        `;
  }

  if (totalUsers) {
    totalUsers.textContent = "0";
  }

  if (totalDevotions) {
    totalDevotions.textContent = "0";
  }

  if (averageConsistency) {
    averageConsistency.textContent = "0%";
  }
}

// ========================================
// BUILD USER STATISTICS
// ========================================

function buildUserStatistics() {
  const users = [];

  // ========================================
  // PROCESS USERS
  // ========================================

  allUsers.forEach((user) => {
    const userDevotions = allDevotions.filter(
      (devotion) => devotion.userId === user.id,
    );

    // ========================================
    // TOTAL DEVOTIONS
    // ========================================

    const total = userDevotions.length;

    // ========================================
    // CHECKED
    // ========================================

    const checked = userDevotions.filter((devotion) =>
      isChecked(devotion),
    ).length;

    // ========================================
    // PENDING
    // ========================================

    const pending = userDevotions.filter(
      (devotion) => !isChecked(devotion),
    ).length;

    // ========================================
    // MISSED DAYS
    // ========================================

    const missedDates = calculateMissedDates(userDevotions);

    const missed = missedDates.length;

    // ========================================
    // CONSISTENCY
    // ========================================

    /*
     *
     * Tracked Days =
     *
     * Checked
     * +
     * Pending
     * +
     * Missed
     *
     */

    const consistency = calculateConsistency(userDevotions);

    users.push({
      ...user,

      total,

      checked,

      pending,

      missed,

      missedDates,

      consistency,
    });
  });

  // ========================================
  // USERS WITHOUT PROFILE
  // ========================================

  allDevotions.forEach((devotion) => {
    const exists = users.some((user) => user.id === devotion.userId);

    if (!exists) {
      const userDevotions = allDevotions.filter(
        (item) => item.userId === devotion.userId,
      );

      const total = userDevotions.length;

      const checked = userDevotions.filter((item) => isChecked(item)).length;

      const pending = userDevotions.filter((item) => !isChecked(item)).length;

      const missedDates = calculateMissedDates(userDevotions);

      const missed = missedDates.length;

      const consistency = calculateConsistency(userDevotions);

      users.push({
        id: devotion.userId,

        firstName: "",

        lastName: "",

        email: "",

        total,

        checked,

        pending,

        missed,

        missedDates,

        consistency,
      });
    }
  });

  // ========================================
  // RANKING
  // ========================================

  /*
   *
  * Rank by consistency percentage only.
  * Equal percentages share a rank; names stabilize their display order.
   *
   */

  users.sort((a, b) => {
    return (
      b.consistency - a.consistency ||
      getFullName(a).localeCompare(getFullName(b))
    );
  });

  // ========================================
  // ASSIGN RANK
  // ========================================

  let currentRank = 0;
  let previousConsistency = null;

  users.forEach((user, index) => {
    if (user.consistency !== previousConsistency) {
      currentRank = index + 1;
      previousConsistency = user.consistency;
    }

    user.rank = currentRank;
  });

  // ========================================
  // SAVE
  // ========================================

  allUsers = users;

  // ========================================
  // RENDER
  // ========================================

  renderStatistics(users);

  renderTopRanking(users);

  renderUsers(users);
}

// ========================================
// CALCULATE MISSED DAYS
// ========================================

function calculateMissedDates(userDevotions) {
  if (!userDevotions || !userDevotions.length) {
    return [];
  }

  const dates = [
    ...new Set(
      userDevotions.map((devotion) => getDateString(devotion)).filter(Boolean),
    ),
  ]
    .filter((date) => parseDateOnly(date))
    .sort();

  if (!dates.length) {
    return [];
  }

  const submittedDates = new Set(dates);
  const firstDate = parseDateOnly(dates[0]);
  const yesterday = new Date();
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);

  const missedDates = [];

  for (
    const date = new Date(firstDate);
    date <= yesterday;
    date.setDate(date.getDate() + 1)
  ) {
    const dateString = formatLocalDate(date);

    if (!submittedDates.has(dateString)) {
      missedDates.push(dateString);
    }
  }

  return missedDates;
}

function calculateConsistency(userDevotions) {
  const dates = [
    ...new Set(
      userDevotions.map((devotion) => getDateString(devotion)).filter(Boolean),
    ),
  ];

  if (!dates.length) {
    return 0;
  }

  const firstDate = parseDateOnly(dates.sort()[0]);
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const trackedDays = Math.max(
    1,
    Math.floor((today.getTime() - firstDate.getTime()) / millisecondsPerDay) +
      1,
  );

  return Math.round((dates.length / trackedDays) * 100);
}

// ========================================
// STATISTICS
// ========================================

function renderStatistics(users) {
  const total = users.length;

  const devotionCount = allDevotions.length;

  const average = users.length
    ? Math.round(
        users.reduce((sum, user) => sum + user.consistency, 0) / users.length,
      )
    : 0;

  if (totalUsers) {
    totalUsers.textContent = total;
  }

  if (totalDevotions) {
    totalDevotions.textContent = devotionCount;
  }

  if (averageConsistency) {
    averageConsistency.textContent = `${average}%`;
  }
}

// ========================================
// TOP RANKING
// ========================================

function renderTopRanking(users) {
  const top = users.slice(0, 3);

  if (!top.length) {
    topRanking.innerHTML = `

            <div class="col-12">

                <div class="admin-empty">

                    <i class="bi bi-trophy"></i>

                    <p>
                        No users available yet.
                    </p>

                </div>

            </div>

        `;

    return;
  }

  const medals = ["🥇", "🥈", "🥉"];

  const classes = ["first", "second", "third"];

  topRanking.innerHTML = top
    .map((user, index) => {
      return `

                    <div class="col-md-4">

                        <div class="
                            top-performer
                            ${classes[index]}
                        ">

                            <div class="top-rank">
                                ${medals[index]}
                            </div>


                            <div class="top-avatar">
                                ${escapeHtml(getInitials(user))}
                            </div>


                            <div class="top-name">

                                ${escapeHtml(getFullName(user))}

                            </div>


                            <div class="top-consistency">

                                ${user.consistency}%

                            </div>


                            <div class="top-consistency-label">

                                consistency

                            </div>


                            <div class="top-stats">

                                <div class="top-stat">

                                    <strong>
                                        ${user.checked}
                                    </strong>

                                    Checked

                                </div>


                                <div class="top-stat">

                                    <strong>
                                        ${user.total}
                                    </strong>

                                    Devotions

                                </div>


                                <div class="top-stat">

                                    <strong>
                                        ${user.missed}
                                    </strong>

                                    Missed

                                </div>

                            </div>

                        </div>

                    </div>

                `;
    })
    .join("");
}

// ========================================
// USER TABLE
// ========================================

function renderUsers(users) {
  let filtered = [...users];

  // ========================================
  // SEARCH
  // ========================================

  const search = searchUser ? searchUser.value.trim().toLowerCase() : "";

  if (search) {
    filtered = filtered.filter((user) => {
      const name = getFullName(user).toLowerCase();

      const email = (user.email || "").toLowerCase();

      return name.includes(search) || email.includes(search);
    });
  }

  // ========================================
  // SORT
  // ========================================

  const sort = sortUsers ? sortUsers.value : "rank";

  if (sort === "name") {
    filtered.sort(sortByName);
  } else if (sort === "devotions") {
    filtered.sort((a, b) => b.total - a.total);
  } else if (sort === "checked") {
    filtered.sort((a, b) => b.checked - a.checked);
  } else if (sort === "missed") {
    filtered.sort((a, b) => a.missed - b.missed);
  } else if (sort === "consistency") {
    filtered.sort((a, b) => b.consistency - a.consistency);
  } else {
    filtered.sort((a, b) => a.rank - b.rank);
  }

  // ========================================
  // VISIBLE USERS
  // ========================================

  if (visibleUsers) {
    visibleUsers.textContent = filtered.length;
  }

  // ========================================
  // EMPTY
  // ========================================

  if (!filtered.length) {
    usersTableBody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="text-center"
                >

                    <div class="users-empty">

                        <i class="bi bi-person-x"></i>

                        <h5>
                            No users found
                        </h5>

                        <p>
                            Try another search.
                        </p>

                    </div>

                </td>

            </tr>

        `;

    return;
  }

  // ========================================
  // RENDER
  // ========================================

  usersTableBody.innerHTML = filtered.map(renderUserRow).join("");
}

// ========================================
// USER ROW
// ========================================

function renderUserRow(user) {
  let rankClass = "rank-other";

  if (user.rank === 1) {
    rankClass = "rank-1";
  }

  if (user.rank === 2) {
    rankClass = "rank-2";
  }

  if (user.rank === 3) {
    rankClass = "rank-3";
  }

  // ========================================
  // PERFORMANCE STATUS
  // ========================================

  let statusClass = "performance-new";

  let statusText = "No Devotion Yet";

  if (user.total > 0) {
    if (user.consistency >= 90) {
      statusClass = "performance-excellent";

      statusText = "Excellent";
    } else if (user.consistency >= 70) {
      statusClass = "performance-good";

      statusText = "Good";
    } else if (user.consistency >= 40) {
      statusClass = "performance-average";

      statusText = "Needs Improvement";
    } else {
      statusClass = "performance-low";

      statusText = "Low";
    }
  }

  return `

        <tr>

            <!-- RANK -->

            <td>

                <span class="
                    rank-number
                    ${rankClass}
                ">

                    ${user.rank}

                </span>

            </td>


            <!-- USER -->

            <td>

                <div class="user-info">

                    <div class="user-avatar">

                        ${escapeHtml(getInitials(user))}

                    </div>


                    <div>

                        <div class="user-name">

                            ${escapeHtml(getFullName(user))}

                        </div>


                        <div class="user-email">

                            ${escapeHtml(user.email || "")}

                        </div>

                    </div>

                </div>

            </td>


            <!-- TOTAL DEVOTIONS -->

            <td>

                <strong>
                    ${user.total}
                </strong>

            </td>


            <!-- CHECKED -->

            <td>

                <span class="
                    admin-badge
                    checked
                ">

                    <i class="
                        bi
                        bi-check-circle-fill
                    "></i>

                    ${user.checked}

                </span>

            </td>


            <!-- MISSED -->

            <td>

              <button
                type="button"
                class="
                  admin-badge
                  missed-days-trigger
                  ${user.missed > 0 ? "missed" : "checked"}
                "
                data-missed-user-id="${escapeHtml(user.id)}"
                aria-label="Show ${user.missed} missed devotion days for ${escapeHtml(getFullName(user))}"
              >

                    <i class="bi ${
                      user.missed > 0
                        ? "bi-calendar-x-fill"
                        : "bi-check-circle-fill"
                    }"></i>

                    ${user.missed}

                </button>

            </td>


            <!-- CONSISTENCY -->

            <td>

                <div class="consistency-wrapper">

                    <div class="consistency-value">

                        <span>
                            Consistency
                        </span>

                        <strong>
                            ${user.consistency}%
                        </strong>

                    </div>


                    <div class="consistency-progress">

                        <div
                            class="consistency-progress-bar"
                            style="
                                width:${user.consistency}%;
                            "
                        ></div>

                    </div>

                </div>

            </td>


            <!-- PERFORMANCE -->

            <td>

                <span class="
                    performance-badge
                    ${statusClass}
                ">

                    ${statusText}

                </span>

            </td>


           

        </tr>

    `;
}

// ========================================
// SORT BY NAME
// ========================================

function sortByName(a, b) {
  const lastA = getLastName(a).toLowerCase();

  const lastB = getLastName(b).toLowerCase();

  if (lastA !== lastB) {
    return lastA.localeCompare(lastB);
  }

  return getFirstName(a)
    .toLowerCase()
    .localeCompare(getFirstName(b).toLowerCase());
}

// ========================================
// SEARCH
// ========================================

if (searchUser) {
  searchUser.addEventListener("input", () => renderUsers(allUsers));
}

// ========================================
// SORT
// ========================================

if (sortUsers) {
  sortUsers.addEventListener("change", () => renderUsers(allUsers));
}

if (usersTableBody && missedDaysModal) {
  usersTableBody.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-missed-user-id]");

    if (!trigger) {
      return;
    }

    const user = allUsers.find(
      (item) => item.id === trigger.dataset.missedUserId,
    );

    if (!user) {
      return;
    }

    missedDaysUserName.textContent = getFullName(user);
    missedDaysCount.textContent = `${user.missed} missed day${
      user.missed === 1 ? "" : "s"
    }`;

    if (user.missedDates.length) {
      missedDaysList.innerHTML = user.missedDates
        .map((date) => {
          const displayDate = parseDateOnly(date).toLocaleDateString(
            undefined,
            { year: "numeric", month: "long", day: "numeric" },
          );

          return `<li class="list-group-item">${escapeHtml(displayDate)}</li>`;
        })
        .join("");
    } else {
      missedDaysList.innerHTML =
        '<li class="list-group-item text-muted">No missed devotion days.</li>';
    }

    missedDaysModal.show();
  });
}

// ========================================
// LOGOUT
// ========================================

async function logout(event) {
  if (event) {
    event.preventDefault();
  }

  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    localStorage.removeItem("isAdmin");

    window.location.href = "./index.html";
  }
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", logout);
}

if (mobileLogoutBtn) {
  mobileLogoutBtn.addEventListener("click", logout);
}

// ========================================
// START
// ========================================

if (checkAdmin()) {
  loadData();
}
