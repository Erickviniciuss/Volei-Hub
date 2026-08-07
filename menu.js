const menuConfig = window.SUPABASE_CONFIG;
const menuHasKey = menuConfig?.anonKey && !menuConfig.anonKey.startsWith("COLE_A_CHAVE");
const menuSupabase = menuHasKey ? window.supabaseClient || null : null;
const nameNode = document.querySelector("#account-name");
const emailNode = document.querySelector("#account-email");
const logoutButton = document.querySelector("#logout-button");
const themeToggle = document.querySelector("#theme-toggle");
let currentUser = null;
let sessionChecked = false;

function applyTheme(theme) {
  const dark = theme === "dark";
  document.body.dataset.theme = dark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.textContent = dark ? "☀ Modo claro" : "☾ Modo escuro";
}

function returnToLogin() { window.location.replace("login.html"); }
function waitForSession(milliseconds) { return new Promise((resolve) => window.setTimeout(resolve, milliseconds)); }

function renderCurrentGame(game = window.quickGameStore.getActive()) {
  const menu = document.querySelector("#current-game-menu");
  if (!game || game.status !== "active" || game.started !== true) return;
  menu.hidden = false;
  const href = game.gameType === "points" ? "jogoajogo.html" : "jogo.html";
  const label = game.gameType === "points" ? "Jogo Ponto a Ponto" : "Jogo por Resultado";
  document.querySelector("#current-game-info").innerHTML = `<strong>${label} · Rodada ${Math.min(game.currentRound + 1, game.schedule.length)} de ${game.schedule.length}</strong><a href="${href}">Continuar jogo</a>`;
  document.querySelectorAll("[data-game-mode]").forEach((action) => {
    const unavailable = action.dataset.gameMode !== game.gameType;
    action.classList.toggle("is-disabled", unavailable);
    action.setAttribute("aria-disabled", String(unavailable));
    if (unavailable) action.title = "Há outro jogo em andamento.";
    else action.removeAttribute("title");
  });
}

function updateAccount(user) {
  currentUser = user;
  nameNode.textContent = user.user_metadata?.display_name || user.email;
  emailNode.textContent = user.email;
  window.quickGameStore.getOwnActiveLiveGame().then(({ data }) => { if (data?.status === "active" && data.started === true) renderCurrentGame(data); }).catch(() => {});
}

if (!menuSupabase) returnToLogin();
else {
  (async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data } = await menuSupabase.auth.getSession();
      if (data.session) {
        sessionChecked = true;
        updateAccount(data.session.user);
        document.body.classList.remove("app-loading");
        return;
      }
      if (attempt < 2) await waitForSession(350);
    }
    sessionChecked = true;
    returnToLogin();
  })().catch(() => { sessionChecked = true; returnToLogin(); });
  menuSupabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      updateAccount(session.user);
      document.body.classList.remove("app-loading");
    } else if (event === "SIGNED_OUT" && sessionChecked) {
      returnToLogin();
    }
  });
}

renderCurrentGame();

logoutButton.addEventListener("click", async () => { if (menuSupabase) await menuSupabase.auth.signOut({ scope: "local" }); });
document.querySelectorAll("[data-game-mode]").forEach((action) => action.addEventListener("click", (event) => { if (action.getAttribute("aria-disabled") === "true") event.preventDefault(); }));
