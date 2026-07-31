const quickTeamCount = document.querySelector("#quick-team-count");
const quickRoundCount = document.querySelector("#quick-round-count");
const quickUnlimited = document.querySelector("#quick-unlimited-rounds");
const quickTeamNames = document.querySelector("#quick-team-names");
const quickPlayerCount = document.querySelector("#quick-player-count");
const quickPlayersPanel = document.querySelector("#quick-players-panel");
const quickPlayersToggle = document.querySelector("#quick-players-toggle");
const quickSetup = document.querySelector("#quick-setup");
const quickGame = document.querySelector("#quick-game");
const quickFinished = document.querySelector("#quick-finished");
const currentMatches = document.querySelector("#current-matches");
const currentRoundTitle = document.querySelector("#current-round-title");
const roundProgress = document.querySelector("#round-progress");
const overview = document.querySelector("#rounds-overview");
const overviewRounds = document.querySelector("#overview-rounds");
let quickSchedule = [];
let currentRound = 0;
let scores = new Map();
let currentTeams = [];
let currentPlayerCount = 4;
let currentPlayers = [];
let currentShareCode = "";
let confirmedGameCount = 0;
let retroEditingUnlocked = false;

function escapeQuick(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]); }
function maxQuickRounds(total) { return total % 2 === 0 ? total - 1 : total; }
function normalizeQuickRounds(value, max, unlimited) { const requested = Math.max(1, Number(value) || 1); return unlimited ? requested : Math.max(max, Math.round(requested / max) * max); }
function generateShareCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = crypto.getRandomValues(new Uint8Array(8));
  return `VH-${[...values].map((value) => alphabet[value % alphabet.length]).join("")}`;
}

function makeQuickTeamInputs() {
  const previous = [...document.querySelectorAll(".quick-team-name")].map((input) => input.value);
  const total = Number(quickTeamCount.value);
  const max = maxQuickRounds(total);
  quickRoundCount.value = normalizeQuickRounds(Number(quickRoundCount.value) || 20, max, quickUnlimited.checked);
  quickRoundCount.min = quickUnlimited.checked ? 1 : max;
  quickRoundCount.step = quickUnlimited.checked ? 1 : max;
  quickTeamNames.innerHTML = Array.from({ length: total }, (_, index) => `<label class="name-field">TIME ${index + 1}<input class="quick-team-name" type="text" value="${escapeQuick(previous[index] || `Equipe ${index + 1}`)}" maxlength="28" /></label>`).join("");
  makeQuickPlayerInputs();
}

function makeQuickPlayerInputs() {
  const teams = [...document.querySelectorAll(".quick-team-name")].map((input, index) => input.value.trim() || `Equipe ${index + 1}`);
  const previous = new Map([...document.querySelectorAll(".quick-player-name")].map((input) => [input.dataset.playerKey, input.value]));
  quickPlayersPanel.innerHTML = `<div class="players-grid">${teams.map((team, teamIndex) => `<section class="player-team"><h3>${escapeQuick(team)}</h3><div class="player-inputs">${Array.from({ length: Number(quickPlayerCount.value) }, (_, playerIndex) => { const key = `${teamIndex}-${playerIndex}`; return `<input class="quick-player-name" data-team="${teamIndex}" data-player-key="${key}" type="text" maxlength="40" placeholder="Nome do participante" value="${escapeQuick(previous.get(key) || "")}" />`; }).join("")}</div></section>`).join("")}</div>`;
}

function getQuickPlayers() {
  return [...document.querySelectorAll(".quick-team-name")].map((_, teamIndex) => [...document.querySelectorAll(`.quick-player-name[data-team="${teamIndex}"]`)].map((input) => input.value.trim()).filter(Boolean));
}

function quickTeamDropdown(team, isAway = false) {
  const teamIndex = currentTeams.indexOf(team);
  const players = currentPlayers[teamIndex] || [];
  const content = players.length ? `<ul>${players.map((player) => `<li>${escapeQuick(player)}</li>`).join("")}</ul>` : "<span>Nenhum participante cadastrado.</span>";
  return `<div class="team-dropdown ${isAway ? "team-away" : ""}"><details><summary>${escapeQuick(team)}</summary><div class="dropdown-menu"><strong>${escapeQuick(team)}</strong>${content}</div></details></div>`;
}

