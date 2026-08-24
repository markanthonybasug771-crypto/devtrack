// ========================================
// USER PLAYLIST
// ========================================

import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ========================================
// ELEMENTS
// ========================================

const songList =
    document.getElementById("songList");

const myPlaylist =
    document.getElementById("myPlaylist");

const playlistCount =
    document.getElementById("playlistCount");


// ========================================
// DATA
// ========================================

let songs = [];

let playlistSongs = [];

let currentUser = null;


// ========================================
// AUTH STATE
// ========================================

auth.onAuthStateChanged((user) => {

    if (!user) {

        window.location.href =
            "index.html";

        return;

    }


    currentUser = user;


    loadSongs();

    loadMyPlaylist();

});


// ========================================
// LOAD SONGS
// ========================================

async function loadSongs() {

    if (!songList) {
        return;
    }


    try {

        songList.innerHTML = `

            <div class="text-center py-5">

                <div class="spinner-border"></div>

                <p class="text-muted mt-3">
                    Loading worship songs...
                </p>

            </div>

        `;


        const songsQuery =
            query(
                collection(db, "songs"),
                orderBy(
                    "createdAt",
                    "desc"
                )
            );


        const snapshot =
            await getDocs(
                songsQuery
            );


        songs = [];


        snapshot.forEach((songDoc) => {

            const data =
                songDoc.data();


            // Only show active songs

            if (
                data.active !== false
            ) {

                songs.push({

                    id:
                        songDoc.id,

                    ...data

                });

            }

        });


        renderSongs();


    } catch (error) {

        console.error(
            "Error loading songs:",
            error
        );


        songList.innerHTML = `

            <div class="alert alert-danger">

                <i class="bi bi-exclamation-triangle me-2"></i>

                Failed to load worship songs.

            </div>

        `;

    }

}


// ========================================
// RENDER SONGS
// ========================================

function renderSongs() {

    if (!songList) {
        return;
    }


    songList.innerHTML = "";


    if (songs.length === 0) {

        songList.innerHTML = `

            <div class="playlist-empty">

                <div class="playlist-empty-icon">

                    <i class="bi bi-music-note-list"></i>

                </div>

                <h5>
                    No songs available
                </h5>

                <p>
                    The Music Team has not added
                    any worship songs yet.
                </p>

            </div>

        `;

        return;

    }


    songs.forEach((song) => {

        const isAdded =
            playlistSongs.some(
                item =>
                    item.songId === song.id
            );


        const card =
            document.createElement(
                "div"
            );


        card.className =
            "song-card";


        card.innerHTML = `

            <div class="song-cover">

                <i class="bi bi-music-note-beamed"></i>

            </div>


            <div class="song-info">

                <h5>
                    ${escapeHtml(
                        song.title
                    )}
                </h5>

                <p>
                    ${escapeHtml(
                        song.artist ||
                        "Unknown Artist"
                    )}
                </p>

            </div>


            <div class="song-actions">


                <!-- PLAY -->

                <button

                    class="song-play-btn"

                    type="button"

                    data-song-id="${song.id}"

                    title="Play"

                >

                    <i class="bi bi-play-fill"></i>

                </button>


                <!-- ADD / REMOVE -->

                <button

                    class="song-add-btn
                    ${isAdded ? "added" : ""}"

                    type="button"

                    data-song-id="${song.id}"

                    title="${
                        isAdded
                            ? "Remove from Playlist"
                            : "Add to Playlist"
                    }"

                >

                    <i class="bi ${
                        isAdded
                            ? "bi-check-lg"
                            : "bi-plus-lg"
                    }"></i>

                </button>


            </div>

        `;


        songList.appendChild(
            card
        );

    });

}


// ========================================
// LOAD MY PLAYLIST
// ========================================

function loadMyPlaylist() {

    if (!currentUser) {
        return;
    }


    const playlistRef =
        collection(
            db,
            "userPlaylists",
            currentUser.uid,
            "songs"
        );


    const playlistQuery =
        query(
            playlistRef,
            orderBy(
                "addedAt",
                "desc"
            )
        );


    onSnapshot(

        playlistQuery,

        (snapshot) => {

            playlistSongs = [];


            snapshot.forEach(
                (songDoc) => {

                    playlistSongs.push({

                        id:
                            songDoc.id,

                        ...songDoc.data()

                    });

                }
            );


            renderMyPlaylist();

            renderSongs();

        },

        (error) => {

            console.error(
                "Playlist error:",
                error
            );

        }

    );

}


// ========================================
// RENDER MY PLAYLIST
// ========================================

function renderMyPlaylist() {

    if (!myPlaylist) {
        return;
    }


    myPlaylist.innerHTML = "";


    if (playlistCount) {

        playlistCount.textContent =
            `${playlistSongs.length} ${
                playlistSongs.length === 1
                    ? "song"
                    : "songs"
            }`;

    }


    if (
        playlistSongs.length === 0
    ) {

        myPlaylist.innerHTML = `

            <div class="playlist-empty">

                <div class="playlist-empty-icon">

                    <i class="bi bi-music-note-list"></i>

                </div>

                <h5>
                    Your playlist is empty
                </h5>

                <p>
                    Add songs from the worship
                    collection below.
                </p>

            </div>

        `;

        return;

    }


    playlistSongs.forEach(
        (song) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "playlist-song-item";


            item.innerHTML = `

                <div class="playlist-song-icon">

                    <i class="bi bi-music-note-beamed"></i>

                </div>


                <div class="playlist-song-info">

                    <h6>
                        ${escapeHtml(
                            song.title
                        )}
                    </h6>

                    <p>
                        ${escapeHtml(
                            song.artist ||
                            "Unknown Artist"
                        )}
                    </p>

                </div>


                <div class="playlist-song-actions">


                    <!-- PLAY -->

                    <button

                        type="button"

                        class="playlist-play-btn"

                        data-playlist-id="${song.id}"

                        title="Play"

                    >

                        <i class="bi bi-play-fill"></i>

                    </button>


                    <!-- REMOVE -->

                    <button

                        type="button"

                        class="playlist-remove-btn"

                        data-playlist-id="${song.id}"

                        title="Remove"

                    >

                        <i class="bi bi-x-lg"></i>

                    </button>


                </div>

            `;


            myPlaylist.appendChild(
                item
            );

        }
    );

}


