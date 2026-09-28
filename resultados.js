const resultsList = document.querySelector("#results-list");
const resultSyncStatus = document.querySelector("#result-sync-status");
const resultsDateFilter = document.querySelector("#results-date-filter");
const resultsTypeFilter = document.querySelector("#results-type-filter");
const clearFilterBtn = document.querySelector("#clear-results-filter");

function updateFilterClearVisibility() {
  const hasFilter = Boolean(resultsDateFilter?.value) || (resultsTypeFilter?.value && resultsTypeFilter.value !== "all");
  if (clearFilterBtn) {
    clearFilterBtn.hidden = !hasFilter;
  }
}

let displayedResults = [];
let allResults = [];
let currentCloudPage = 0;
let hasMoreCloudResults = false;
const PAGE_SIZE = 5;

function escapeResult(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]); }
function resultPdfFileName(date = new Date()) {
  const value = new Date(date);
  const pad = (number) => String(number).padStart(2, "0");
  return `Volei Hub - ${pad(value.getDate())}-${pad(value.getMonth() + 1)}-${value.getFullYear()} ${pad(value.getHours())}h${pad(value.getMinutes())}.pdf`;
}
function resultGameType(result) { return result.gameType === "points" ? "points" : "result"; }
function resultGameTypeLabel(result) { return resultGameType(result) === "points" ? "Jogo Ponto a Ponto" : "Jogo por Resultado"; }
function pointPlayerRanking(result) {
  if (Array.isArray(result.playerStandings)) return result.playerStandings;
  const players = new Map();
  (result.pointHistory || []).forEach(([, movements]) => (movements || []).forEach((movement) => {
    if (!movement.player || movement.player === "Outros") return;
    const key = `${movement.team}\u0000${movement.player}`;
    const current = players.get(key) || { team: movement.team, name: movement.player, points: 0 };
    current.points += 1; players.set(key, current);
  }));
  return [...players.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
function pointMovements(result, roundIndex, gameIndex) { return new Map(result.pointHistory || []).get(`${roundIndex}-${gameIndex}`) || []; }
function movementText(movement) { const score = movement.side === "home" ? `${movement.homeScore} × ${movement.awayScore}` : `${movement.homeScore} × ${movement.awayScore}`; return `${movement.team}: ${movement.player} · ${score}${movement.time ? ` · ${movement.time}` : ""}`; }
function scoreFor(result, roundIndex, gameIndex) {
  const score = new Map(result.scores || []).get(`${roundIndex}-${gameIndex}`);
  if (!score) return "—";
  return Array.isArray(score) && score[0] !== "" && score[1] !== "" ? `${score[0]} × ${score[1]}` : !Array.isArray(score) ? `${score.home} × ${score.away}` : "—";
}
function resultRoundHasPlayedGame(result, roundIndex) {
  const scoreMap = new Map(result.scores || []);
  const round = result.schedule?.[roundIndex];
  return Boolean(round?.matches.some((_, gameIndex) => {
    const score = scoreMap.get(`${roundIndex}-${gameIndex}`);
    return Array.isArray(score) && score[0] !== "" && score[1] !== "" && score[0] != null && score[1] != null;
  }));
}
function resultVisualStats(result, team) {
  if (Number.isFinite(team.games) && Number.isFinite(team.losses)) return { games: team.games, losses: team.losses };
  let games = 0; let losses = 0;
  const scores = new Map(result.scores || []);
  (result.schedule || []).forEach((round, roundIndex) => round.matches.forEach(([home, away], gameIndex) => {
    if (home !== team.name && away !== team.name) return;
    const score = scores.get(`${roundIndex}-${gameIndex}`);
    if (!score || score[0] === "" || score[1] === "") return;
    games += 1;
    const homePoints = Number(score[0]); const awayPoints = Number(score[1]);
    if ((home === team.name && homePoints < awayPoints) || (away === team.name && awayPoints < homePoints)) losses += 1;
  }));
  return { games, losses };
}
function resultStats(team, result) { const visual = resultVisualStats(result, team); const show = result.showPointsBalance !== false; return `<small class="ranking-stats"><span><b>Vit.</b>${team.wins}</span><span><b>Der.</b>${visual.losses}</span><span><b>Jogos</b>${visual.games}</span>${show ? `<span><b>Pontos</b>${team.points}</span><span><b>Saldo</b>${team.difference >= 0 ? "+" : ""}${team.difference}</span>` : ""}</small>`; }

function localDate(value) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function renderResultsLegacy() {
  const selectedDate = resultsDateFilter.value;
  const selectedType = resultsTypeFilter.value;
  const results = allResults.filter((result) => (!selectedDate || localDate(result.finishedAt) === selectedDate) && (selectedType === "all" || resultGameType(result) === selectedType));
  displayedResults = results;
  if (!results.length) {
    const message = selectedDate || selectedType !== "all" ? "Nenhum jogo encontrado com os filtros selecionados." : "Os resultados aparecerão aqui quando uma partida for finalizada.";
    resultsList.innerHTML = `<section class="empty-results"><h2>Nenhum jogo encerrado</h2><p>${message}</p></section>`;
    return;
  }
  const visible = results.slice(0, visibleResults);
  resultsList.innerHTML = visible.map((result) => {
    const date = new Date(result.finishedAt).toLocaleString("pt-BR");
    const topPlayer = resultGameType(result) === "points" ? pointPlayerRanking(result)[0] : null;
    const playerHighlight = topPlayer ? `<p class="result-top-player">Maior pontuador: <strong>${escapeResult(topPlayer.name)}</strong> · ${escapeResult(topPlayer.team)} · ${topPlayer.points} pontos</p>` : resultGameType(result) === "points" ? "<p class=\"result-top-player\">Nenhum ponto individual foi registrado.</p>" : "";
    const bestWins = Math.max(...result.standings.map((team) => team.wins));
    return `<article class="result-card"><div class="result-card-heading"><div><p class="eyebrow">${date}</p><span class="result-game-type ${resultGameType(result)}">${resultGameTypeLabel(result)}</span><h2>${escapeResult(result.reason)}</h2></div><div class="result-actions"><button class="print-result" type="button" data-id="${result.id}">Enviar PDF</button><button class="delete-result" type="button" data-id="${result.id}">Excluir</button></div></div><div class="result-ranking">${result.standings.map((team, index) => `<div><strong>${index + 1}º</strong>${team.wins > 0 && team.wins === bestWins ? '<span class="leader-crown" title="Líder">♛</span>' : ""}<span class="result-team-name">${escapeResult(team.name)}</span>${resultStats(team, result)}</div>`).join("")}</div>${playerHighlight}</article>`;
  }).join("") + (visible.length < results.length ? `<button id="show-more-results" class="show-more-results" type="button">Mostrar mais</button>` : "");
}

function resultLeader(team, result) {
  const leader = result.standings?.[0];
  if (!leader || leader.wins <= 0) return false;
  if (result.tieBreakMode === "wins") return team.wins === leader.wins;
  return team.wins === leader.wins && team.difference === leader.difference && team.points === leader.points;
}
function renderResults() {
  updateFilterClearVisibility();
  const selectedDate = resultsDateFilter.value;
  const selectedType = resultsTypeFilter.value;
  const results = allResults.filter((result) => (!selectedDate || localDate(result.finishedAt) === selectedDate) && (selectedType === "all" || resultGameType(result) === selectedType));
  displayedResults = results;
  if (!results.length) {
    const message = selectedDate || selectedType !== "all" ? "Nenhum jogo encontrado com os filtros selecionados." : "Os resultados aparecerão aqui quando uma partida for finalizada.";
    resultsList.innerHTML = `<section class="empty-results"><h2>Nenhum jogo encerrado</h2><p>${message}</p></section>`;
    return;
  }
  resultsList.innerHTML = results.map((result) => {
    const date = new Date(result.finishedAt).toLocaleString("pt-BR");
    const topPlayer = resultGameType(result) === "points" ? pointPlayerRanking(result)[0] : null;
    const playerHighlight = topPlayer ? `<p class="result-top-player">Maior pontuador: <strong>${escapeResult(topPlayer.name)}</strong> · ${escapeResult(topPlayer.team)} · ${topPlayer.points} pontos</p>` : resultGameType(result) === "points" ? '<p class="result-top-player">Nenhum ponto individual foi registrado.</p>' : "";
    const alertHtml = result.exclusionAlert ? `<div class="exclusion-alert-box">${escapeResult(result.exclusionAlert)}</div>` : "";
    return `<article class="result-card"><div class="result-card-heading"><div><p class="eyebrow">${date}</p><span class="result-game-type ${resultGameType(result)}">${resultGameTypeLabel(result)}</span><h2>${escapeResult(result.reason)}</h2></div><div class="result-actions"><button class="print-result" type="button" data-id="${result.id}">Enviar PDF</button><button class="delete-result" type="button" data-id="${result.id}">Excluir</button></div></div>${alertHtml}<div class="result-ranking">${result.standings.map((team, index) => `<div><strong>${index + 1}º</strong>${resultLeader(team, result) ? '<span class="leader-crown" title="Líder">♛</span>' : ""}<span class="result-team-name">${escapeResult(team.name)}</span>${resultStats(team, result)}</div>`).join("")}</div>${playerHighlight}</article>`;
  }).join("") + (hasMoreCloudResults ? '<button id="show-more-results" class="show-more-results" type="button">Carregar mais</button>' : "");
}

async function printResult(result) {
  if (!result.schedule) { window.alert("Este histórico foi salvo antes do relatório detalhado."); return; }
  const showPointsBalance = result.showPointsBalance !== false;
  const teamNames = result.teams?.length ? result.teams : result.standings?.map((team) => team.name) || [];
  const topPlayers = resultGameType(result) === "points" ? pointPlayerRanking(result).slice(0, 10) : [];
  
  let rankingText = "";
  if (result.standings && result.standings.length) {
    rankingText = "\n\n*Classificação Final:*\n" + result.standings.slice(0, 5).map((team, idx) => {
      const medals = ["🥇", "🥈", "🥉"];
      const prefix = medals[idx] || `${idx + 1}º`;
      return `${prefix} ${team.name} (${team.wins} vitórias)`;
    }).join("\n");
  }
  const shareTitle = "Resultado - Vôlei Hub";
  const whatsappMsg = `🏆 *VÔLEI HUB - RESULTADO DE PARTIDA* 🏆\n${result.reason || "Histórico de jogo"}${rankingText}\n\n🏐 Gerado pelo Vôlei Hub`;

  let file = null;
  if (window.buildVolleyPdf) {
    // Processar os standings usando visualStats caso losses ou games precisem ser recalculados
    const processedStandings = (result.standings || []).map((team) => {
      const visual = resultVisualStats(result, team);
      return {
        ...team,
        games: visual.games,
        losses: visual.losses
      };
    });

    const pdfOptions = {
      title: "Resultado de partida",
      subtitle: result.reason || "Histórico de partida",
      standings: processedStandings,
      showPointsBalance: showPointsBalance,
      exclusionAlert: result.exclusionAlert,
      topPlayers: topPlayers,
      teams: teamNames,
      players: result.players,
      schedule: result.schedule,
      scores: result.scores,
      onlyPlayed: true,
      date: result.startedAt || result.finishedAt
    };
    const res = window.buildVolleyPdf(pdfOptions);
    file = res?.file;
  }

  if (window.openPdfShareModal) {
    window.openPdfShareModal({
      file,
      pdfOptions,
      title: shareTitle,
      text: "Resultado da partida.",
      whatsappText: whatsappMsg
    });
    return;
  }

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`;
  window.open(waUrl, "_blank");
}

function getGameStore() {
  if (window.quickGameStore) return window.quickGameStore;
  return {
    getResults() {
      try { return JSON.parse(localStorage.getItem("volley-hub-quick-game-results")) || []; } catch { return []; }
    },
    deleteResult(id) {
      const results = this.getResults().filter((result) => result.id !== id);
      localStorage.setItem("volley-hub-quick-game-results", JSON.stringify(results));
    },
    async saveResultToCloud() { return { error: null }; },
    async getCloudResults() { return { data: [], hasMore: false, error: null }; },
    async deleteResultFromCloud() { return { error: null }; }
  };
}

resultsList.addEventListener("click", async (event) => {
  if (event.target.closest("#show-more-results")) { await loadMoreResults(); return; }
  const button = event.target.closest("button[data-id]"); if (!button) return;
  const id = Number(button.dataset.id); const result = displayedResults.find((item) => item.id === id); if (!result) return;
  const store = getGameStore();
  if (button.classList.contains("delete-result") && window.confirm("Excluir este histórico de jogo?")) {
    store.deleteResult(id);
    await store.deleteResultFromCloud(id);
    await loadResults();
  } else if (button.classList.contains("print-result")) printResult(result);
});

async function loadMoreResults() {
  const button = document.querySelector("#show-more-results");
  if (button) {
    button.textContent = "Carregando…";
    button.disabled = true;
  }
  currentCloudPage += 1;
  const store = getGameStore();
  const { data: newCloudResults, hasMore, error } = await store.getCloudResults(currentCloudPage, PAGE_SIZE);
  hasMoreCloudResults = hasMore;
  const existingIds = new Set(allResults.map((r) => String(r.id)));
  const newUnique = (newCloudResults || []).filter((r) => !existingIds.has(String(r.id)));
  allResults = [...allResults, ...newUnique].sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));
  renderResults();
}

async function loadResults() {
  try {
    currentCloudPage = 0;
    const store = getGameStore();
    const localResults = store.getResults();
    const syncResponses = await Promise.all(localResults.map((result) => store.saveResultToCloud(result)));
    const { data: cloudResults, hasMore, error } = await store.getCloudResults(0, PAGE_SIZE);
    hasMoreCloudResults = hasMore;
    const validCloudResults = Array.isArray(cloudResults) ? cloudResults : [];
    const merged = [...validCloudResults, ...localResults.filter((local) => !validCloudResults.some((cloud) => String(cloud.id) === String(local.id)))]
      .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));
    allResults = merged;
    renderResults();
    const syncError = syncResponses.find((response) => response?.error)?.error;
    if (error || syncError) {
      resultSyncStatus.textContent = "Não foi possível sincronizar com o Supabase. Verifique se o script supabase-schema.sql foi executado no projeto.";
      resultSyncStatus.className = "result-sync-status is-error";
      console.warn("Resultados do Supabase indisponíveis.", error || syncError);
    } else {
      resultSyncStatus.textContent = validCloudResults.length ? "Resultados sincronizados com sua conta." : "";
      resultSyncStatus.className = "result-sync-status";
    }
  } catch (err) {
    console.error("Erro ao carregar resultados:", err);
  } finally {
    document.body.classList.remove("app-loading");
  }
}

resultsDateFilter.addEventListener("input", () => { updateFilterClearVisibility(); renderResults(); });
resultsDateFilter.addEventListener("change", () => { updateFilterClearVisibility(); renderResults(); });
resultsTypeFilter.addEventListener("change", () => { updateFilterClearVisibility(); renderResults(); });
if (clearFilterBtn) {
  clearFilterBtn.addEventListener("click", () => {
    resultsDateFilter.value = "";
    resultsTypeFilter.value = "all";
    updateFilterClearVisibility();
    renderResults();
  });
}

loadResults();