function uniqueMatchdays(teams) {
  const hasBye = teams.length % 2 !== 0;
  const pool = hasBye ? teams.slice(0, -1) : teams;
  const ordered = [...pool.filter((_, index) => index % 2 === 0), ...pool.filter((_, index) => index % 2 !== 0).reverse()];
  const players = hasBye ? [teams.at(-1), ...ordered, null] : ordered;
  const matchdays = [];
  for (let round = 0; round < players.length - 1; round += 1) {
    const matches = []; let bye = null;
    for (let index = 0; index < players.length / 2; index += 1) {
      const home = players[index]; const away = players[players.length - 1 - index];
      if (!home || !away) bye = home || away; else matches.push([home, away]);
    }
    matchdays.push({ matches, bye });
    players.splice(1, 0, players.pop());
  }
  return matchdays;
}

function buildQuickSchedule(teams, rounds, initialBye = null) {
  const base = uniqueMatchdays(teams); let previousBye = initialBye;
  return Array.from({ length: rounds }, (_, index) => {
    const cycle = Math.floor(index / base.length); const day = base[index % base.length];
    // Após completar o ciclo, as rodadas iniciais são repetidas na mesma ordem.
    const matches = day.matches.map(([home, away]) => [home, away]);
    const opening = matches.findIndex(([home, away]) => home === previousBye || away === previousBye);
    if (opening > 0) matches.unshift(matches.splice(opening, 1)[0]);
    previousBye = day.bye;
    return { ...day, matches, phase: cycle };
  });
}

function scoreKey(round, game) { return `${round}-${game}`; }
function rankingStats(team) { return `<small class="ranking-stats"><span><b>Vit.</b>${team.wins}</span><span><b>Der.</b>${team.losses}</span><span><b>Jogos</b>${team.games}</span><span><b>Pontos</b>${team.points}</span><span><b>Saldo</b>${team.difference >= 0 ? "+" : ""}${team.difference}</span></small>`; }
function saveQuickGame() {
  const game = { status: "active", shareCode: currentShareCode, schedule: quickSchedule, currentRound, confirmedGameCount, scores: [...scores.entries()], teams: currentTeams, playerCount: currentPlayerCount, players: currentPlayers };
  window.quickGameStore.saveActive(game);
  window.quickGameStore.saveLiveGame(game).then(({ error }) => {
    const status = document.querySelector("#share-code-status");
    if (error) {
      console.warn("Não foi possível atualizar o acompanhamento ao vivo.", error);
      if (status) status.textContent = "Não foi possível publicar o acompanhamento.";
    } else if (status) status.textContent = "Acompanhamento ativo.";
  }).catch((error) => console.warn("Não foi possível atualizar o acompanhamento ao vivo.", error));
}

