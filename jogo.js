const quickTeamCount = document.querySelector("#quick-team-count");
const quickRoundCount = document.querySelector("#quick-round-count");
const quickUnlimited = document.querySelector("#quick-unlimited-rounds");
const quickTeamNames = document.querySelector("#quick-team-names");
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

function escapeQuick(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]); }
function maxQuickRounds(total) { return total % 2 === 0 ? total - 1 : total; }
function normalizeQuickRounds(value, max, unlimited) { const requested = Math.max(1, Number(value) || 1); return unlimited ? requested : Math.max(max, Math.round(requested / max) * max); }

function makeQuickTeamInputs() {
  const previous = [...document.querySelectorAll(".quick-team-name")].map((input) => input.value);
  const total = Number(quickTeamCount.value);
  const max = maxQuickRounds(total);
  quickRoundCount.value = quickUnlimited.checked ? Math.max(1, Number(quickRoundCount.value) || max) : max;
  quickRoundCount.min = quickUnlimited.checked ? 1 : max;
  quickRoundCount.step = quickUnlimited.checked ? 1 : max;
  quickTeamNames.innerHTML = Array.from({ length: total }, (_, index) => `<label class="name-field">TIME ${index + 1}<input class="quick-team-name" type="text" value="${escapeQuick(previous[index] || `Equipe ${index + 1}`)}" maxlength="28" /></label>`).join("");
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
    const matches = (cycle % 2 ? day.matches.map(([home, away]) => [away, home]) : day.matches).slice();
    const opening = matches.findIndex(([home, away]) => home === previousBye || away === previousBye);
    if (opening > 0) matches.unshift(matches.splice(opening, 1)[0]);
    previousBye = day.bye;
    return { ...day, matches, phase: cycle };
  });
}

function scoreKey(round, game) { return `${round}-${game}`; }
function rankingStats(team) { return `<small class="ranking-stats"><span><b>Vit.</b>${team.wins}</span><span><b>Pontos</b>${team.points}</span><span><b>Saldo</b>${team.difference >= 0 ? "+" : ""}${team.difference}</span></small>`; }
function saveQuickGame() {
  window.quickGameStore.saveActive({ status: "active", schedule: quickSchedule, currentRound, scores: [...scores.entries()], teams: currentTeams, playerCount: currentPlayerCount });
}

function buildStandings() {
  const names = new Set(currentTeams);
  quickSchedule.forEach((round) => round.matches.forEach(([home, away]) => { names.add(home); names.add(away); }));
  const standings = [...names].map((name) => ({ name, wins: 0, points: 0, conceded: 0, difference: 0 }));
  const byName = new Map(standings.map((team) => [team.name, team]));
  quickSchedule.forEach((round, roundIndex) => round.matches.forEach(([home, away], gameIndex) => {
    const score = scores.get(scoreKey(roundIndex, gameIndex));
    if (!score || score[0] === "" || score[1] === "") return;
    const homePoints = Number(score[0]); const awayPoints = Number(score[1]);
    const homeTeam = byName.get(home); const awayTeam = byName.get(away);
    homeTeam.points += homePoints; homeTeam.conceded += awayPoints;
    awayTeam.points += awayPoints; awayTeam.conceded += homePoints;
    if (homePoints > awayPoints) homeTeam.wins += 1;
    if (awayPoints > homePoints) awayTeam.wins += 1;
  }));
  standings.forEach((team) => { team.difference = team.points - team.conceded; });
  return standings.sort((a, b) => b.wins - a.wins || b.difference - a.difference || b.points - a.points || a.name.localeCompare(b.name));
}
function renderCurrentRound() {
  if (currentRound >= quickSchedule.length) return finishQuickGame("Todas as rodadas foram concluídas.");
  const round = quickSchedule[currentRound];
  currentRoundTitle.textContent = `Rodada ${currentRound + 1}`;
  roundProgress.textContent = `${currentRound + 1} de ${quickSchedule.length} rodadas`;
  currentMatches.innerHTML = round.matches.map(([home, away], gameIndex) => {
    const existing = scores.get(scoreKey(currentRound, gameIndex)) || ["", ""];
    return `<article class="score-card"><span>${escapeQuick(home)}</span><div class="score-inputs"><input data-game="${gameIndex}" data-side="0" type="number" min="0" inputmode="numeric" value="${existing[0]}" aria-label="Pontos de ${escapeQuick(home)}" /><b>×</b><input data-game="${gameIndex}" data-side="1" type="number" min="0" inputmode="numeric" value="${existing[1]}" aria-label="Pontos de ${escapeQuick(away)}" /></div><span>${escapeQuick(away)}</span></article>`;
  }).join("") + (round.bye ? `<p class="quick-bye">Folga nesta rodada: <strong>${escapeQuick(round.bye)}</strong></p>` : "");
  document.querySelector("#confirm-round").disabled = true;
  validateScores();
  renderLiveRanking();
  renderOverview();
}

