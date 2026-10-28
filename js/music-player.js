// ========================================
// DEVTRACK PERSISTENT MUSIC PLAYER
// ========================================

import { auth, db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ========================================
// PLAYER STATE
// ========================================

let songs = [];

let currentSongIndex = -1;

let isPlaying = false;

let currentTime = 0;

let duration = 0;

let player = null;

let playerReady = false;

// ========================================
// STORAGE KEY
// ========================================

function getPlayerStorageKey() {
  if (!auth.currentUser) {
    return null;
  }

  return `devtrackMusicPlayer_${auth.currentUser.uid}`;
}

// ========================================
// GET SAVED STATE
// ========================================

function getSavedState() {
  try {
    const storageKey = getPlayerStorageKey();

    if (!storageKey) {
      return null;
    }

    const saved = localStorage.getItem(storageKey);

    if (!saved) {
      return null;
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error("Failed to read player state:", error);

    return null;
  }
}

// ========================================
// SAVE PLAYER STATE
// ========================================

function savePlayerState() {
  if (currentSongIndex < 0 || !songs[currentSongIndex]) {
    return;
  }

  const storageKey = getPlayerStorageKey();

  if (!storageKey) {
    return;
  }

  const song = songs[currentSongIndex];

  const state = {
    songId: song.id,

    songIndex: currentSongIndex,

    currentTime: currentTime,

    isPlaying: isPlaying,
  };

  localStorage.setItem(
    storageKey,

    JSON.stringify(state),
  );
}

// ========================================
// CREATE PLAYER UI
// ========================================

function createPlayerUI() {
  if (document.getElementById("devtrackMusicPlayer")) {
    return;
  }

  const playerHTML = `

        <div
            id="devtrackMusicPlayer"
            class="devtrack-music-player hidden"
        >

            <div class="music-player-inner">


                <!-- COVER -->

                <div class="music-player-cover">

                    <i class="bi bi-music-note-beamed"></i>

                </div>


                <!-- SONG INFO -->

                <div class="music-player-info">

                    <p
                        id="musicPlayerTitle"
                        class="music-player-title"
                    >
                        No song playing
                    </p>

                    <p
                        id="musicPlayerArtist"
                        class="music-player-artist"
                    >
                        Devotional Tracker
                    </p>

                </div>


                <!-- CONTROLS -->

                <div class="music-player-controls">


                    <!-- PREVIOUS -->

                    <button
                        type="button"
                        class="music-player-btn"
                        id="musicPlayerPrevious"
                        title="Previous"
                    >

                        <i class="bi bi-skip-start-fill"></i>

                    </button>


                    <!-- PLAY / PAUSE -->

                    <button
                        type="button"
                        class="music-player-btn main"
                        id="musicPlayerPlayPause"
                        title="Play"
                    >

                        <i
                            class="bi bi-play-fill"
                            id="musicPlayerPlayPauseIcon"
                        ></i>

                    </button>


                    <!-- NEXT -->

                    <button
                        type="button"
                        class="music-player-btn"
                        id="musicPlayerNext"
                        title="Next"
                    >

                        <i class="bi bi-skip-end-fill"></i>

                    </button>

                </div>


                <!-- PROGRESS -->

                <div class="music-player-progress-area">


                    <span
                        id="musicPlayerCurrentTime"
                        class="music-player-time"
                    >
                        0:00
                    </span>


                    <input
                        type="range"
                        id="musicPlayerProgress"
                        class="music-player-progress"
                        min="0"
                        max="100"
                        value="0"
                    >


                    <span
                        id="musicPlayerDuration"
                        class="music-player-time"
                    >
                        0:00
                    </span>

                </div>


                <!-- CLOSE -->

                <button
                    type="button"
                    class="music-player-close"
                    id="musicPlayerClose"
                    title="Close player"
                >

                    <i class="bi bi-x-lg"></i>

                </button>

            </div>

        </div>

    `;

  document.body.insertAdjacentHTML(
    "beforeend",

    playerHTML,
  );
}

// ========================================
// ELEMENTS
// ========================================

let playerContainer;

let playerTitle;

let playerArtist;

let playPauseButton;

let playPauseIcon;

let previousButton;

let nextButton;

let progressBar;

let currentTimeDisplay;

let durationDisplay;

let closeButton;

// ========================================
// INITIALIZE ELEMENTS
// ========================================

function initializeElements() {
  playerContainer = document.getElementById("devtrackMusicPlayer");

  playerTitle = document.getElementById("musicPlayerTitle");

  playerArtist = document.getElementById("musicPlayerArtist");

  playPauseButton = document.getElementById("musicPlayerPlayPause");

  playPauseIcon = document.getElementById("musicPlayerPlayPauseIcon");

  previousButton = document.getElementById("musicPlayerPrevious");

  nextButton = document.getElementById("musicPlayerNext");

  progressBar = document.getElementById("musicPlayerProgress");

  currentTimeDisplay = document.getElementById("musicPlayerCurrentTime");

  durationDisplay = document.getElementById("musicPlayerDuration");

  closeButton = document.getElementById("musicPlayerClose");
}

// ========================================
// LOAD SONGS
// ========================================

async function loadSongs() {
  try {
    const songsQuery = query(
      collection(db, "songs"),

      orderBy("createdAt", "asc"),
    );

    const snapshot = await getDocs(songsQuery);

    songs = [];

    snapshot.forEach((songDocument) => {
      const data = songDocument.data();

      // Only active songs

      if (data.active !== false) {
        songs.push({
          id: songDocument.id,

          ...data,
        });
      }
    });

    restorePlayer();
  } catch (error) {
    console.error(
      "Failed to load music:",

      error,
    );
  }
}

// ========================================
// YOUTUBE VIDEO ID
// ========================================

function getYouTubeVideoId(url) {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);

    // youtube.com/watch?v=VIDEO_ID

    if (parsedUrl.hostname.includes("youtube.com")) {
      const videoId = parsedUrl.searchParams.get("v");

      if (videoId) {
        return videoId;
      }

      // youtube.com/embed/VIDEO_ID

      if (parsedUrl.pathname.startsWith("/embed/")) {
        return parsedUrl.pathname.split("/embed/")[1].split("/")[0];
      }

      // youtube.com/shorts/VIDEO_ID

      if (parsedUrl.pathname.startsWith("/shorts/")) {
        return parsedUrl.pathname.split("/shorts/")[1].split("/")[0];
      }
    }

    // youtu.be/VIDEO_ID

    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.substring(1).split("/")[0];
    }

    return null;
  } catch {
    return null;
  }
}