function buildStandings() {
  const names = new Set(currentTeams);
  quickSchedule.forEach((round) => round.matches.forEach(([home, away]) => { names.add(home); names.add(away); }));
  const standings = [...names].map((name) => ({ name, games: 0, wins: 0, losses: 0, points: 0, conceded: 0, difference: 0 }));
  const byName = new Map(standings.map((team) => [team.name, team]));
  quickSchedule.forEach((round, roundIndex) => round.matches.forEach(([home, away], gameIndex) => {
    const score = scores.get(scoreKey(roundIndex, gameIndex));
    if (!score || score[0] === "" || score[1] === "") return;
    const homePoints = Number(score[0]); const awayPoints = Number(score[1]);
    const homeTeam = byName.get(home); const awayTeam = byName.get(away);
    homeTeam.games += 1; awayTeam.games += 1;
    homeTeam.points += homePoints; homeTeam.conceded += awayPoints;
    awayTeam.points += awayPoints; awayTeam.conceded += homePoints;
    if (homePoints > awayPoints) { homeTeam.wins += 1; awayTeam.losses += 1; }
    if (awayPoints > homePoints) { awayTeam.wins += 1; homeTeam.losses += 1; }
  }));
  standings.forEach((team) => { team.difference = team.points - team.conceded; });
  return standings.sort((a, b) => b.wins - a.wins || b.difference - a.difference || b.points - a.points || a.name.localeCompare(b.name));
}
function renderCurrentRound() {
  if (currentRound >= quickSchedule.length) return finishQuickGame("Todas as rodadas foram concluídas.");
  const round = quickSchedule[currentRound];
  currentRoundTitle.textContent = `Rodada ${currentRound + 1}`;
  roundProgress.textContent = `${currentRound + 1} de ${quickSchedule.length} rodadas`;
  document.querySelector("#share-code-value").textContent = currentShareCode;
  currentMatches.innerHTML = round.matches.map(([home, away], gameIndex) => {
    const existing = scores.get(scoreKey(currentRound, gameIndex)) || ["", ""];
    const isCurrent = gameIndex === confirmedGameCount;
    const locked = gameIndex !== confirmedGameCount ? "disabled" : "";
    return `<article class="score-card ${isCurrent ? "is-current-game" : ""}">${isCurrent ? '<small class="current-game-indicator">Jogo atual</small>' : ""}${quickTeamDropdown(home)}<div class="score-inputs"><input data-game="${gameIndex}" data-side="0" type="number" min="0" inputmode="numeric" value="${existing[0]}" aria-label="Pontos de ${escapeQuick(home)}" ${locked} /><b>×</b><input data-game="${gameIndex}" data-side="1" type="number" min="0" inputmode="numeric" value="${existing[1]}" aria-label="Pontos de ${escapeQuick(away)}" ${locked} /></div>${quickTeamDropdown(away, true)}</article>`;
  }).join("") + (round.bye ? `<p class="quick-bye">Folga nesta rodada: <strong>${escapeQuick(round.bye)}</strong></p>` : "");
  document.querySelector("#confirm-round").disabled = true;
  validateScores();
  renderLiveRanking();
  renderOverview();
}

function validateScores() {
  const inputs = [...currentMatches.querySelectorAll(`input[data-game="${confirmedGameCount}"]`)];
  if (!inputs.length) return;
  const allFilled = inputs.every((input) => input.value !== "" && Number(input.value) >= 0);
  const hasDraw = allFilled && Number(inputs[0].value) === Number(inputs[1].value);
  document.querySelector("#confirm-round").disabled = !allFilled || hasDraw;
  const isLastGame = confirmedGameCount === quickSchedule[currentRound].matches.length - 1;
  document.querySelector("#confirm-round").textContent = isLastGame ? "Confirmar placares e próxima rodada" : "Confirmar placar e liberar próximo jogo";
  document.querySelector("#score-message").textContent = hasDraw ? "Empates não são permitidos. Ajuste o placar para continuar." : "";
}

function renderLiveRanking() {
  const standings = buildStandings();
  document.querySelector("#live-ranking-list").innerHTML = standings.map((team, index) => `<div class="ranking-row ${index < 3 ? "podium" : ""}"><strong>${index + 1}º</strong><span>${escapeQuick(team.name)}</span>${rankingStats(team)}</div>`).join("");
}

function persistPartialScores() {
  validateScores();
}

function confirmScores() {
  const inputs = [...currentMatches.querySelectorAll(`input[data-game="${confirmedGameCount}"]`)];
  const allFilled = inputs.length === 2 && inputs.every((input) => input.value !== "" && Number(input.value) >= 0);
  const hasDraw = allFilled && Number(inputs[0].value) === Number(inputs[1].value);
  if (!allFilled || hasDraw) return;
  const round = quickSchedule[currentRound];
  scores.set(scoreKey(currentRound, confirmedGameCount), inputs.map((input) => input.value));
  if (confirmedGameCount < round.matches.length - 1) confirmedGameCount += 1;
  else { currentRound += 1; confirmedGameCount = 0; }
  saveQuickGame();
  renderCurrentRound();
}

function makeLiveTeamInputs() {
  const total = Number(document.querySelector("#live-team-count").value);
  const previous = [...document.querySelectorAll(".live-team-name")].map((input) => input.value);
  document.querySelector("#live-team-names").innerHTML = Array.from({ length: total }, (_, index) => `<label class="name-field">TIME ${index + 1}<input class="live-team-name" type="text" value="${escapeQuick(previous[index] || currentTeams[index] || `Equipe ${index + 1}`)}" maxlength="28" /></label>`).join("");
  makeLivePlayerInputs();
}

