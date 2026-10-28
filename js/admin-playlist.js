// ========================================
// ADMIN PLAYLIST
// ========================================

import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ========================================
// ELEMENTS
// ========================================

const addSongForm = document.getElementById("addSongForm");
const songTitle = document.getElementById("songTitle");
const songArtist = document.getElementById("songArtist");
const songUrl = document.getElementById("songUrl");
const addSongBtn = document.getElementById("addSongBtn");

const adminSongList = document.getElementById("adminSongList");
const adminSongCount = document.getElementById("adminSongCount");

const adminPlayerCard = document.getElementById("adminPlayerCard");

const youtubePlayerContainer = document.getElementById(
  "youtubePlayerContainer",
);

const youtubePlayer = document.getElementById("youtubePlayer");

const nowPlayingTitle = document.getElementById("nowPlayingTitle");

const nowPlayingArtist = document.getElementById("nowPlayingArtist");

const closePlayerBtn = document.getElementById("closePlayerBtn");

// ========================================
// SONG DATA
// ========================================

let songs = [];

// ========================================
// LOAD SONGS
// ========================================

async function loadSongs() {
  try {
    adminSongList.innerHTML = `
            <div class="text-center py-5">

                <div class="spinner-border"></div>

                <p class="text-muted mt-3">
                    Loading songs...
                </p>

            </div>
        `;

    const songsQuery = query(
      collection(db, "songs"),
      orderBy("createdAt", "desc"),
    );

    const snapshot = await getDocs(songsQuery);

    songs = [];

    snapshot.forEach((document) => {
      songs.push({
        id: document.id,

        ...document.data(),
      });
    });

    renderSongs();
  } catch (error) {
    console.error("Error loading songs:", error);

    adminSongList.innerHTML = `

            <div class="alert alert-danger">

                <i class="bi bi-exclamation-triangle me-2"></i>

                Failed to load songs.

            </div>

        `;
  }
}

// ========================================
// RENDER SONGS
// ========================================

function renderSongs() {
  adminSongList.innerHTML = "";

  if (adminSongCount) {
    adminSongCount.textContent = `${songs.length} ${
      songs.length === 1 ? "song" : "songs"
    }`;
  }

  if (songs.length === 0) {
    adminSongList.innerHTML = `

            <div class="admin-playlist-empty">

                <div class="admin-playlist-empty-icon">

                    <i class="bi bi-music-note-list"></i>

                </div>

                <h5>
                    No songs yet
                </h5>

                <p>
                    Add your first worship song above.
                </p>

            </div>

        `;

    return;
  }

  songs.forEach((song) => {
    const card = document.createElement("div");

    card.className = "admin-song-item";

    card.innerHTML = `

            <div class="admin-song-item-icon">

                <i class="bi bi-music-note-beamed"></i>

            </div>


            <div class="admin-song-item-info">

                <h6>
                    ${escapeHtml(song.title)}
                </h6>

                <p>
                    ${escapeHtml(song.artist || "Unknown Artist")}
                </p>

            </div>


            <div class="admin-song-item-actions">

                <button
                    type="button"
                    class="btn btn-sm btn-success play-song-btn"
                    data-id="${song.id}"
                >

                    <i class="bi bi-play-fill"></i>

                    <span class="d-none d-md-inline">
                        Play
                    </span>

                </button>

                <button
        type="button"
        class="btn btn-sm btn-outline-primary edit-song-btn"
        data-id="${song.id}"
        title="Edit"
    >
        <i class="bi bi-pencil"></i>
    </button>


                <button
                    type="button"
                    class="btn btn-sm btn-outline-danger delete-song-btn"
                    data-id="${song.id}"
                >

                    <i class="bi bi-trash"></i>

                </button>

            </div>

        `;

    adminSongList.appendChild(card);
  });
}

// ========================================
// ADD SONG
// ========================================

