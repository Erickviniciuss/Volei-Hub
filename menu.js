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

function applyTheme(theme) {
  const dark = theme === "dark";
  document.body.dataset.theme = dark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.textContent = dark ? "☀ Modo claro" : "☾ Modo escuro";
}

function returnToLogin() { window.location.replace("login.html"); }

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
  menuSupabase.auth.getSession().then(({ data }) => {
    if (!data.session) returnToLogin();
    else { updateAccount(data.session.user); document.body.classList.remove("app-loading"); }
  });
  menuSupabase.auth.onAuthStateChange((_event, session) => {
    if (!session) returnToLogin();
    else updateAccount(session.user);
  });
}

renderCurrentGame();

logoutButton.addEventListener("click", async () => { if (menuSupabase) await menuSupabase.auth.signOut({ scope: "local" }); });
