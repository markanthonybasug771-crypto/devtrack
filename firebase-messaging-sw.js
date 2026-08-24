importScripts(
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js"
);

importScripts(
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js"
);


// ========================================
// FIREBASE CONFIG
// ========================================

firebase.initializeApp({

    apiKey:
        "AIzaSyCg6wELhPyF7tlI-pwJOZhJVwFaykFGxwc",

    authDomain:
        "devotional-tracker-bc403.firebaseapp.com",

    projectId:
        "devotional-tracker-bc403",

    storageBucket:
        "devotional-tracker-bc403.firebasestorage.app",

    messagingSenderId:
        "1001762138807",

    appId:
        "1:1001762138807:web:4e4934c8855675c5083b32"

});


// ========================================
// FIREBASE MESSAGING
// ========================================

const messaging =
    firebase.messaging();


// ========================================
// BACKGROUND MESSAGE
// ========================================

messaging.onBackgroundMessage(
    (payload) => {

        console.log(
            "Background notification received:",
            payload
        );


        const title =
            payload.notification?.title ||
            "Daily Devotion Reminder 🙏";


        const options = {

            body:
                payload.notification?.body ||
                "Don't forget to spend time with God today.",

            icon:
                "/favicon.ico",

            badge:
                "/favicon.ico",

            data:
                payload.data || {}

        };


        self.registration.showNotification(
            title,
            options
        );

    }
);


// ========================================
// NOTIFICATION CLICK
// ========================================

self.addEventListener(
    "notificationclick",
    (event) => {

        event.notification.close();


        event.waitUntil(

            clients.matchAll({

                type: "window",

                includeUncontrolled: true

            }).then(
                (clientList) => {


                    // =================================
                    // FOCUS EXISTING DEVOTIONAL TRACKER
                    // =================================

                    for (
                        const client of clientList
                    ) {

                        if (
                            "focus" in client
                        ) {

                            return client.focus();

                        }

                    }


                    // =================================
                    // OPEN DEVOTIONAL PAGE
                    // =================================

                    if (
                        clients.openWindow
                    ) {

                        return clients.openWindow(
                            "/devotionals.html"
                        );

                    }

                }
            )

        );

    }
);