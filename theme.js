function applyProjectTheme(theme) {
  const selectedTheme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = selectedTheme;
  document.querySelectorAll("[data-theme-toggle], #theme-toggle").forEach((button) => {
    const dark = selectedTheme === "dark";
    button.setAttribute("aria-pressed", String(dark));
    button.textContent = dark ? "☀" : "☾";
    button.setAttribute("aria-label", dark ? "Ativar modo claro" : "Ativar modo escuro");
    button.title = dark ? "Ativar modo claro" : "Ativar modo escuro";
  });
  document.querySelectorAll("[data-theme-logo]").forEach((logo) => {
    logo.src = selectedTheme === "dark" ? "assets/logo_escuro.png" : "assets/logo_claro.png";
  });
}

applyProjectTheme(localStorage.getItem("volley-theme") || "dark");
document.querySelectorAll("[data-theme-toggle], #theme-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("volley-theme", nextTheme);
    applyProjectTheme(nextTheme);
  });
});
