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

// Card 4: Impressora Térmica Bluetooth
const btPrinterCard = document.createElement("section");
btPrinterCard.className = "setup-card config-card bt-printer-card";
btPrinterCard.innerHTML = `
  <p class="eyebrow">EQUIPAMENTO</p>
  <h2>Impressora Térmica Bluetooth</h2>
  <p>Conecte sua mini impressora térmica Bluetooth (MY-7779, POS-58 ou compatível) para impressão rápida de cupons, tabelas e resultados.</p>
  
  <div class="bt-status-box">
    <div class="bt-status-info">
      <span id="bt-status-dot" class="bt-status-dot"></span>
      <div class="bt-status-text">
        <strong id="bt-status-title">Desconectada</strong>
        <small id="bt-status-sub">Nenhuma impressora conectada no momento</small>
      </div>
    </div>
  </div>

  <div class="bt-actions-row">
    <button id="bt-connect-btn" class="bt-action-btn bt-btn-connect" type="button">
      <span>🔍 Conectar Impressora</span>
    </button>
    <button id="bt-test-btn" class="bt-action-btn bt-btn-test" type="button" disabled>
      <span>🧪 Imprimir Teste</span>
    </button>
    <button id="bt-disconnect-btn" class="bt-action-btn bt-btn-disconnect" type="button" disabled>
      <span>Desconectar</span>
    </button>
  </div>

  <div class="config-account-form">
    <label for="bt-paper-width">Largura da bobina</label>
    <select id="bt-paper-width">
      <option value="58">58mm (32 colunas - Padrão MY-7779)</option>
      <option value="80">80mm (48 colunas)</option>
    </select>

    <label for="bt-print-mode">Modo de impressão</label>
    <select id="bt-print-mode">
      <option value="escpos">Texto ESC/POS Ultra-Rápido (Recomendado)</option>
      <option value="raster">Gráfico Térmico Completo (Raster)</option>
    </select>

    <label for="bt-line-feed">Avanço final de papel</label>
    <select id="bt-line-feed">
      <option value="3">3 linhas</option>
      <option value="4" selected>4 linhas</option>
      <option value="6">6 linhas</option>
    </select>
  </div>

  <div id="bt-compat-alert" class="bt-compat-alert" hidden>
    <strong>Nota de Compatibilidade:</strong> A conexão Web Bluetooth é nativa no Google Chrome, Microsoft Edge e Android. Certifique-se de que o Bluetooth do aparelho está ativado e a impressora ligada.
  </div>
`;
exclusionBalanceCard.insertAdjacentElement("afterend", btPrinterCard);

// Elementos e controles do card de impressora bluetooth
const btStatusDot = document.querySelector("#bt-status-dot");
const btStatusTitle = document.querySelector("#bt-status-title");
const btStatusSub = document.querySelector("#bt-status-sub");
const btConnectBtn = document.querySelector("#bt-connect-btn");
const btTestBtn = document.querySelector("#bt-test-btn");
const btDisconnectBtn = document.querySelector("#bt-disconnect-btn");
const btPaperWidth = document.querySelector("#bt-paper-width");
const btPrintMode = document.querySelector("#bt-print-mode");
const btLineFeed = document.querySelector("#bt-line-feed");
const btCompatAlert = document.querySelector("#bt-compat-alert");

if (window.bluetoothPrinter) {
  const settings = window.bluetoothPrinter.settings || {};
  if (btPaperWidth) btPaperWidth.value = String(settings.paperWidth || 58);
  if (btPrintMode) btPrintMode.value = settings.printMode || "escpos";
  if (btLineFeed) btLineFeed.value = String(settings.lineFeed || 4);

  btPaperWidth?.addEventListener("change", () => {
    window.bluetoothPrinter.saveSettings({ paperWidth: Number(btPaperWidth.value) });
  });
  btPrintMode?.addEventListener("change", () => {
    window.bluetoothPrinter.saveSettings({ printMode: btPrintMode.value });
  });
  btLineFeed?.addEventListener("change", () => {
    window.bluetoothPrinter.saveSettings({ lineFeed: Number(btLineFeed.value) });
  });

  window.bluetoothPrinter.onStatusChange((status) => {
    if (!status.supported) {
      if (btCompatAlert) btCompatAlert.hidden = false;
      if (btConnectBtn) btConnectBtn.disabled = true;
      if (btStatusTitle) btStatusTitle.textContent = "Bluetooth Não Suportado";
      if (btStatusSub) btStatusSub.textContent = "Seu navegador não suporta Web Bluetooth (use Chrome ou Edge no Android/PC)";
      return;
    }

    if (status.connected) {
      btStatusDot?.classList.remove("is-connecting");
      btStatusDot?.classList.add("is-connected");
      if (btStatusTitle) btStatusTitle.textContent = status.deviceName || "Impressora Conectada";
      if (btStatusSub) btStatusSub.textContent = "Pronta para imprimir cupons e resultados";
      if (btConnectBtn) btConnectBtn.hidden = true;
      if (btTestBtn) btTestBtn.disabled = false;
      if (btDisconnectBtn) {
        btDisconnectBtn.disabled = false;
        btDisconnectBtn.hidden = false;
      }
    } else {
      btStatusDot?.classList.remove("is-connected", "is-connecting");
      if (btStatusTitle) btStatusTitle.textContent = status.deviceName ? `Pendente: ${status.deviceName}` : "Desconectada";
      if (btStatusSub) btStatusSub.textContent = status.deviceName ? "Toque em Conectar para reconectar" : "Nenhuma impressora conectada no momento";
      if (btConnectBtn) {
        btConnectBtn.hidden = false;
        btConnectBtn.disabled = false;
        btConnectBtn.innerHTML = `<span>🔍 Conectar Impressora</span>`;
      }
      if (btTestBtn) btTestBtn.disabled = true;
      if (btDisconnectBtn) {
        btDisconnectBtn.disabled = true;
        btDisconnectBtn.hidden = !status.deviceName;
      }
    }
  });

  btConnectBtn?.addEventListener("click", async () => {
    try {
      btConnectBtn.disabled = true;
      btConnectBtn.innerHTML = `<span>Conectando...</span>`;
      btStatusDot?.classList.add("is-connecting");
      await window.bluetoothPrinter.connect();
      showToast("Impressora Bluetooth conectada com sucesso!", "success");
    } catch (err) {
      showToast(err.message || "Não foi possível conectar à impressora.", "error");
    } finally {
      btConnectBtn.disabled = false;
      btConnectBtn.innerHTML = `<span>🔍 Conectar Impressora</span>`;
    }
  });

  btTestBtn?.addEventListener("click", async () => {
    try {
      btTestBtn.disabled = true;
      btTestBtn.textContent = "Imprimindo...";
      await window.bluetoothPrinter.printTestTicket();
      showToast("Cupom de teste impresso com sucesso!", "success");
    } catch (err) {
      showToast(err.message || "Erro ao imprimir cupom de teste.", "error");
    } finally {
      btTestBtn.disabled = false;
      btTestBtn.textContent = "🧪 Imprimir Teste";
    }
  });

  btDisconnectBtn?.addEventListener("click", async () => {
    await window.bluetoothPrinter.disconnect();
    showToast("Impressora desconectada.", "info");
  });
}

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
