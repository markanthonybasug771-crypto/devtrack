import { auth, db } from "./firebase.js";

import { signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const list = document.getElementById("prayerRequestsList");

const logoutBtn = document.getElementById("logoutBtn");

const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

// ========================================
// PRAYER REACTION TYPES
// ========================================

const prayerReactionTypes = {
  love: "❤️",
  praying: "🙏",
  amen: "🤍",
  support: "🫶",
};

// ========================================
// PRAYER REACTION LISTENERS
// ========================================

const prayerReactionUnsubscribers = [];

const prayerReactionProcessing = new Set();

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

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// ========================================
// SETUP PRAYER REACTION BUTTONS
// ========================================

function setupPrayerReactionButtons(prayerId, reactionContainer) {
  const buttons = reactionContainer.querySelectorAll(
    ".admin-prayer-reaction-btn",
  );

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const reactionType = button.dataset.reaction;

      if (!reactionType) {
        return;
      }

      await togglePrayerReaction(prayerId, reactionType);
    });
  });
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

      const currentUser = auth.currentUser;

      snapshot.forEach((reactionSnapshot) => {
        const reactionData = reactionSnapshot.data();

        const reaction = reactionData.reaction;

        if (
          reaction &&
          Object.prototype.hasOwnProperty.call(counts, reaction)
        ) {
          counts[reaction]++;
        }

        if (currentUser && reactionSnapshot.id === currentUser.uid) {
          currentUserReaction = reaction;
        }
      });

      renderPrayerReactions(reactionContainer, counts, currentUserReaction);
    },
    (error) => {
      console.error("Prayer reaction loading error:", error);

      reactionContainer.innerHTML = `
        <div class="admin-prayer-reactions-error">
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
    <div class="admin-prayer-reaction-buttons">

      <button
        type="button"
        class="admin-prayer-reaction-btn ${
          currentUserReaction === "love" ? "active" : ""
        }"
        data-reaction="love"
        title="Love"
      >
        <span class="admin-reaction-emoji">❤️</span>
        <span class="admin-reaction-count">
          ${counts.love}
        </span>
      </button>

      <button
        type="button"
        class="admin-prayer-reaction-btn ${
          currentUserReaction === "praying" ? "active" : ""
        }"
        data-reaction="praying"
        title="Praying"
      >
        <span class="admin-reaction-emoji">🙏</span>
        <span class="admin-reaction-count">
          ${counts.praying}
        </span>
      </button>

      <button
        type="button"
        class="admin-prayer-reaction-btn ${
          currentUserReaction === "amen" ? "active" : ""
        }"
        data-reaction="amen"
        title="Amen"
      >
        <span class="admin-reaction-emoji">🤍</span>
        <span class="admin-reaction-count">
          ${counts.amen}
        </span>
      </button>

      <button
        type="button"
        class="admin-prayer-reaction-btn ${
          currentUserReaction === "support" ? "active" : ""
        }"
        data-reaction="support"
        title="Support"
      >
        <span class="admin-reaction-emoji">🫶</span>
        <span class="admin-reaction-count">
          ${counts.support}
        </span>
      </button>

    </div>
  `;

  setupPrayerReactionButtons(
    reactionContainer.closest(".admin-prayer-item")?.dataset.prayerId || "",
    reactionContainer,
  );
}

// ========================================
// TOGGLE PRAYER REACTION
// ========================================

async function togglePrayerReaction(prayerId, reactionType) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error("Cannot react because no authenticated user was found.");

    return;
  }

  const processingKey = `${prayerId}_${currentUser.uid}`;

  if (prayerReactionProcessing.has(processingKey)) {
    return;
  }

  prayerReactionProcessing.add(processingKey);

  try {
    const reactionRef = doc(
      db,
      "prayerRequests",
      prayerId,
      "reactions",
      currentUser.uid,
    );

    const reactionSnapshot = await getDocs(
      query(
        collection(db, "prayerRequests", prayerId, "reactions"),
        where("__name__", "==", currentUser.uid),
      ),
    );

    if (!reactionSnapshot.empty) {
      const existingReaction = reactionSnapshot.docs[0].data().reaction;

      if (existingReaction === reactionType) {
        await deleteDoc(reactionRef);
      } else {
        await setDoc(reactionRef, {
          reaction: reactionType,
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      await setDoc(reactionRef, {
        reaction: reactionType,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Prayer reaction error:", error);
  } finally {
    prayerReactionProcessing.delete(processingKey);
  }
}

// ========================================
// LOAD TODAY'S PRAYER REQUESTS
// ========================================

async function loadPrayerRequests() {
  try {
    // ========================================
    // CLEAR OLD REACTION LISTENERS
    // ========================================

    prayerReactionUnsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.error("Reaction listener cleanup error:", error);
      }
    });

    prayerReactionUnsubscribers.length = 0;

    const today = getTodayString();

    const q = query(
      collection(db, "prayerRequests"),
      where("date", "==", today),
    );

    const snapshot = await getDocs(q);

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

    snapshot.forEach((docSnapshot) => {
      requests.push({
        id: docSnapshot.id,

        ...docSnapshot.data(),
      });
    });

    requests.sort(
      (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0),
    );

    list.innerHTML = requests
      .map(
        (item) => `

                <div
                    class="admin-prayer-item"
                    data-prayer-id="${escapeHTML(item.id)}"
                >

                    <div class="admin-prayer-date">

                        <i class="bi bi-calendar3"></i>

                        ${escapeHTML(item.date || today)}

                    </div>

                    <p class="admin-prayer-text">

                        ${escapeHTML(item.request || "")}

                    </p>

                    <div
                        class="admin-prayer-reactions"
                    >

                        <div class="admin-prayer-reactions-loading">
                            Loading reactions...
                        </div>

                    </div>

                </div>

            `,
      )
      .join("");

    // ========================================
    // SETUP REAL-TIME REACTION LISTENERS
    // ========================================

    requests.forEach((item) => {
      const prayerItem = list.querySelector(
        `[data-prayer-id="${CSS.escape(item.id)}"]`,
      );

      if (!prayerItem) {
        return;
      }

      const reactionContainer = prayerItem.querySelector(
        ".admin-prayer-reactions",
      );

      if (!reactionContainer) {
        return;
      }

      listenToPrayerReactions(item.id, reactionContainer);
    });
  } catch (error) {
    console.error("Prayer request error:", error);

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

  window.location.href = "./index.html";
}

logoutBtn?.addEventListener("click", (e) => {
  e.preventDefault();

  logout();
});

mobileLogoutBtn?.addEventListener("click", (e) => {
  e.preventDefault();

  logout();
});

loadPrayerRequests();
