// ========================================
// DEVOTIONAL TRACKER PWA INSTALL
// ========================================

let deferredPrompt = null;


// ========================================
// ELEMENTS
// ========================================

const installContainer =
    document.getElementById("installAppContainer");

const installButton =
    document.getElementById("installAppBtn");


// ========================================
// SHOW INSTALL BUTTON
// ========================================

function showInstallButton() {

    if (!installContainer) {
        return;
    }

    installContainer.classList.remove("d-none");

}


// ========================================
// HIDE INSTALL BUTTON
// ========================================

function hideInstallButton() {

    if (!installContainer) {
        return;
    }

    installContainer.classList.add("d-none");

}


// ========================================
// CHECK IF APP IS ALREADY INSTALLED
// ========================================

function isAppInstalled() {

    return (

        window.matchMedia(
            "(display-mode: standalone)"
        ).matches ||

        window.navigator.standalone === true

    );

}


// ========================================
// CHECK IOS
// ========================================

function isIOS() {

    return (

        /iPhone|iPad|iPod/i.test(
            navigator.userAgent
        ) ||

        (
            navigator.platform === "MacIntel" &&
            navigator.maxTouchPoints > 1
        )

    );

}


// ========================================
// BEFORE INSTALL PROMPT
// ANDROID / CHROME / EDGE / DESKTOP
// ========================================

window.addEventListener(
    "beforeinstallprompt",
    (event) => {

        console.log(
            "PWA install is available."
        );


        // Prevent browser's default prompt.

        event.preventDefault();


        // Save the event.

        deferredPrompt = event;


        // Show our custom install card.

        showInstallButton();

    }
);


// ========================================
// INSTALL BUTTON
// ========================================

if (installButton) {

    installButton.addEventListener(
        "click",
        async () => {


            // ====================================
            // ANDROID / DESKTOP
            // ====================================

            if (deferredPrompt) {

                deferredPrompt.prompt();


                const result =
                    await deferredPrompt.userChoice;


                console.log(
                    "Install result:",
                    result.outcome
                );


                // Prompt can only be used once.

                deferredPrompt = null;


                // Hide our custom button.

                hideInstallButton();


                return;

            }


            // ====================================
            // IOS
            // ====================================

            if (isIOS()) {

                showIOSInstructions();

                return;

            }


            // ====================================
            // OTHER BROWSER
            // ====================================

            showBrowserInstructions();

        }
    );

}


// ========================================
// IOS INSTALL INSTRUCTIONS
// ========================================

function showIOSInstructions() {

    if (
        typeof Swal === "undefined"
    ) {

        alert(

            "To install Devotional Tracker:\n\n" +

            "1. Tap the Share button.\n" +

            "2. Select Add to Home Screen.\n" +

            "3. Tap Add."

        );

        return;

    }


    Swal.fire({

        icon: "info",

        title: "Install Devotional Tracker 📱",

        html: `

            <div style="text-align:left">

                <p>
                    You can install Devotional Tracker
                    directly on your iPhone or iPad.
                </p>

                <ol>

                    <li>
                        Tap the
                        <strong>Share</strong>
                        button.
                    </li>

                    <li>
                        Select
                        <strong>
                            Add to Home Screen
                        </strong>.
                    </li>

                    <li>
                        Tap
                        <strong>Add</strong>.
                    </li>

                </ol>

            </div>

        `,

        confirmButtonColor: "#6f4e37",

        confirmButtonText: "Got it"

    });

}


// ========================================
// OTHER BROWSER
// ========================================

function showBrowserInstructions() {

    if (
        typeof Swal === "undefined"
    ) {

        alert(

            "Open your browser menu and choose " +

            "Install App or Add to Home Screen."

        );

        return;

    }


    Swal.fire({

        icon: "info",

        title: "Install Devotional Tracker",

        html: `

            <p>
                Open your browser menu and select
                <strong>
                    Install App
                </strong>
                or
                <strong>
                    Add to Home Screen
                </strong>.
            </p>

        `,

        confirmButtonColor: "#6f4e37",

        confirmButtonText: "Got it"

    });

}


// ========================================
// APP INSTALLED
// ========================================

window.addEventListener(
    "appinstalled",
    () => {

        console.log(
            "Devotional Tracker installed."
        );


        deferredPrompt = null;


        hideInstallButton();

    }
);


// ========================================
// ALREADY INSTALLED
// ========================================

if (isAppInstalled()) {

    console.log(
        "Devotional Tracker is already installed."
    );


    hideInstallButton();

}


// ========================================
// IOS
// ========================================

// iOS does not support beforeinstallprompt.
//
// Therefore we manually show the
// install card when appropriate.

if (
    isIOS() &&
    !isAppInstalled()
) {

    showInstallButton();

}