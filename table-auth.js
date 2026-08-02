const tableConfig = window.SUPABASE_CONFIG;
document.body.dataset.theme = localStorage.getItem("volley-theme") || "dark";
const tableHasKey = tableConfig?.anonKey && !tableConfig.anonKey.startsWith("COLE_A_CHAVE");
const tableSupabase = tableHasKey && window.supabase
  ? window.supabase.createClient(tableConfig.url, tableConfig.anonKey)
  : null;

function returnToLogin() {
  window.location.replace("login.html");
}
function waitForTableSession(milliseconds) { return new Promise((resolve) => window.setTimeout(resolve, milliseconds)); }

if (!tableSupabase) {
  returnToLogin();
} else {
  let tableSessionChecked = false;
  (async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data } = await tableSupabase.auth.getSession();
      if (data.session) { tableSessionChecked = true; document.body.classList.remove("app-loading"); return; }
      if (attempt < 2) await waitForTableSession(350);
    }
    tableSessionChecked = true;
    returnToLogin();
  })().catch(() => { tableSessionChecked = true; returnToLogin(); });
  tableSupabase.auth.onAuthStateChange((event, session) => {
    if (session) document.body.classList.remove("app-loading");
    else if (event === "SIGNED_OUT" && tableSessionChecked) returnToLogin();
  });
}
