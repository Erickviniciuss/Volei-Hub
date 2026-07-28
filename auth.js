const loginTab = document.querySelector("#login-tab");
const signupTab = document.querySelector("#signup-tab");
const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const authMessage = document.querySelector("#auth-message");

const config = window.SUPABASE_CONFIG;
const hasSupabaseKey = config?.anonKey && !config.anonKey.startsWith("COLE_A_CHAVE");
const supabaseClient = hasSupabaseKey && window.supabase
  ? window.supabase.createClient(config.url, config.anonKey)
  : null;

function setMessage(message, type = "") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function showForm(form) {
  const isLogin = form === "login";
  loginForm.hidden = !isLogin;
  signupForm.hidden = isLogin;
  loginTab.classList.toggle("is-active", isLogin);
  signupTab.classList.toggle("is-active", !isLogin);
  loginTab.setAttribute("aria-selected", String(isLogin));
  signupTab.setAttribute("aria-selected", String(!isLogin));
  setMessage("");
}

function openTable() {
  window.location.assign("index.html");
}

async function requireConfiguration() {
  if (supabaseClient) return true;
  setMessage("Adicione a chave anon/publishable no arquivo supabase-config.js para ativar o acesso.", "is-error");
  return false;
}

loginTab.addEventListener("click", () => showForm("login"));
signupTab.addEventListener("click", () => showForm("signup"));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!await requireConfiguration()) return;
  const button = loginForm.querySelector("button");
  button.disabled = true;
  setMessage("Entrando na conta…");
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.querySelector("#login-email").value.trim(),
    password: document.querySelector("#login-password").value,
  });
  button.disabled = false;
  if (error) setMessage(error.message, "is-error");
  else openTable();
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!await requireConfiguration()) return;
  const password = document.querySelector("#signup-password").value;
  const confirmation = document.querySelector("#signup-password-confirm").value;
  if (password !== confirmation) {
    setMessage("As senhas precisam ser iguais.", "is-error");
    return;
  }
  const button = signupForm.querySelector("button");
  button.disabled = true;
  setMessage("Criando sua conta…");
  const { data, error } = await supabaseClient.auth.signUp({
    email: document.querySelector("#signup-email").value.trim(),
    password,
    options: { data: { display_name: document.querySelector("#signup-name").value.trim() } },
  });
  button.disabled = false;
  if (error) {
    setMessage(error.message, "is-error");
    return;
  }
  if (data.session) openTable();
  else setMessage("Conta criada. Confira seu e-mail para confirmar o cadastro antes de entrar.", "is-success");
});

if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) openTable();
  });
} else {
  setMessage("Acesse sua conta assim que a chave pública do Supabase for adicionada.");
}