if (addSongForm) {
  addSongForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = songTitle.value.trim();

    const artist = songArtist.value.trim();

    const url = songUrl.value.trim();

    if (!title || !artist || !url) {
      Swal.fire({
        icon: "warning",

        title: "Incomplete",

        text: "Please complete all fields.",
      });

      return;
    }

    // ====================================
    // VALIDATE YOUTUBE URL
    // ====================================

    if (!isYouTubeUrl(url)) {
      Swal.fire({
        icon: "warning",

        title: "Invalid YouTube link",

        text: "Please enter a valid YouTube URL.",
      });

      return;
    }

    // ====================================
    // CHECK ADMIN LOGIN
    // ====================================

    const currentUser = auth.currentUser;

    if (!currentUser) {
      Swal.fire({
        icon: "warning",

        title: "Not Logged In",

        text: "Please login as administrator first.",
      });

      return;
    }

    console.log("Adding song as:", currentUser.email);

    try {
      addSongBtn.disabled = true;

      addSongBtn.innerHTML = `

                    <span
                        class="spinner-border spinner-border-sm me-2"
                    ></span>

                    Adding...

                `;

      // ====================================
      // SONG DATA
      // ====================================

      const songData = {
        title: title,

        artist: artist,

        youtubeUrl: url,

        active: true,

        createdAt: serverTimestamp(),

        addedBy: currentUser.uid,

        addedByEmail: currentUser.email || "",
      };

      console.log("Song data:", songData);

      // ====================================
      // SAVE TO FIRESTORE
      // ====================================

      const songRef = await addDoc(collection(db, "songs"), songData);

      console.log("Song successfully added:", songRef.id);

      // ====================================
      // RESET FORM
      // ====================================

      addSongForm.reset();

      // ====================================
      // RELOAD SONGS
      // ====================================

      await loadSongs();

      // ====================================
      // SUCCESS
      // ====================================

      Swal.fire({
        icon: "success",

        title: "Song Added!",

        text: `${title} has been added to the worship collection.`,

        timer: 1800,

        showConfirmButton: false,
      });
    } catch (error) {
      console.error("FIRESTORE ADD SONG ERROR:", error);

      Swal.fire({
        icon: "error",

        title: "Failed to add song",

        html: `

                        <p>
                            The song could not be saved.
                        </p>

                        <small class="text-muted">
                            ${escapeHtml(
                              error.message || "Unknown Firestore error.",
                            )}
                        </small>

                    `,
      });
    } finally {
      addSongBtn.disabled = false;

      addSongBtn.innerHTML = `

                    <i class="bi bi-plus-lg me-2"></i>

                    Add Song

                `;
    }
  });
}

// ========================================
// PLAY SONG
// ========================================

document.addEventListener("click", (event) => {
  const button = event.target.closest(".play-song-btn");

  if (!button) {
    return;
  }

  const songId = button.dataset.id;

  const song = songs.find((item) => item.id === songId);

  if (!song) {
    return;
  }

  playSong(song);
});

// ========================================
// PLAY SONG FUNCTION
// ========================================

function playSong(song) {
  const videoId = getYouTubeVideoId(song.youtubeUrl);

  if (!videoId) {
    Swal.fire({
      icon: "error",

      title: "Invalid YouTube link",

      text: "This song does not have a valid YouTube URL.",
    });

    return;
  }

  nowPlayingTitle.textContent = song.title;

  nowPlayingArtist.textContent = song.artist || "Unknown Artist";

  adminPlayerCard.classList.remove("d-none");

  youtubePlayerContainer.classList.remove("d-none");

  youtubePlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

  youtubePlayerContainer.scrollIntoView({
    behavior: "smooth",

    block: "center",
  });
}

// ========================================
// CLOSE PLAYER
// ========================================

if (closePlayerBtn) {
  closePlayerBtn.addEventListener("click", () => {
    youtubePlayer.src = "";

    youtubePlayerContainer.classList.add("d-none");

    adminPlayerCard.classList.add("d-none");
  });
}

