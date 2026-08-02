const menuConfig = window.SUPABASE_CONFIG;
const menuHasKey = menuConfig?.anonKey && !menuConfig.anonKey.startsWith("COLE_A_CHAVE");
const menuSupabase = menuHasKey && window.supabase
  ? window.supabase.createClient(menuConfig.url, menuConfig.anonKey)
  : null;
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

function renderCurrentGame() {
  const game = window.quickGameStore.getActive();
  const menu = document.querySelector("#current-game-menu");
  if (!game || game.status !== "active") return;
  menu.hidden = false;
  document.querySelector("#current-game-info").innerHTML = `<strong>Rodada ${Math.min(game.currentRound + 1, game.schedule.length)} de ${game.schedule.length}</strong><a href="jogo.html">Continuar jogo</a>`;
}

function updateAccount(user) {
  currentUser = user;
  nameNode.textContent = user.user_metadata?.display_name || user.email;
  emailNode.textContent = user.email;
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
