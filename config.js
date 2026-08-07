const config = window.SUPABASE_CONFIG;
const configClient = config?.anonKey && !config.anonKey.startsWith("COLE_A_CHAVE") ? window.supabaseClient || null : null;
const configForm = document.querySelector("#account-form");
const configMessage = document.querySelector("#account-message");
let configUser = null;

const recoveryCard = document.createElement("section");
recoveryCard.className = "setup-card password-recovery-card";
recoveryCard.innerHTML = `<p class="eyebrow">SEGURANÇA</p><h2>Recuperar senha</h2><p>Enviaremos um link para criar uma nova senha no e-mail da sua conta.</p><form id="config-recovery-form" class="config-account-form"><label for="config-recovery-email">E-mail de recuperação</label><input id="config-recovery-email" type="email" readonly /><p id="config-recovery-message" class="auth-message" role="status"></p><button type="submit">Enviar e-mail de recuperação</button></form>`;
configForm.closest(".setup-card").insertAdjacentElement("afterend", recoveryCard);
const configRecoveryForm = document.querySelector("#config-recovery-form");
const configRecoveryMessage = document.querySelector("#config-recovery-message");

if (configClient) {
  configClient.auth.getUser().then(({ data }) => {
    configUser = data.user;
    if (!configUser) return;
    document.querySelector("#account-edit-name").value = configUser.user_metadata?.display_name || "";
    document.querySelector("#account-edit-email").value = configUser.email || "";
    document.querySelector("#config-recovery-email").value = configUser.email || "";
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

configRecoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!configClient || !configUser) return;
  const button = configRecoveryForm.querySelector("button");
  button.disabled = true;
  configRecoveryMessage.textContent = "Enviando e-mail de recuperação…";
  configRecoveryMessage.className = "auth-message";
  const { error } = await configClient.auth.resetPasswordForEmail(configUser.email, {
    redirectTo: new URL("login.html", window.location.href).href,
  });
  button.disabled = false;
  if (error) {
    configRecoveryMessage.textContent = error.message;
    configRecoveryMessage.className = "auth-message is-error";
    return;
  }
  configRecoveryMessage.textContent = "E-mail enviado. Abra o link recebido para criar uma nova senha.";
  configRecoveryMessage.className = "auth-message is-success";
});
