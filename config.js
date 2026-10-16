const config = window.SUPABASE_CONFIG;
const configClient = config?.anonKey && !config.anonKey.startsWith("COLE_A_CHAVE") ? window.supabaseClient || null : null;
const nameInput = document.querySelector("#account-edit-name");
const emailInput = document.querySelector("#account-edit-email");
const accountCard = document.querySelector("#account-form")?.closest(".setup-card");
const floatingSaveBar = document.querySelector("#floating-save-bar");
const floatingSaveButton = document.querySelector("#floating-save-button");
const configToast = document.querySelector("#config-toast");
let configUser = null;

// Card 1: Ranking / Critério de Desempate
const tieBreakCard = document.createElement("section");
tieBreakCard.className = "setup-card config-card";
tieBreakCard.innerHTML = `
  <p class="eyebrow">RANKING</p>
  <h2>Critério de desempate</h2>
  <p>Escolha como as equipes empatadas em vitórias serão ordenadas.</p>
  <div class="config-account-form">
    <label for="tie-break-mode">Critério</label>
    <select id="tie-break-mode">
      <option value="full">Vitórias, saldo e pontos</option>
      <option value="wins">Apenas vitórias</option>
    </select>
    <label id="tie-break-visibility" class="switch-label" hidden>
      <input id="show-points-balance" type="checkbox" />
      <span class="switch-ui" aria-hidden="true"></span>
      <span>
        <strong>Ocultar pontos e saldo</strong>
        <small>Remove essas informações do ranking e dos PDFs.</small>
      </span>
    </label>
    <label class="switch-label">
      <input id="quick-winner-only" type="checkbox" />
      <span class="switch-ui" aria-hidden="true"></span>
      <span>
        <strong>Jogo por Resultado sem placar</strong>
        <small>Solicita apenas o vencedor de cada partida. Usa somente vitórias no ranking e oculta pontos e saldo.</small>
      </span>
    </label>
  </div>
`;
if (accountCard) {
  accountCard.insertAdjacentElement("afterend", tieBreakCard);
}

const tieBreakMode = document.querySelector("#tie-break-mode");
const tieBreakVisibility = document.querySelector("#tie-break-visibility");
const showPointsBalance = document.querySelector("#show-points-balance");
const quickWinnerOnly = document.querySelector("#quick-winner-only");

// Card 2: Gerador de Times
const starDrawCard = document.createElement("section");
starDrawCard.className = "setup-card config-card";
starDrawCard.innerHTML = `
  <p class="eyebrow">GERADOR DE TIMES</p>
  <h2>Modo de sorteio</h2>
  <p>Escolha como o sorteio será realizado na área de gerar times.</p>
  <div class="config-account-form">
    <label class="switch-label">
      <input id="star-draw-enabled" type="checkbox" />
      <span class="switch-ui" aria-hidden="true"></span>
      <span>
        <strong>Sorteio por estrela</strong>
        <small>Troca a opção de cabeça de chave pelo sorteio baseado em estrelas (1 a 5 pontos) para equilibrar as equipes por nível.</small>
      </span>
    </label>
  </div>
`;
tieBreakCard.insertAdjacentElement("afterend", starDrawCard);

const starDrawEnabled = document.querySelector("#star-draw-enabled");

// Card 3: Equilíbrio de Jogos
const exclusionBalanceCard = document.createElement("section");
exclusionBalanceCard.className = "setup-card config-card";
exclusionBalanceCard.innerHTML = `
  <p class="eyebrow">EQUILÍBRIO DE JOGOS</p>
  <h2>Equilíbrio por Exclusão de Jogo</h2>
  <p>Escolha se a última partida do líder será desconsiderada caso ele tenha mais jogos disputados que o 2º colocado no término da partida.</p>
  <div class="config-account-form">
    <label class="switch-label">
      <input id="exclusion-balance-enabled" type="checkbox" />
      <span class="switch-ui" aria-hidden="true"></span>
      <span>
        <strong>Equilíbrio por Exclusão de jogo</strong>
        <small>Desconsidera a última partida disputada pelo líder caso ele tenha mais jogos jogados que o 2º colocado ao encerrar o campeonato.</small>
      </span>
    </label>
  </div>
`;
starDrawCard.insertAdjacentElement("afterend", exclusionBalanceCard);

