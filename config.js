const config = window.SUPABASE_CONFIG;
const configClient = config?.anonKey && !config.anonKey.startsWith("COLE_A_CHAVE") && window.supabase
  ? window.supabase.createClient(config.url, config.anonKey)
  : null;
const configForm = document.querySelector("#account-form");
const configMessage = document.querySelector("#account-message");
let configUser = null;

if (configClient) {
  configClient.auth.getUser().then(({ data }) => {
    configUser = data.user;
    if (!configUser) return;
    document.querySelector("#account-edit-name").value = configUser.user_metadata?.display_name || "";
    document.querySelector("#account-edit-email").value = configUser.email || "";
  });
}

configForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!configClient || !configUser) return;
  const name = document.querySelector("#account-edit-name").value.trim();
  const email = document.querySelector("#account-edit-email").value.trim();
  const emailChanged = email !== configUser.email;
  const { data, error } = await configClient.auth.updateUser({ email, data: { display_name: name } });
  if (error) { configMessage.textContent = error.message; configMessage.className = "auth-message is-error"; return; }
  configUser = data.user;
  configMessage.textContent = emailChanged ? "Cadastro salvo. Confirme o novo e-mail, se solicitado." : "Cadastro salvo.";
  configMessage.className = "auth-message is-success";
});