function validateScores() {
  const inputs = [...currentMatches.querySelectorAll("input")];
  if (!inputs.length) return;
  const allFilled = inputs.every((input) => input.value !== "" && Number(input.value) >= 0);
  const hasDraw = allFilled && quickSchedule[currentRound].matches.some((_, gameIndex) => {
    const pair = inputs.filter((input) => Number(input.dataset.game) === gameIndex).map((input) => Number(input.value));
    return pair[0] === pair[1];
  });
  document.querySelector("#confirm-round").disabled = !allFilled || hasDraw;
  document.querySelector("#score-message").textContent = hasDraw ? "Empates não são permitidos. Ajuste o placar para continuar." : "";
}

function renderLiveRanking() {
  const standings = buildStandings();
  document.querySelector("#live-ranking-list").innerHTML = standings.map((team, index) => `<div class="ranking-row ${index < 3 ? "podium" : ""}"><strong>${index + 1}º</strong><span>${escapeQuick(team.name)}</span>${rankingStats(team)}</div>`).join("");
}

function persistPartialScores() {
  const inputs = [...currentMatches.querySelectorAll("input")];
  const round = quickSchedule[currentRound];
  if (round) {
    round.matches.forEach((_, gameIndex) => {
      const pair = inputs.filter((input) => Number(input.dataset.game) === gameIndex).map((input) => input.value);
      scores.set(scoreKey(currentRound, gameIndex), pair);
    });
    saveQuickGame();
  }
  validateScores();
  renderLiveRanking();
}

function confirmScores() {
  const inputs = [...currentMatches.querySelectorAll("input")];
  const allFilled = inputs.length && inputs.every((input) => input.value !== "" && Number(input.value) >= 0);
  const hasDraw = allFilled && quickSchedule[currentRound].matches.some((_, gameIndex) => {
    const pair = inputs.filter((input) => Number(input.dataset.game) === gameIndex).map((input) => Number(input.value));
    return pair[0] === pair[1];
  });
  if (!allFilled || hasDraw) return;
  const round = quickSchedule[currentRound];
  round.matches.forEach((_, gameIndex) => {
    const pair = inputs.filter((input) => Number(input.dataset.game) === gameIndex).map((input) => input.value);
    scores.set(scoreKey(currentRound, gameIndex), pair);
  });
  currentRound += 1;
  saveQuickGame();
  renderCurrentRound();
}

function makeLiveTeamInputs() {
  const total = Number(document.querySelector("#live-team-count").value);
  const previous = [...document.querySelectorAll(".live-team-name")].map((input) => input.value);
  document.querySelector("#live-team-names").innerHTML = Array.from({ length: total }, (_, index) => `<label class="name-field">TIME ${index + 1}<input class="live-team-name" type="text" value="${escapeQuick(previous[index] || currentTeams[index] || `Equipe ${index + 1}`)}" maxlength="28" /></label>`).join("");
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
  }
}

function applyLiveSettings() {
  const liveTeams = [...document.querySelectorAll(".live-team-name")].map((input, index) => input.value.trim() || `Equipe ${index + 1}`);
  const requestedTotal = Math.max(currentRound + 1, Number(document.querySelector("#live-round-count").value) || currentRound + 1);
  const preserved = quickSchedule.slice(0, currentRound + 1);
  const futureRounds = requestedTotal - preserved.length;
  const activeBye = quickSchedule[currentRound]?.bye || null;
  currentTeams = liveTeams;
  currentPlayerCount = Number(document.querySelector("#live-player-count").value);
  quickSchedule = [...preserved, ...buildQuickSchedule(currentTeams, futureRounds, activeBye)];
  document.querySelector("#live-settings").hidden = true;
  document.querySelector("#adjust-game-toggle").setAttribute("aria-expanded", "false");
  saveQuickGame();
  renderCurrentRound();
}

