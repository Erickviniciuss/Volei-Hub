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
const tieBreakCard = document.createElement("section");
tieBreakCard.className = "setup-card password-recovery-card";
tieBreakCard.innerHTML = `<p class="eyebrow">RANKING</p><h2>Critério de desempate</h2><p>Escolha como as equipes empatadas em vitórias serão ordenadas.</p><form id="tie-break-form" class="config-account-form"><label for="tie-break-mode">Critério</label><select id="tie-break-mode"><option value="full">Vitórias, saldo e pontos</option><option value="wins">Apenas vitórias</option></select><p id="tie-break-message" class="auth-message" role="status"></p><button type="submit">Salvar critério</button></form>`;
recoveryCard.insertAdjacentElement("afterend", tieBreakCard);
const tieBreakForm = document.querySelector("#tie-break-form");
const tieBreakMode = document.querySelector("#tie-break-mode");
const tieBreakMessage = document.querySelector("#tie-break-message");
tieBreakMode.insertAdjacentHTML("afterend", '<label id="tie-break-visibility" class="switch-label" hidden><input id="show-points-balance" type="checkbox" /><span><strong>Ocultar pontos e saldo</strong><small>Remove essas informações do ranking e dos PDFs.</small></span></label>');
const tieBreakVisibility = document.querySelector("#tie-break-visibility");
const showPointsBalance = document.querySelector("#show-points-balance");
function updateTieBreakVisibility() { tieBreakVisibility.hidden = tieBreakMode.value !== "wins"; }

if (configClient) {
  configClient.auth.getUser().then(({ data }) => {
    configUser = data.user;
    if (!configUser) return;
    document.querySelector("#account-edit-name").value = configUser.user_metadata?.display_name || "";
    document.querySelector("#account-edit-email").value = configUser.email || "";
    document.querySelector("#config-recovery-email").value = configUser.email || "";
    tieBreakMode.value = configUser.user_metadata?.tie_break_mode || localStorage.getItem("volley-tie-break-mode") || "full";
    showPointsBalance.checked = configUser.user_metadata?.show_points_balance === false;
    updateTieBreakVisibility();
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

tieBreakForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!configClient || !configUser) return;
  const mode = tieBreakMode.value === "wins" ? "wins" : "full";
  const visible = mode !== "wins" || !showPointsBalance.checked;
  const { data, error } = await configClient.auth.updateUser({ data: { ...(configUser.user_metadata || {}), tie_break_mode: mode, show_points_balance: visible } });
  if (error) { tieBreakMessage.textContent = error.message; tieBreakMessage.className = "auth-message is-error"; return; }
  configUser = data.user;
  localStorage.setItem("volley-tie-break-mode", mode);
  localStorage.setItem("volley-show-points-balance", String(visible));
  tieBreakMessage.textContent = mode === "wins" ? (visible ? "Critério salvo: pontos e saldo continuam visíveis." : "Critério salvo: pontos e saldo foram ocultados.") : "Critério salvo: vitórias, saldo e pontos.";
  tieBreakMessage.className = "auth-message is-success";
});
tieBreakMode.addEventListener("change", updateTieBreakVisibility);

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