const exclusionBalanceEnabled = document.querySelector("#exclusion-balance-enabled");

function updateTieBreakVisibility() {
  tieBreakVisibility.hidden = tieBreakMode.value !== "wins";
  if (quickWinnerOnly.checked) {
    tieBreakMode.value = "wins";
    showPointsBalance.checked = true;
    tieBreakMode.disabled = true;
    showPointsBalance.disabled = true;
  } else {
    tieBreakMode.disabled = false;
    showPointsBalance.disabled = false;
  }
}

// Initial values loaded from localStorage (canonical fallback)
let savedState = {
  name: "",
  email: "",
  tieBreakMode: localStorage.getItem("volley-tie-break-mode") || "full",
  showPointsBalance: localStorage.getItem("volley-show-points-balance") === "false",
  quickWinnerOnly: false,
  starDrawEnabled: localStorage.getItem("volley-star-draw-enabled") === "true",
  exclusionBalanceEnabled: localStorage.getItem("volley-exclusion-balance-enabled") === "true"
};

// Apply initial state to form
function applyStateToForm(state) {
  if (nameInput) nameInput.value = state.name || "";
  if (emailInput) emailInput.value = state.email || "";
  if (tieBreakMode) tieBreakMode.value = state.tieBreakMode || "full";
  if (showPointsBalance) showPointsBalance.checked = !!state.showPointsBalance;
  if (quickWinnerOnly) quickWinnerOnly.checked = !!state.quickWinnerOnly;
  if (starDrawEnabled) starDrawEnabled.checked = !!state.starDrawEnabled;
  if (exclusionBalanceEnabled) exclusionBalanceEnabled.checked = !!state.exclusionBalanceEnabled;
  updateTieBreakVisibility();
}

applyStateToForm(savedState);

function getCurrentState() {
  return {
    name: nameInput ? nameInput.value.trim() : "",
    email: emailInput ? emailInput.value.trim() : "",
    tieBreakMode: tieBreakMode ? tieBreakMode.value : "full",
    showPointsBalance: showPointsBalance ? showPointsBalance.checked : false,
    quickWinnerOnly: quickWinnerOnly ? quickWinnerOnly.checked : false,
    starDrawEnabled: starDrawEnabled ? starDrawEnabled.checked : false,
    exclusionBalanceEnabled: exclusionBalanceEnabled ? exclusionBalanceEnabled.checked : false
  };
}

function hasChanges() {
  const current = getCurrentState();
  return (
    current.name !== savedState.name ||
    current.email !== savedState.email ||
    current.tieBreakMode !== savedState.tieBreakMode ||
    current.showPointsBalance !== savedState.showPointsBalance ||
    current.quickWinnerOnly !== savedState.quickWinnerOnly ||
    current.starDrawEnabled !== savedState.starDrawEnabled ||
    current.exclusionBalanceEnabled !== savedState.exclusionBalanceEnabled
  );
}

function checkChanges() {
  if (!floatingSaveBar) return;
  if (hasChanges()) {
    floatingSaveBar.classList.add("is-visible");
  } else {
    floatingSaveBar.classList.remove("is-visible");
  }
}

// Listen for any change in any input
[nameInput, emailInput].forEach((input) => {
  if (input) {
    input.addEventListener("input", checkChanges);
    input.addEventListener("change", checkChanges);
  }
});

[tieBreakMode, showPointsBalance, quickWinnerOnly, starDrawEnabled, exclusionBalanceEnabled].forEach((control) => {
  if (control) {
    control.addEventListener("change", () => {
      if (control === quickWinnerOnly || control === tieBreakMode) {
        updateTieBreakVisibility();
      }
      checkChanges();
    });
  }
});