function renderOverview() {
  overviewRounds.innerHTML = quickSchedule.map((round, index) => `<article class="round overview-round ${index === currentRound ? "is-current" : ""}"><header class="round-title">Rodada ${index + 1}<span>${index === currentRound ? "ATUAL" : index < currentRound ? "CONCLUÍDA" : "AGUARDANDO"}</span></header>${round.matches.map(([home, away], gameIndex) => { const result = scores.get(scoreKey(index, gameIndex)); return `<div class="match overview-match"><span>${escapeQuick(home)}</span><span class="overview-score">${result && result[0] !== "" && result[1] !== "" ? `${result[0]} × ${result[1]}` : "×"}</span><span class="team-away">${escapeQuick(away)}</span></div>`; }).join("")}${round.bye ? `<div class="bye">Folga: <strong>${escapeQuick(round.bye)}</strong></div>` : ""}</article>`).join("");
}

function finishQuickGame(message) {
  const standings = buildStandings();
  window.quickGameStore.addResult({ id: Date.now(), finishedAt: new Date().toISOString(), reason: message, standings, schedule: quickSchedule, scores: [...scores.entries()] });
  window.quickGameStore.clearActive();
  quickGame.hidden = true; overview.hidden = true; quickFinished.hidden = false;
  document.querySelector("#finished-copy").textContent = message;
  document.querySelector("#finished-ranking").innerHTML = `<h3>Classificação final</h3><div class="ranking-list">${standings.map((team, index) => `<div class="ranking-row ${index < 3 ? "podium" : ""}"><strong>${index + 1}º</strong><span>${escapeQuick(team.name)}</span>${rankingStats(team)}</div>`).join("")}</div>`;
}

document.querySelector("#quick-settings-toggle").addEventListener("click", () => { const panel = document.querySelector("#quick-settings-panel"); panel.hidden = !panel.hidden; });
quickTeamCount.addEventListener("change", makeQuickTeamInputs);
quickUnlimited.addEventListener("change", makeQuickTeamInputs);
quickRoundCount.addEventListener("change", () => { quickRoundCount.value = normalizeQuickRounds(quickRoundCount.value, maxQuickRounds(Number(quickTeamCount.value)), quickUnlimited.checked); });
document.querySelector("#quick-start").addEventListener("click", () => {
  const teams = [...document.querySelectorAll(".quick-team-name")].map((input, index) => input.value.trim() || `Equipe ${index + 1}`);
  const rounds = normalizeQuickRounds(quickRoundCount.value, maxQuickRounds(teams.length), quickUnlimited.checked);
  if (window.quickGameStore.getActive()?.status === "active") return;
  quickRoundCount.value = rounds; currentTeams = teams; currentPlayerCount = Number(document.querySelector("#quick-player-count").value); quickSchedule = buildQuickSchedule(teams, rounds); currentRound = 0; scores = new Map(); saveQuickGame();
  quickSetup.hidden = true; quickGame.hidden = false; renderCurrentRound();
});
currentMatches.addEventListener("input", persistPartialScores);
document.querySelector("#confirm-round").addEventListener("click", confirmScores);
document.querySelector("#adjust-game-toggle").addEventListener("click", openLiveSettings);
document.querySelector("#live-team-count").addEventListener("change", makeLiveTeamInputs);
document.querySelector("#apply-live-settings").addEventListener("click", applyLiveSettings);
document.querySelector("#show-rounds").addEventListener("click", () => { renderOverview(); overview.hidden = false; overview.scrollIntoView({ behavior: "smooth", block: "start" }); });
document.querySelector("#close-overview").addEventListener("click", () => { overview.hidden = true; });
document.querySelector("#finish-game").addEventListener("click", () => finishQuickGame(`O jogo foi encerrado na rodada ${Math.min(currentRound + 1, quickSchedule.length)}.`));
document.querySelector("#new-game").addEventListener("click", () => { quickFinished.hidden = true; quickSetup.hidden = false; });
makeQuickTeamInputs();

const savedQuickGame = window.quickGameStore.getActive();
if (savedQuickGame?.status === "active") {
  quickSchedule = savedQuickGame.schedule; currentRound = savedQuickGame.currentRound; scores = new Map(savedQuickGame.scores || []); currentTeams = savedQuickGame.teams || []; currentPlayerCount = savedQuickGame.playerCount || 4;
  quickSetup.hidden = true; quickGame.hidden = false; renderCurrentRound();
}