function makeLivePlayerInputs() {
  const teams = [...document.querySelectorAll(".live-team-name")].map((input, index) => input.value.trim() || `Equipe ${index + 1}`);
  const playerCount = Number(document.querySelector("#live-player-count").value);
  const previous = new Map([...document.querySelectorAll(".live-player-name")].map((input) => [input.dataset.playerKey, input.value]));
  document.querySelector("#live-players-panel").innerHTML = `<div class="players-grid">${teams.map((team, teamIndex) => `<section class="player-team"><h3>${escapeQuick(team)}</h3><div class="player-inputs">${Array.from({ length: playerCount }, (_, playerIndex) => { const key = `${teamIndex}-${playerIndex}`; const stored = previous.get(key) ?? currentPlayers[teamIndex]?.[playerIndex] ?? ""; const saved = stored === "Vazio" ? "" : stored; return `<input class="live-player-name" data-team="${teamIndex}" data-player-key="${key}" type="text" maxlength="40" value="${escapeQuick(saved)}" />`; }).join("")}</div></section>`).join("")}</div>`;
}

function getLivePlayers() {
  return [...document.querySelectorAll(".live-team-name")].map((_, teamIndex) => [...document.querySelectorAll(`.live-player-name[data-team="${teamIndex}"]`)].map((input) => input.value.trim()).filter(Boolean));
}

function openLiveSettings() {
  const panel = document.querySelector("#live-settings");
  panel.hidden = !panel.hidden;
  document.querySelector("#adjust-game-toggle").setAttribute("aria-expanded", String(!panel.hidden));
  if (!panel.hidden) {
    document.querySelector("#live-team-count").value = currentTeams.length;
    document.querySelector("#live-round-count").value = quickSchedule.length;
    document.querySelector("#live-player-count").value = currentPlayerCount;
    makeLiveTeamInputs();
    document.querySelector("#live-players-panel").hidden = true;
    document.querySelector("#live-players-toggle").setAttribute("aria-expanded", "false");
    document.querySelector("#live-players-toggle").textContent = "Editar participantes";
  }
}

function applyLiveSettings() {
  const liveTeams = [...document.querySelectorAll(".live-team-name")].map((input, index) => input.value.trim() || `Equipe ${index + 1}`);
  const teamCountChanged = liveTeams.length !== currentTeams.length;
  currentPlayerCount = Number(document.querySelector("#live-player-count").value);
  currentPlayers = getLivePlayers();
  if (teamCountChanged) {
    const requestedTotal = Math.max(currentRound + 1, Number(document.querySelector("#live-round-count").value) || currentRound + 1);
    const preserved = quickSchedule.slice(0, currentRound + 1);
    const futureRounds = requestedTotal - preserved.length;
    const activeBye = quickSchedule[currentRound]?.bye || null;
    currentTeams = liveTeams;
    // Somente a alteração da quantidade de equipes refaz as próximas rodadas.
    quickSchedule = [...preserved, ...buildQuickSchedule(currentTeams, futureRounds, activeBye)];
  }
  document.querySelector("#live-settings").hidden = true;
  document.querySelector("#adjust-game-toggle").setAttribute("aria-expanded", "false");
  saveQuickGame();
  renderCurrentRound();
}

function renderOverview() {
  document.querySelector("#save-retro-scores").hidden = !retroEditingUnlocked;
  overviewRounds.innerHTML = quickSchedule.map((round, index) => `<article class="round overview-round ${index === currentRound ? "is-current" : ""}"><header class="round-title">Rodada ${index + 1}<span>${index === currentRound ? "ATUAL" : index < currentRound ? "CONCLUÍDA" : "AGUARDANDO"}</span></header>${round.matches.map(([home, away], gameIndex) => { const result = scores.get(scoreKey(index, gameIndex)); const editable = retroEditingUnlocked && index < currentRound; const currentGame = index === currentRound && gameIndex === confirmedGameCount; const score = result && result[0] !== "" && result[1] !== "" ? `${result[0]} × ${result[1]}` : "×"; return editable ? `<div class="match overview-match retro-match"><span>${escapeQuick(home)}</span><span class="retro-score-inputs"><input data-retro-round="${index}" data-retro-game="${gameIndex}" data-side="0" type="number" min="0" value="${result?.[0] ?? ""}" aria-label="Novo placar de ${escapeQuick(home)}" /><b>×</b><input data-retro-round="${index}" data-retro-game="${gameIndex}" data-side="1" type="number" min="0" value="${result?.[1] ?? ""}" aria-label="Novo placar de ${escapeQuick(away)}" /></span><span class="team-away">${escapeQuick(away)}</span></div>` : `<div class="match overview-match ${currentGame ? "is-current-match" : ""}"><span>${escapeQuick(home)}</span><span class="overview-score">${score}</span><span class="team-away">${escapeQuick(away)}</span></div>`; }).join("")}${round.bye ? `<div class="bye">Folga: <strong>${escapeQuick(round.bye)}</strong></div>` : ""}</article>`).join("");
}