// Load user from Supabase if available
if (configClient) {
  configClient.auth.getUser().then(({ data }) => {
    configUser = data.user;
    if (!configUser) return;

    savedState = {
      name: configUser.user_metadata?.display_name || "",
      email: configUser.email || "",
      tieBreakMode: configUser.user_metadata?.tie_break_mode || localStorage.getItem("volley-tie-break-mode") || "full",
      showPointsBalance: configUser.user_metadata?.show_points_balance === false,
      quickWinnerOnly: configUser.user_metadata?.quick_winner_only === true,
      starDrawEnabled: configUser.user_metadata?.star_draw_enabled ?? (localStorage.getItem("volley-star-draw-enabled") === "true"),
      exclusionBalanceEnabled: configUser.user_metadata?.exclusion_balance_enabled ?? (localStorage.getItem("volley-exclusion-balance-enabled") === "true")
    };

    applyStateToForm(savedState);
    checkChanges();
  });
}

// Toast helper
let toastTimer = null;
function showToast(message, type = "success") {
  if (!configToast) return;
  configToast.textContent = message;
  configToast.className = `config-toast is-visible is-${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    configToast.classList.remove("is-visible");
  }, 3500);
}

// Save all settings handler
async function saveAllSettings() {
  if (!hasChanges()) return;

  const current = getCurrentState();

  if (nameInput && (!current.name || current.name.length < 2)) {
    showToast("O nome da conta deve ter no mínimo 2 caracteres.", "error");
    nameInput.focus();
    return;
  }

  if (emailInput && (!current.email || !current.email.includes("@"))) {
    showToast("Por favor, informe um e-mail válido.", "error");
    emailInput.focus();
    return;
  }

  if (floatingSaveButton) {
    floatingSaveButton.disabled = true;
    floatingSaveButton.innerHTML = `<span class="save-spinner"></span><span>Salvando…</span>`;
  }

  try {
    const winnerOnly = current.quickWinnerOnly;
    const mode = winnerOnly || current.tieBreakMode === "wins" ? "wins" : "full";
    const visible = winnerOnly ? false : mode !== "wins" || !current.showPointsBalance;

    if (configClient && configUser) {
      const emailChanged = current.email !== configUser.email;
      const updates = {
        data: {
          ...(configUser.user_metadata || {}),
          display_name: current.name,
          tie_break_mode: mode,
          show_points_balance: visible,
          quick_winner_only: winnerOnly,
          star_draw_enabled: current.starDrawEnabled,
          exclusion_balance_enabled: current.exclusionBalanceEnabled
        }
      };
      if (emailChanged) {
        updates.email = current.email;
      }

      const { data, error } = await configClient.auth.updateUser(updates);
      if (error) throw error;
      configUser = data.user;
    }

    // Persist only upon explicit save
    localStorage.setItem("volley-tie-break-mode", mode);
    localStorage.setItem("volley-show-points-balance", String(visible));
    localStorage.setItem("volley-star-draw-enabled", String(current.starDrawEnabled));
    localStorage.setItem("volley-exclusion-balance-enabled", String(current.exclusionBalanceEnabled));

    savedState = { ...current };

    if (floatingSaveBar) {
      floatingSaveBar.classList.remove("is-visible");
    }

    showToast("Configurações salvas com sucesso!", "success");
  } catch (err) {
    showToast(err.message || "Erro ao salvar configurações.", "error");
  } finally {
    if (floatingSaveButton) {
      floatingSaveButton.disabled = false;
      floatingSaveButton.innerHTML = `<span class="save-icon" aria-hidden="true">✓</span><span>Salvar</span>`;
    }
  }
}

if (floatingSaveButton) {
  floatingSaveButton.addEventListener("click", saveAllSettings);
}
