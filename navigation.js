document.documentElement.classList.add("has-mobile-menu");

document.addEventListener("DOMContentLoaded", () => {
  const topbar = document.querySelector(".topbar");
  const menuButton = document.querySelector(".menu-toggle");
  const menu = document.getElementById("primary-navigation");

  if (!topbar || !menuButton || !menu) {
    return;
  }

  const mobileViewport = window.matchMedia("(max-width: 700px)");

  function setMenuOpen(open, restoreFocus = false) {
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
    menu.classList.toggle("is-open", open);

    if (!open && restoreFocus) {
      menuButton.focus();
    }
  }

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    setMenuOpen(!isOpen);
  });

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menuButton.getAttribute("aria-expanded") === "true"
    ) {
      setMenuOpen(false, true);
    }
  });

  document.addEventListener("click", (event) => {
    if (
      menuButton.getAttribute("aria-expanded") === "true" &&
      !topbar.contains(event.target)
    ) {
      setMenuOpen(false);
    }
  });

  mobileViewport.addEventListener("change", (event) => {
    if (!event.matches) {
      setMenuOpen(false);
    }
  });
});