// ========================================
// EDIT SONG
// ========================================

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".edit-song-btn");

  if (!button) {
    return;
  }

  const songId = button.dataset.id;

  const song = songs.find((item) => item.id === songId);

  if (!song) {
    return;
  }

  const result = await Swal.fire({
    title: "Edit Song",

    html: `

                    <div class="text-start">

                        <label class="form-label">
                            Song Title
                        </label>

                        <input
                            id="editSongTitle"
                            class="form-control mb-3"
                            value="${escapeHtml(song.title || "")}"
                        >


                        <label class="form-label">
                            Artist
                        </label>

                        <input
                            id="editSongArtist"
                            class="form-control mb-3"
                            value="${escapeHtml(song.artist || "")}"
                        >


                        <label class="form-label">
                            YouTube URL
                        </label>

                        <input
                            id="editSongUrl"
                            class="form-control"
                            value="${escapeHtml(song.youtubeUrl || "")}"
                        >

                    </div>

                `,

    showCancelButton: true,

    confirmButtonText: "Save Changes",

    cancelButtonText: "Cancel",

    confirmButtonColor: "#6f4e37",

    focusConfirm: false,

    preConfirm: () => {
      const title = document.getElementById("editSongTitle").value.trim();

      const artist = document.getElementById("editSongArtist").value.trim();

      const url = document.getElementById("editSongUrl").value.trim();

      if (!title || !artist || !url) {
        Swal.showValidationMessage("Please complete all fields.");

        return false;
      }

      if (!isYouTubeUrl(url)) {
        Swal.showValidationMessage("Please enter a valid YouTube URL.");

        return false;
      }

      return {
        title,
        artist,
        url,
      };
    },
  });

  if (!result.isConfirmed || !result.value) {
    return;
  }

  try {
    const { title, artist, url } = result.value;

    await updateDoc(
      doc(db, "songs", songId),

      {
        title: title,

        artist: artist,

        youtubeUrl: url,

        updatedAt: serverTimestamp(),

        updatedBy: auth.currentUser?.uid || "",
      },
    );

    // Update local data

    songs = songs.map((item) => {
      if (item.id === songId) {
        return {
          ...item,

          title: title,

          artist: artist,

          youtubeUrl: url,
        };
      }

      return item;
    });

    renderSongs();

    Swal.fire({
      icon: "success",

      title: "Song Updated!",

      text: "The song details have been updated.",

      timer: 1600,

      showConfirmButton: false,
    });
  } catch (error) {
    console.error("EDIT SONG ERROR:", error);

    Swal.fire({
      icon: "error",

      title: "Update Failed",

      text: error.message || "The song could not be updated.",
    });
  }
});

// ========================================
// DELETE SONG
// ========================================

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".delete-song-btn");

  if (!button) {
    return;
  }

  const songId = button.dataset.id;

  const song = songs.find((item) => item.id === songId);

  if (!song) {
    return;
  }

  const result = await Swal.fire({
    icon: "warning",

    title: "Delete Song?",

    html: `

                    Are you sure you want to delete

                    <strong>
                        ${escapeHtml(song.title)}
                    </strong>?

                `,

    showCancelButton: true,

    confirmButtonText: "Yes, Delete",

    cancelButtonText: "Cancel",

    confirmButtonColor: "#dc3545",
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    await deleteDoc(doc(db, "songs", songId));

    songs = songs.filter((item) => item.id !== songId);

    renderSongs();

    Swal.fire({
      icon: "success",

      title: "Deleted!",

      text: "The song has been removed.",

      timer: 1500,

      showConfirmButton: false,
    });
  } catch (error) {
    console.error("Error deleting song:", error);

    Swal.fire({
      icon: "error",

      title: "Delete Failed",

      text: error.message || "The song could not be deleted.",
    });
  }
});

// ========================================
// YOUTUBE URL VALIDATION
// ========================================

function isYouTubeUrl(url) {
  try {
    const parsedUrl = new URL(url);

    return (
      parsedUrl.hostname.includes("youtube.com") ||
      parsedUrl.hostname.includes("youtu.be")
    );
  } catch {
    return false;
  }
}

// ========================================
// GET YOUTUBE VIDEO ID
// ========================================

function getYouTubeVideoId(url) {
  try {
    const parsedUrl = new URL(url);

    // youtube.com/watch?v=XXXX

    if (parsedUrl.hostname.includes("youtube.com")) {
      return parsedUrl.searchParams.get("v");
    }

    // youtu.be/XXXX

    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.substring(1);
    }

    return null;
  } catch {
    return null;
  }
}

// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = value ?? "";

  return div.innerHTML;
}

// ========================================
// INITIAL LOAD
// ========================================

loadSongs();
