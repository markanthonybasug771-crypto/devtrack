// =========================================================
// DEVTRACK PAGE TRANSITIONS
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------------------------------
  // PAGE ENTER ANIMATION
  // -----------------------------------------------------

  document.body.classList.add("page-enter");

  // -----------------------------------------------------
  // PAGE NAVIGATION
  // -----------------------------------------------------

  const links = document.querySelectorAll('a[href]:not([href="#"])');

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");

      // Ignore invalid links
      if (!href) {
        return;
      }

      // Ignore anchor links
      if (href.startsWith("#")) {
        return;
      }

      // Ignore external links
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("//")
      ) {
        return;
      }

      // Ignore new-tab links
      if (link.target === "_blank") {
        return;
      }

      // Ignore download links
      if (link.hasAttribute("download")) {
        return;
      }

      event.preventDefault();

      // Prevent double clicking
      if (document.body.classList.contains("page-exit")) {
        return;
      }

      // Start exit animation
      document.body.classList.remove("page-enter");

      document.body.classList.add("page-exit");

      // Navigate after animation
      setTimeout(() => {
        window.location.href = href;
      }, 250);
    });
  });
});

// ========================================
// PAGE TRANSITION
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  // ========================================
  // PAGE ENTER
  // ========================================

  const direction = sessionStorage.getItem("pageTransition");

  if (direction === "signup") {
    body.classList.add("page-enter-right");

    sessionStorage.removeItem("pageTransition");
  } else if (direction === "login") {
    body.classList.add("page-enter-left");

    sessionStorage.removeItem("pageTransition");
  }

  // ========================================
  // SIGN UP LINK
  // LOGIN → SIGNUP
  // ========================================

  const signupLink = document.getElementById("signupLink");

  if (signupLink) {
    signupLink.addEventListener("click", (e) => {
      e.preventDefault();

      sessionStorage.setItem("pageTransition", "signup");

      body.classList.add("page-exit-left");

      setTimeout(() => {
        window.location.href = signupLink.href;
      }, 450);
    });
  }

  // ========================================
  // LOGIN LINK
  // SIGNUP → LOGIN
  // ========================================

  const loginLink = document.getElementById("loginLink");

  if (loginLink) {
    loginLink.addEventListener("click", (e) => {
      e.preventDefault();

      sessionStorage.setItem("pageTransition", "login");

      body.classList.add("page-exit-right");

      setTimeout(() => {
        window.location.href = loginLink.href;
      }, 450);
    });
  }
});