async function unlockRetroEditing() {
  const password = document.querySelector("#retro-password").value;
  const message = document.querySelector("#retro-edit-message");
  if (!password) { message.textContent = "Informe a senha da conta."; return; }
  const client = window.quickGameStore.getCloudClient();
  if (!client) { message.textContent = "Não foi possível validar a conta."; return; }
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user?.email) { message.textContent = "Sessão da conta não encontrada."; return; }
  const { error } = await client.auth.signInWithPassword({ email: userData.user.email, password });
  if (error) { message.textContent = "Senha incorreta."; return; }
  retroEditingUnlocked = true;
  document.querySelector("#retro-auth-panel").hidden = true;
  document.querySelector("#save-retro-scores").hidden = false;
  document.querySelector("#retro-edit-toggle").textContent = "Ajustes liberados";
  renderOverview();
}

function saveRetroScores() {
  const inputs = [...overviewRounds.querySelectorAll("input[data-retro-round]")];
  const pairs = new Map();
  inputs.forEach((input) => {
    const key = `${input.dataset.retroRound}-${input.dataset.retroGame}`;
    const pair = pairs.get(key) || ["", ""];
    pair[Number(input.dataset.side)] = input.value;
    pairs.set(key, pair);
  });
  const invalid = [...pairs.values()].some((pair) => pair[0] === "" || pair[1] === "" || Number(pair[0]) < 0 || Number(pair[1]) < 0 || Number(pair[0]) === Number(pair[1]));
  const message = document.querySelector("#retro-edit-message");
  if (invalid) { message.textContent = "Informe placares diferentes e válidos para todos os jogos ajustados."; return; }
  pairs.forEach((pair, key) => scores.set(key, pair));
  saveQuickGame();
  renderLiveRanking();
  retroEditingUnlocked = false;
  document.querySelector("#save-retro-scores").hidden = true;
  document.querySelector("#retro-edit-toggle").textContent = "Ajustar jogos";
  document.querySelector("#retro-password").value = "";
  document.querySelector("#retro-auth-panel").hidden = true;
  message.textContent = "";
  renderOverview();
}