// ========================================
// ADD / REMOVE PLAYLIST
// ========================================

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                ".song-add-btn"
            );


        if (!button) {
            return;
        }


        const songId =
            button.dataset.songId;


        const song =
            songs.find(
                item =>
                    item.id === songId
            );


        if (!song) {
            return;
        }


        if (!currentUser) {

            Swal.fire({

                icon:
                    "warning",

                title:
                    "Login Required",

                text:
                    "Please login first."

            });

            return;

        }


        const existing =
            playlistSongs.find(
                item =>
                    item.songId === songId
            );


        try {

            button.disabled = true;


            // ====================================
            // REMOVE
            // ====================================

            if (existing) {

                await deleteDoc(

                    doc(
                        db,
                        "userPlaylists",
                        currentUser.uid,
                        "songs",
                        existing.id
                    )

                );


                Swal.fire({

                    icon:
                        "success",

                    title:
                        "Removed",

                    text:
                        "Song removed from your playlist.",

                    timer:
                        1200,

                    showConfirmButton:
                        false

                });


                return;

            }


            // ====================================
            // ADD
            // ====================================

            await addDoc(

                collection(
                    db,
                    "userPlaylists",
                    currentUser.uid,
                    "songs"
                ),

                {

                    songId:
                        song.id,

                    title:
                        song.title,

                    artist:
                        song.artist ||
                        "Unknown Artist",

                    youtubeUrl:
                        song.youtubeUrl,

                    addedAt:
                        serverTimestamp()

                }

            );


            Swal.fire({

                icon:
                    "success",

                title:
                    "Added to Playlist!",

                text:
                    `${song.title} was added to your playlist.`,

                timer:
                    1200,

                showConfirmButton:
                    false

            });


        } catch (error) {

            console.error(
                "Playlist update error:",
                error
            );


            Swal.fire({

                icon:
                    "error",

                title:
                    "Something went wrong",

                text:
                    error.message ||
                    "Could not update your playlist."

            });


        } finally {

            button.disabled =
                false;

        }

    }
);


// ========================================
// PLAY FROM SONG COLLECTION
// ========================================

document.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                ".song-play-btn"
            );


        if (!button) {
            return;
        }


        const songId =
            button.dataset.songId;


        if (!songId) {
            return;
        }


        // Use persistent music player

        if (
            typeof window
                .devtrackPlaySongById ===
            "function"
        ) {

            window.devtrackPlaySongById(
                songId
            );

        } else {

            console.error(
                "Persistent music player is not ready."
            );

            Swal.fire({

                icon:
                    "warning",

                title:
                    "Music Player Loading",

                text:
                    "Please wait a moment and try again."

            });

        }

    }
);


// ========================================
// PLAY FROM MY PLAYLIST
// ========================================

document.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                ".playlist-play-btn"
            );


        if (!button) {
            return;
        }


        const playlistId =
            button.dataset.playlistId;


        const playlistSong =
            playlistSongs.find(
                item =>
                    item.id === playlistId
            );


        if (!playlistSong) {
            return;
        }


        const songId =
            playlistSong.songId;


        if (!songId) {

            Swal.fire({

                icon:
                    "error",

                title:
                    "Song Not Found",

                text:
                    "This playlist song is missing its original song ID."

            });

            return;

        }


        // Use persistent music player

        if (
            typeof window
                .devtrackPlaySongById ===
            "function"
        ) {

            window.devtrackPlaySongById(
                songId
            );

        } else {

            console.error(
                "Persistent music player is not ready."
            );

            Swal.fire({

                icon:
                    "warning",

                title:
                    "Music Player Loading",

                text:
                    "Please wait a moment and try again."

            });

        }

    }
);


// ========================================
// REMOVE FROM MY PLAYLIST
// ========================================

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                ".playlist-remove-btn"
            );


        if (!button) {
            return;
        }


        const playlistId =
            button.dataset.playlistId;


        if (!currentUser) {
            return;
        }


        const result =
            await Swal.fire({

                icon:
                    "warning",

                title:
                    "Remove Song?",

                text:
                    "Remove this song from your playlist?",

                showCancelButton:
                    true,

                confirmButtonText:
                    "Remove",

                cancelButtonText:
                    "Cancel",

                confirmButtonColor:
                    "#dc3545"

            });


        if (
            !result.isConfirmed
        ) {
            return;
        }


        try {

            await deleteDoc(

                doc(
                    db,
                    "userPlaylists",
                    currentUser.uid,
                    "songs",
                    playlistId
                )

            );


            Swal.fire({

                icon:
                    "success",

                title:
                    "Removed!",

                timer:
                    1200,

                showConfirmButton:
                    false

            });


        } catch (error) {

            console.error(
                "Remove playlist error:",
                error
            );


            Swal.fire({

                icon:
                    "error",

                title:
                    "Remove Failed",

                text:
                    error.message ||
                    "Could not remove song."

            });

        }

    }
);


// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}