// ========================================
// PLAY SONG
// ========================================

function playSong(index) {
  if (!songs[index]) {
    console.error("Song index not found:", index);

    return;
  }

  currentSongIndex = index;

  const song = songs[index];

  const videoId = getYouTubeVideoId(song.youtubeUrl);

  if (!videoId) {
    console.error("Invalid YouTube URL:", song.youtubeUrl);

    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "error",

        title: "Invalid YouTube Link",

        text: "This song does not have a valid YouTube URL.",
      });
    }

    return;
  }

  playerTitle.textContent = song.title || "Unknown Song";

  playerArtist.textContent = song.artist || "Unknown Artist";

  playerContainer.classList.remove("hidden");

  currentTime = 0;

  progressBar.value = 0;

  currentTimeDisplay.textContent = "0:00";

  durationDisplay.textContent = "0:00";

  /*
        If YouTube player is already ready,
        immediately load and play the song.
    */

  if (playerReady && player) {
    player.loadVideoById(videoId);
  } else {
    /*
            Player is not ready yet.

            Save selected song so that
            once YouTube API becomes ready,
            it can be played.
        */

    savePlayerState();
  }
}

// ========================================
// PLAY SONG BY ID
// ========================================

window.devtrackPlaySongById = function (songId) {
  if (!songId) {
    console.error("No song ID supplied.");

    return;
  }

  const index = songs.findIndex((song) => song.id === songId);

  if (index === -1) {
    console.error("Song not found:", songId);

    /*
                Songs may still be loading.
                Try loading them again.
            */

    loadSongs();

    return;
  }

  playSong(index);
};