async function printQuickGamePdf() {
  if (!quickSchedule.length) return;
  const Pdf = window.jspdf?.jsPDF;
  if (Pdf) {
    const pdf = new Pdf({ unit: "mm", format: "a4" }); let y = 18;
    const line = (text, size = 10, bold = false) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(text, 175);
      if (y + lines.length * 6 > 280) { pdf.addPage(); y = 18; }
      pdf.text(lines, 18, y); y += lines.length * 6;
    };
    line("VÔLEI HUB", 12, true); line("Tabelas do Jogo Rápido", 20, true);
    quickSchedule.forEach((round, roundIndex) => {
      line(`Rodada ${roundIndex + 1}`, 13, true);
      round.matches.forEach(([home, away], gameIndex) => {
        const result = scores.get(scoreKey(roundIndex, gameIndex)); const score = result && result[0] !== "" && result[1] !== "" ? `${result[0]} × ${result[1]}` : "×";
        line(`${home}    ${score}    ${away}`);
      });
      if (round.bye) line(`Folga: ${round.bye}`, 9);
      y += 3;
    });
    const file = new File([pdf.output("blob")], "tabelas-jogo-rapido.pdf", { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: "Tabelas do Jogo Rápido", text: "Tabelas de jogos do Vôlei Hub.", files: [file] }); return; }
      catch (error) { if (error.name === "AbortError") return; }
    }
  }
  const report = window.open("", "_blank");
  if (!report) { window.alert("Permita a abertura de janelas para imprimir o PDF."); return; }
  report.document.open();
  const rounds = quickSchedule.map((round, roundIndex) => `<section class="round"><h2>Rodada ${roundIndex + 1}</h2>${round.matches.map(([home, away], gameIndex) => { const result = scores.get(scoreKey(roundIndex, gameIndex)); const score = result && result[0] !== "" && result[1] !== "" ? `${result[0]} × ${result[1]}` : "×"; return `<div class="match"><span>${escapeQuick(home)}</span><strong>${score}</strong><span>${escapeQuick(away)}</span></div>`; }).join("")}${round.bye ? `<p>Folga: <b>${escapeQuick(round.bye)}</b></p>` : ""}</section>`).join("");
  report.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Tabelas do Jogo Rápido</title><style>body{font-family:Arial,sans-serif;color:#1e293b;margin:36px}h1{font-size:30px}.round{break-inside:avoid;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0}.round h2{margin:0 0 12px}.match{display:grid;grid-template-columns:1fr auto 1fr;gap:18px;padding:9px 0;border-bottom:1px solid #e2e8f0}.match span:last-child{text-align:right}.match strong{color:#0e7490}@media print{body{margin:18px}}</style></head><body><p>VÔLEI HUB · JOGO RÁPIDO</p><h1>Tabelas de jogos</h1>${rounds}</body></html>`);
  report.document.close();
  window.setTimeout(() => { report.focus(); report.print(); }, 300);
}

async function finishQuickGame(message) {
  const standings = buildStandings();
  const result = { id: Date.now(), finishedAt: new Date().toISOString(), reason: message, standings, schedule: quickSchedule, scores: [...scores.entries()], teams: currentTeams, players: currentPlayers, playerCount: currentPlayerCount };
  window.quickGameStore.addResult(result);
  const { error } = await window.quickGameStore.saveResultToCloud(result);
  if (error) console.warn("Não foi possível salvar o resultado no Supabase.", error);
  window.quickGameStore.clearActive();
  await window.quickGameStore.closeLiveGame(currentShareCode);
  quickGame.hidden = true; overview.hidden = true; quickFinished.hidden = false;
  document.querySelector("#finished-copy").textContent = message;
  document.querySelector("#finished-ranking").innerHTML = `<h3>Classificação final</h3><div class="ranking-list">${standings.map((team, index) => `<div class="ranking-row ${index < 3 ? "podium" : ""}"><strong>${index + 1}º</strong><span>${escapeQuick(team.name)}</span>${rankingStats(team)}</div>`).join("")}</div>`;
}

