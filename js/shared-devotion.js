import { db } from "./firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ========================================
// ELEMENTS
// ========================================

const loadingState =
    document.getElementById("loadingState");

const errorState =
    document.getElementById("errorState");

const devotionContent =
    document.getElementById("devotionContent");

const devotionFormat =
    document.getElementById("devotionFormat");

const devotionDate =
    document.getElementById("devotionDate");

const devotionScripture =
    document.getElementById("devotionScripture");

const observationSection =
    document.getElementById("observationSection");

const devotionObservation =
    document.getElementById("devotionObservation");

const lessonSection =
    document.getElementById("lessonSection");

const devotionLesson =
    document.getElementById("devotionLesson");

const devotionApplication =
    document.getElementById("devotionApplication");


// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text || "";

    return div.innerHTML;
}


// ========================================
// GET SHARE ID
// ========================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const shareId =
    urlParams.get("id");


// ========================================
// LOAD SHARED DEVOTION
// ========================================

async function loadSharedDevotion() {

    if (!shareId) {

        showError();

        return;
    }


    try {

        const devotionRef =
            doc(
                db,
                "sharedDevotions",
                shareId
            );


        const devotionSnapshot =
            await getDoc(
                devotionRef
            );


        if (!devotionSnapshot.exists()) {

            showError();

            return;
        }


        const data =
            devotionSnapshot.data();


        renderDevotion(data);


    } catch (error) {

        console.error(
            "Shared devotion error:",
            error
        );

        showError();

    }

}


// ========================================
// RENDER DEVOTION
// ========================================

function renderDevotion(data) {

    const format =
        (
            data.format ||
            "SOAP"
        ).toUpperCase();


    const content =
        data.content || {};


    // ========================================
    // PUBLIC CONTENT ONLY
    // PRAYER IS NOT READ OR DISPLAYED
    // ========================================

    const scripture =
        content.scripture ||
        "";


    const observation =
        content.observation ||
        "";


    const lesson =
        content.lesson ||
        "";


    const application =
        content.application ||
        "";


    // ========================================
    // HEADER
    // ========================================

    devotionFormat.textContent =
        format;


    devotionDate.textContent =
        formatDate(
            data.date
        );


    // ========================================
    // SCRIPTURE
    // ========================================

    devotionScripture.innerHTML =
        escapeHtml(
            scripture ||
            "No scripture entered."
        );


    // ========================================
    // APPLICATION
    // ========================================

    devotionApplication.innerHTML =
        escapeHtml(
            application ||
            "No application entered."
        );


    // ========================================
    // SOAP
    // ========================================

    if (format === "SOAP") {

        observationSection
            .classList
            .remove("d-none");


        lessonSection
            .classList
            .add("d-none");


        devotionObservation.innerHTML =
            escapeHtml(
                observation ||
                "No observation entered."
            );

    }


    // ========================================
    // SLAP
    // ========================================

    else if (format === "SLAP") {

        observationSection
            .classList
            .add("d-none");


        lessonSection
            .classList
            .remove("d-none");


        devotionLesson.innerHTML =
            escapeHtml(
                lesson ||
                "No lesson entered."
            );

    }


    // ========================================
    // UNKNOWN FORMAT
    // ========================================

    else {

        observationSection
            .classList
            .add("d-none");


        lessonSection
            .classList
            .add("d-none");

    }


    // ========================================
    // SHOW CONTENT
    // ========================================

    loadingState
        .classList
        .add("d-none");


    devotionContent
        .classList
        .remove("d-none");

}


// ========================================
// FORMAT DATE
// ========================================

function formatDate(dateValue) {

    if (!dateValue) {

        return "";

    }


    const parts =
        dateValue.split("-");


    if (parts.length !== 3) {

        return dateValue;

    }


    const year =
        Number(parts[0]);


    const month =
        Number(parts[1]);


    const day =
        Number(parts[2]);


    const date =
        new Date(
            year,
            month - 1,
            day
        );


    return date.toLocaleDateString(
        "en-US",
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    );

}


// ========================================
// SHOW ERROR
// ========================================

function showError() {

    loadingState
        .classList
        .add("d-none");


    devotionContent
        .classList
        .add("d-none");


    errorState
        .classList
        .remove("d-none");

}


// ========================================
// START
// ========================================

loadSharedDevotion();