// ========================================
// PLAY / PAUSE
// ========================================

function togglePlayPause() {
  if (!playerReady || !player) {
    return;
  }

  if (currentSongIndex < 0) {
    return;
  }

  if (isPlaying) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
}

// ========================================
// PREVIOUS
// ========================================

function playPrevious() {
  if (!songs.length) {
    return;
  }

  let index = currentSongIndex - 1;

  if (index < 0) {
    index = songs.length - 1;
  }

  playSong(index);
}

// ========================================
// NEXT
// ========================================

function playNext() {
  if (!songs.length) {
    return;
  }

  let index = currentSongIndex + 1;

  if (index >= songs.length) {
    index = 0;
  }

  playSong(index);
}

// ========================================
// FORMAT TIME
// ========================================

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);

  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

// ========================================
// UPDATE PLAYER UI
// ========================================

function updatePlayerUI() {
  if (!playerReady || !player) {
    return;
  }

  try {
    currentTime = player.getCurrentTime() || 0;

    duration = player.getDuration() || 0;

    currentTimeDisplay.textContent = formatTime(currentTime);

    durationDisplay.textContent = formatTime(duration);

    if (duration > 0) {
      progressBar.value = (currentTime / duration) * 100;
    }
  } catch {
    // Ignore player errors
  }
}

// ========================================
// RESTORE PLAYER
// ========================================

function restorePlayer() {
  const saved = getSavedState();

  if (!saved) {
    return;
  }

  const index = songs.findIndex((song) => song.id === saved.songId);

  if (index === -1) {
    return;
  }

  currentSongIndex = index;

  const song = songs[index];

  const videoId = getYouTubeVideoId(song.youtubeUrl);

  if (!videoId) {
    console.error("Invalid YouTube URL while restoring:", song.youtubeUrl);

    return;
  }

  playerTitle.textContent = song.title || "Unknown Song";

  playerArtist.textContent = song.artist || "Unknown Artist";

  playerContainer.classList.remove("hidden");

  currentTime = saved.currentTime || 0;

  /*
        The important part:

        Load the saved YouTube video
        into the hidden player after
        the YouTube API is ready.
    */

  if (playerReady && player) {
    player.cueVideoById({
      videoId: videoId,

      startSeconds: currentTime,
    });
  }

  /*
        Always restore the player
        in paused state after reload.

        User can press Play to continue.
    */

  isPlaying = false;

  updatePlayPauseIcon();
}

// ========================================
// PLAY/PAUSE ICON
// ========================================

function updatePlayPauseIcon() {
  if (!playPauseIcon) {
    return;
  }

  if (isPlaying) {
    playPauseIcon.className = "bi bi-pause-fill";

    playPauseButton.title = "Pause";
  } else {
    playPauseIcon.className = "bi bi-play-fill";

    playPauseButton.title = "Play";
  }
}

// ========================================
// BUTTON EVENTS
// ========================================

function setupEvents() {
  playPauseButton.addEventListener(
    "click",

    togglePlayPause,
  );

  previousButton.addEventListener(
    "click",

    playPrevious,
  );

  nextButton.addEventListener(
    "click",

    playNext,
  );

  closeButton.addEventListener(
    "click",

    () => {
      if (playerReady && player) {
        player.stopVideo();
      }

      isPlaying = false;

      currentTime = 0;

      duration = 0;

      currentSongIndex = -1;

      playerContainer.classList.add("hidden");

      const storageKey = getPlayerStorageKey();

      if (storageKey) {
        localStorage.removeItem(storageKey);
      }

      updatePlayPauseIcon();

      currentTimeDisplay.textContent = "0:00";

      durationDisplay.textContent = "0:00";

      progressBar.value = 0;
    },
  );

  progressBar.addEventListener(
    "input",

    () => {
      if (!playerReady || !player) {
        return;
      }

      if (duration <= 0) {
        return;
      }

      const targetTime = (progressBar.value / 100) * duration;

      player.seekTo(
        targetTime,

        true,
      );
    },
  );
}