document.querySelector("#quick-settings-toggle").addEventListener("click", () => { const panel = document.querySelector("#quick-settings-panel"); panel.hidden = !panel.hidden; });
quickTeamCount.addEventListener("change", makeQuickTeamInputs);
quickUnlimited.addEventListener("change", makeQuickTeamInputs);
quickPlayerCount.addEventListener("change", makeQuickPlayerInputs);
quickPlayersToggle.addEventListener("click", () => {
  quickPlayersPanel.hidden = !quickPlayersPanel.hidden;
  quickPlayersToggle.setAttribute("aria-expanded", String(!quickPlayersPanel.hidden));
  quickPlayersToggle.textContent = quickPlayersPanel.hidden ? "Cadastrar participantes" : "Ocultar participantes";
});
quickRoundCount.addEventListener("change", () => { quickRoundCount.value = normalizeQuickRounds(quickRoundCount.value, maxQuickRounds(Number(quickTeamCount.value)), quickUnlimited.checked); });
document.querySelector("#quick-start").addEventListener("click", () => {
  const teams = [...document.querySelectorAll(".quick-team-name")].map((input, index) => input.value.trim() || `Equipe ${index + 1}`);
  const rounds = normalizeQuickRounds(quickRoundCount.value, maxQuickRounds(teams.length), quickUnlimited.checked);
  if (window.quickGameStore.getActive()?.status === "active") return;
  quickRoundCount.value = rounds; currentTeams = teams; currentPlayerCount = Number(quickPlayerCount.value); currentPlayers = getQuickPlayers(); currentShareCode = generateShareCode(); quickSchedule = buildQuickSchedule(teams, rounds); currentRound = 0; confirmedGameCount = 0; scores = new Map(); saveQuickGame();
  quickSetup.hidden = true; quickGame.hidden = false; renderCurrentRound();
});
currentMatches.addEventListener("input", persistPartialScores);
currentMatches.addEventListener("click", (event) => {
  const selected = event.target.closest("details");
  if (!selected) return;
  currentMatches.querySelectorAll("details[open]").forEach((details) => { if (details !== selected) details.removeAttribute("open"); });
});
document.querySelector("#confirm-round").addEventListener("click", confirmScores);
document.querySelector("#adjust-game-toggle").addEventListener("click", openLiveSettings);
document.querySelector("#live-team-count").addEventListener("change", makeLiveTeamInputs);
document.querySelector("#live-player-count").addEventListener("change", makeLivePlayerInputs);
document.querySelector("#live-team-names").addEventListener("change", makeLivePlayerInputs);
document.querySelector("#live-players-toggle").addEventListener("click", () => {
  const panel = document.querySelector("#live-players-panel");
  panel.hidden = !panel.hidden;
  const open = !panel.hidden;
  document.querySelector("#live-players-toggle").setAttribute("aria-expanded", String(open));
  document.querySelector("#live-players-toggle").textContent = open ? "Ocultar participantes" : "Editar participantes";
});
document.querySelector("#apply-live-settings").addEventListener("click", applyLiveSettings);
document.querySelector("#show-rounds").addEventListener("click", () => { renderOverview(); overview.hidden = false; overview.scrollIntoView({ behavior: "smooth", block: "start" }); });
document.querySelector("#print-game").addEventListener("click", printQuickGamePdf);
document.querySelector("#retro-edit-toggle").addEventListener("click", () => {
  if (retroEditingUnlocked) return;
  const panel = document.querySelector("#retro-auth-panel");
  panel.hidden = !panel.hidden;
  if (!panel.hidden) document.querySelector("#retro-password").focus();
});
document.querySelector("#unlock-retro-edit").addEventListener("click", unlockRetroEditing);
document.querySelector("#save-retro-scores").addEventListener("click", saveRetroScores);
document.querySelector("#close-overview").addEventListener("click", () => {
  overview.hidden = true;
  retroEditingUnlocked = false;
  document.querySelector("#retro-auth-panel").hidden = true;
  document.querySelector("#save-retro-scores").hidden = true;
  document.querySelector("#retro-edit-toggle").textContent = "Ajustar jogos";
  document.querySelector("#retro-password").value = "";
  document.querySelector("#retro-edit-message").textContent = "";
});
document.querySelector("#finish-game").addEventListener("click", () => finishQuickGame(`O jogo foi encerrado na rodada ${Math.min(currentRound + 1, quickSchedule.length)}.`));
document.querySelector("#copy-share-code").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(currentShareCode); document.querySelector("#copy-share-code").textContent = "Código copiado"; }
  catch { document.querySelector("#copy-share-code").textContent = currentShareCode; }
  window.setTimeout(() => { document.querySelector("#copy-share-code").textContent = "Copiar código"; }, 1800);
});
document.querySelector("#new-game").addEventListener("click", () => { quickFinished.hidden = true; quickSetup.hidden = false; });
makeQuickTeamInputs();

const savedQuickGame = window.quickGameStore.getActive();
if (savedQuickGame?.status === "active") {
  quickSchedule = savedQuickGame.schedule; currentRound = savedQuickGame.currentRound; confirmedGameCount = savedQuickGame.confirmedGameCount || 0; scores = new Map(savedQuickGame.scores || []); currentTeams = savedQuickGame.teams || []; currentPlayerCount = savedQuickGame.playerCount || 4; currentPlayers = savedQuickGame.players || currentTeams.map(() => []); currentShareCode = savedQuickGame.shareCode || generateShareCode(); confirmedGameCount = Math.min(confirmedGameCount, Math.max(0, (quickSchedule[currentRound]?.matches.length || 1) - 1)); saveQuickGame();
  quickSetup.hidden = true; quickGame.hidden = false; renderCurrentRound();
}
