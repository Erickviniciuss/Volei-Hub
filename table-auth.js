const tableConfig = window.SUPABASE_CONFIG;
document.body.dataset.theme = localStorage.getItem("volley-theme") || "dark";
const tableHasKey = tableConfig?.anonKey && !tableConfig.anonKey.startsWith("COLE_A_CHAVE");
const tableSupabase = tableHasKey && window.supabase
  ? window.supabase.createClient(tableConfig.url, tableConfig.anonKey)
  : null;

function returnToLogin() {
  window.location.replace("login.html");
}

if (!tableSupabase) {
  returnToLogin();
} else {
  tableSupabase.auth.getSession().then(({ data }) => {
    if (!data.session) returnToLogin();
    else document.body.classList.remove("app-loading");
  });
  tableSupabase.auth.onAuthStateChange((_event, session) => {
    if (!session) returnToLogin();
  });
}