// ========================================
// SAVE STATE PERIODICALLY
// ========================================

setInterval(
  () => {
    if (playerReady && player && currentSongIndex >= 0) {
      updatePlayerUI();

      savePlayerState();
    }
  },

  1000,
);

// ========================================
// PAGE LEAVE
// ========================================

window.addEventListener(
  "beforeunload",

  () => {
    updatePlayerUI();

    savePlayerState();
  },
);

// ========================================
// YOUTUBE API READY
// ========================================

window.onYouTubeIframeAPIReady = function () {
  player = new YT.Player(
    "devtrackYoutubeHiddenPlayer",

    {
      height: "0",

      width: "0",

      videoId: "",

      playerVars: {
        autoplay: 0,

        controls: 0,

        rel: 0,

        playsinline: 1,
      },

      events: {
        // ============================
        // READY
        // ============================

        onReady: () => {
          playerReady = true;

          /*
                                    If a song was already
                                    selected before the
                                    YouTube API became ready,
                                    load it now.
                                */

          const saved = getSavedState();

          if (saved && saved.songId) {
            const index = songs.findIndex((song) => song.id === saved.songId);

            if (index !== -1) {
              currentSongIndex = index;

              const song = songs[index];

              const videoId = getYouTubeVideoId(song.youtubeUrl);

              if (videoId) {
                player.cueVideoById(videoId);
              }
            }
          }

          restorePlayer();
        },

        // ============================
        // STATE CHANGE
        // ============================

        onStateChange: (event) => {
          if (event.data === YT.PlayerState.PLAYING) {
            isPlaying = true;

            updatePlayPauseIcon();
          }

          if (event.data === YT.PlayerState.PAUSED) {
            isPlaying = false;

            updatePlayPauseIcon();

            updatePlayerUI();

            savePlayerState();
          }

          if (event.data === YT.PlayerState.ENDED) {
            isPlaying = false;

            updatePlayPauseIcon();

            playNext();
          }
        },
      },
    },
  );
};

// ========================================
// INITIALIZE
// ========================================

function initializeMusicPlayer() {
  createPlayerUI();

  initializeElements();

  setupEvents();

  // ========================================
  // HIDDEN YOUTUBE PLAYER
  // ========================================

  const existingPlayer = document.getElementById("devtrackYoutubeHiddenPlayer");

  if (!existingPlayer) {
    const hiddenPlayer = document.createElement("div");

    hiddenPlayer.id = "devtrackYoutubeHiddenPlayer";

    hiddenPlayer.style.position = "fixed";

    hiddenPlayer.style.width = "1px";

    hiddenPlayer.style.height = "1px";

    hiddenPlayer.style.left = "-9999px";

    hiddenPlayer.style.top = "-9999px";

    document.body.appendChild(hiddenPlayer);
  }

  // ========================================
  // LOAD YOUTUBE API
  // ========================================

  if (!window.YT) {
    const script = document.createElement("script");

    script.src = "https://www.youtube.com/iframe_api";

    document.head.appendChild(script);
  }

  // ========================================
  // WAIT FOR FIREBASE USER
  // ========================================

  auth.onAuthStateChanged((user) => {
    if (!user) {
      return;
    }

    console.log("Music player initialized for user:", user.uid);

    loadSongs();
  });
}

// ========================================
// START
// ========================================

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",

    initializeMusicPlayer,
  );
} else {
  initializeMusicPlayer();
}
