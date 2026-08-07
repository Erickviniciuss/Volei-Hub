const pointTeamCount = document.querySelector("#point-team-count");
const pointRoundCount = document.querySelector("#point-round-count");
const pointPlayerCount = document.querySelector("#point-player-count");
const pointsToWin = document.querySelector("#points-to-win");
const pointUnlimited = document.querySelector("#point-unlimited");
const pointRequireNames = document.querySelector("#point-require-names");
const pointTeamNames = document.querySelector("#point-team-names");
const pointPlayers = document.querySelector("#point-players");
const pointScores = new Map();
const pointHistory = new Map();
let pointTeams = [];
let pointRoster = [];
let pointSchedule = [];
let pointRound = 0;
let pointMatch = 0;
let selectedPointTeam = "";
let selectedPointPlayer = "";
let selectedOverviewMatch = "";
let selectedOverviewTeam = "";
let pointCurrentPlayerCount = Number(pointPlayerCount.value);
let pointShareCode = "";
let pointStartedAt = "";
let pointRetroEditingUnlocked = false;

function escapePoint(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]); }
function maxPointRounds(total) { return total % 2 === 0 ? total - 1 : total; }
function normalizePointRounds(value, total, unlimited) { const max = maxPointRounds(total); const requested = Math.max(1, Number(value) || 1); return unlimited ? requested : Math.max(max, Math.round(requested / max) * max); }
function pointKey(round, match) { return `${round}-${match}`; }
function generatePointShareCode() { const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const values = crypto.getRandomValues(new Uint8Array(8)); return `VH-${[...values].map((value) => alphabet[value % alphabet.length]).join("")}`; }
function savePointGame() {
  if (!pointSchedule.length || !pointShareCode) return;
  const game = { status: "active", started: true, gameType: "points", shareCode: pointShareCode, startedAt: pointStartedAt, schedule: pointSchedule, currentRound: pointRound, pointMatch, scores: [...pointScores.entries()], pointHistory: [...pointHistory.entries()], teams: pointTeams, playerCount: pointCurrentPlayerCount, players: pointRoster, allowNoNames: pointRequireNames.checked };
  window.quickGameStore.saveActive(game);
  window.quickGameStore.saveLiveGame(game).then(({ error }) => { const status = document.querySelector("#point-share-code-status"); status.textContent = error ? "Não foi possível publicar o acompanhamento." : "Acompanhamento ativo."; }).catch(() => { const status = document.querySelector("#point-share-code-status"); status.textContent = "Não foi possível publicar o acompanhamento."; });
}

function uniquePointMatchdays(teams) {
  const hasBye = teams.length % 2 !== 0;
  const pool = hasBye ? teams.slice(0, -1) : teams;
  const ordered = [...pool.filter((_, index) => index % 2 === 0), ...pool.filter((_, index) => index % 2 !== 0).reverse()];
  const players = hasBye ? [teams.at(-1), ...ordered, null] : ordered;
  const days = [];
  for (let round = 0; round < players.length - 1; round += 1) {
    const matches = []; let bye = null;
    for (let index = 0; index < players.length / 2; index += 1) {
      const home = players[index]; const away = players[players.length - 1 - index];
      if (!home || !away) bye = home || away; else matches.push([home, away]);
    }
    days.push({ matches, bye });
    players.splice(1, 0, players.pop());
  }
  return days;
}
function pointMatchId(home, away) { return [home, away].sort().join("|"); }
function pointByeCounts(teams, rounds = []) { const counts = new Map(teams.map((team) => [team, 0])); rounds.forEach((round) => { if (round.bye && counts.has(round.bye)) counts.set(round.bye, counts.get(round.bye) + 1); }); return counts; }
function pointPairCounts(rounds = []) { const counts = new Map(); rounds.forEach((round) => round.matches.forEach(([home, away]) => { const key = pointMatchId(home, away); counts.set(key, (counts.get(key) || 0) + 1); })); return counts; }
function buildPointSchedule(teams, rounds, initialBye = null, previousRounds = []) {
  const base = uniquePointMatchdays(teams); let previousBye = initialBye;
  const byeCounts = pointByeCounts(teams, previousRounds); const pairCounts = pointPairCounts(previousRounds);
  return Array.from({ length: rounds }, () => {
    let candidates = base.map((day, baseIndex) => ({ day, baseIndex }));
    if (teams.length % 2 !== 0) { const lowest = Math.min(...[...byeCounts.values()]); candidates = candidates.filter(({ day }) => byeCounts.get(day.bye) === lowest); }
    candidates.sort((a, b) => a.day.matches.reduce((total, [home, away]) => total + (pairCounts.get(pointMatchId(home, away)) || 0), 0) - b.day.matches.reduce((total, [home, away]) => total + (pairCounts.get(pointMatchId(home, away)) || 0), 0) || a.baseIndex - b.baseIndex);
    const day = candidates[0].day; const matches = day.matches.map((match) => [...match]);
    const opening = matches.findIndex(([home, away]) => home === previousBye || away === previousBye);
    if (opening > 0) matches.unshift(matches.splice(opening, 1)[0]);
    if (day.bye) byeCounts.set(day.bye, byeCounts.get(day.bye) + 1);
    matches.forEach(([home, away]) => { const key = pointMatchId(home, away); pairCounts.set(key, (pairCounts.get(key) || 0) + 1); });
    previousBye = day.bye;
    return { ...day, matches };
  });
}
function buildPointExpandedSchedule(previousRound, previousTeams, nextTeams, futureRounds, previousRounds = []) {
  if (!futureRounds) return [];
  const newTeam = nextTeams.slice(previousTeams.length)[0];
  if (!newTeam || !previousRound?.matches?.length) return buildPointSchedule(nextTeams, futureRounds, previousRound?.bye || null, previousRounds);
  const lastMatch = previousRound.matches.at(-1);
  const counts = pointByeCounts(nextTeams, previousRounds);
  const lowest = Math.min(...[...counts.entries()].filter(([team]) => team !== newTeam).map(([, count]) => count));
  const preferred = [lastMatch?.[1], lastMatch?.[0]].filter((team) => team && team !== newTeam && counts.get(team) === lowest);
  const bye = nextTeams.length % 2 !== 0 ? preferred[0] || nextTeams.find((team) => team !== newTeam && counts.get(team) === lowest) || null : null;
  const previousOrder = [...previousRound.matches.flat(), ...(previousRound.bye ? [previousRound.bye] : [])];
  const opponent = previousOrder.find((team) => team !== bye && team !== newTeam) || nextTeams.find((team) => team !== bye && team !== newTeam);
  const remaining = nextTeams.filter((team) => team !== newTeam && team !== opponent && team !== bye);
  const matches = [[newTeam, opponent]];
  for (let index = 0; index < remaining.length; index += 2) if (remaining[index] && remaining[index + 1]) matches.push([remaining[index], remaining[index + 1]]);
  return [{ matches, bye }, ...buildPointSchedule(nextTeams, futureRounds - 1, bye, [...previousRounds, { matches, bye }])];
}

function makePointInputs() {
  const previousTeams = [...document.querySelectorAll(".point-team-name")].map((input) => input.value);
  const total = Number(pointTeamCount.value);
  pointRoundCount.value = normalizePointRounds(pointRoundCount.value, total, pointUnlimited.checked);
  pointTeamNames.innerHTML = Array.from({ length: total }, (_, index) => `<label class="name-field">TIME ${index + 1}<input class="point-team-name" type="text" maxlength="28" value="${escapePoint(previousTeams[index] || `Equipe ${index + 1}`)}" /></label>`).join("");
  makePointPlayerInputs();
}
function makePointPlayerInputs() {
  const teams = [...document.querySelectorAll(".point-team-name")].map((input, index) => input.value.trim() || `Equipe ${index + 1}`);
  const saved = new Map([...document.querySelectorAll(".point-player-name")].map((input) => [input.dataset.key, input.value]));
  pointPlayers.innerHTML = `<div class="players-grid">${teams.map((team, teamIndex) => `<section class="player-team"><h3>${escapePoint(team)}</h3><div class="player-inputs">${Array.from({ length: Number(pointPlayerCount.value) }, (_, playerIndex) => { const key = `${teamIndex}-${playerIndex}`; return `<input class="point-player-name" data-team="${teamIndex}" data-key="${key}" type="text" maxlength="40" placeholder="Nome do participante" value="${escapePoint(saved.get(key) || "")}" />`; }).join("")}</div></section>`).join("")}</div>`;
}
function readPointSetup() {
  pointTeams = [...document.querySelectorAll(".point-team-name")].map((input, index) => input.value.trim() || `Equipe ${index + 1}`);
  pointRoster = pointTeams.map((_, index) => [...document.querySelectorAll(`.point-player-name[data-team="${index}"]`)].map((input) => input.value.trim()).filter(Boolean));
  return pointRequireNames.checked || pointRoster.every((team) => team.length >= 1);
}

function getPointStandings() {
  const names = new Set(pointTeams);
  pointSchedule.forEach((round) => round.matches.forEach(([home, away]) => { names.add(home); names.add(away); }));
  const standings = [...names].map((name) => ({ name, games: 0, wins: 0, losses: 0, points: 0, conceded: 0, difference: 0 }));
  const byName = new Map(standings.map((team) => [team.name, team]));
  pointScores.forEach((score, key) => {
    if (!score.finished || !score.confirmed) return;
    const [round, match] = key.split("-").map(Number);
    const [home, away] = pointSchedule[round].matches[match];
    const h = byName.get(home); const a = byName.get(away);
    h.games += 1; a.games += 1; h.points += score.home; h.conceded += score.away; a.points += score.away; a.conceded += score.home;
    if (score.home > score.away) { h.wins += 1; a.losses += 1; } else { a.wins += 1; h.losses += 1; }
  });
  standings.forEach((team) => { team.difference = team.points - team.conceded; });
  return standings.sort((a, b) => b.wins - a.wins || b.difference - a.difference || b.points - a.points);
}
function renderPointRanking() { document.querySelector("#point-ranking").innerHTML = getPointStandings().map((team, index) => `<div class="ranking-row ${index < 3 ? "podium" : ""}"><strong>${index + 1}º</strong><span>${escapePoint(team.name)}</span><small class="ranking-stats"><span><b>Vit.</b>${team.wins}</span><span><b>Der.</b>${team.losses}</span><span><b>Jogos</b>${team.games}</span><span><b>Pontos</b>${team.points}</span><span><b>Saldo</b>${team.difference >= 0 ? "+" : ""}${team.difference}</span></small></div>`).join(""); }
function historyItems(key) {
  return (pointHistory.get(key) || []).map((item, index) => {
    const homeScore = Number.isFinite(item.homeScore) ? item.homeScore : "?";
    const awayScore = Number.isFinite(item.awayScore) ? item.awayScore : "?";
    const score = item.side === "home"
      ? `<b class="point-scored-value">${homeScore}</b> × <span>${awayScore}</span>`
      : `<span>${homeScore}</span> × <b class="point-scored-value">${awayScore}</b>`;
    return `<span class="point-history-item"><strong>${index + 1}º lance</strong><em>${escapePoint(item.team)}: ${escapePoint(item.player)}</em><small>${score}</small><time>${escapePoint(item.time || "")}</time></span>`;
  }).join("") || "Nenhum ponto registrado.";
}

function renderPointHistory() {
  const section = document.querySelector("#point-point-history");
  if (pointRequireNames.checked || !pointSchedule[pointRound]) { section.hidden = true; return; }
  const [home, away] = pointSchedule[pointRound].matches[pointMatch];
  section.hidden = false;
  section.innerHTML = `<h3>Pontos registrados</h3><p>${escapePoint(home)} × ${escapePoint(away)}</p><div class="point-history">${historyItems(pointKey(pointRound, pointMatch))}</div>`;
}
function renderPointMatch() {
  const round = pointSchedule[pointRound];
  if (!round) {
    document.querySelector("#point-round-title").textContent = "Jogo concluído";
    document.querySelector("#point-progress").textContent = "Todas as rodadas foram concluídas.";
    document.querySelector("#point-current-match").innerHTML = '<div class="quick-bye">Todos os placares foram registrados.</div>';
    renderPointRanking(); renderPointLivePlayerRanking(); renderPointOverview(); renderPointHistory(); return;
  }
  const [home, away] = round.matches[pointMatch];
  const key = pointKey(pointRound, pointMatch);
  const score = pointScores.get(key) || { home: 0, away: 0, finished: false, confirmed: false };
  document.querySelector("#point-round-title").textContent = `Rodada ${pointRound + 1}`;
  document.querySelector("#point-progress").textContent = `${pointRound + 1} de ${pointSchedule.length} rodadas · primeiro time a ${pointsToWin.value} pontos`;
  document.querySelector("#point-share-code-value").textContent = pointShareCode || "--";
  const controls = (team) => score.finished ? "" : `<button class="point-add" data-team="${escapePoint(team)}" type="button" aria-label="Registrar ponto para ${escapePoint(team)}">+</button>`;
  const advance = score.finished ? `<button id="point-advance-match" class="confirm-round" type="button">${pointMatch < round.matches.length - 1 || pointRound < pointSchedule.length - 1 ? "Avançar para a próxima partida" : "Concluir jogo"}</button>` : "";
  document.querySelector("#point-current-match").innerHTML = `<article class="point-match"><section><strong>${escapePoint(home)}</strong><b>${score.home}</b>${controls(home)}</section><span>×</span><section><strong>${escapePoint(away)}</strong><b>${score.away}</b>${controls(away)}</section></article>${advance}`;
  renderPointRanking(); renderPointLivePlayerRanking(); renderPointOverview(); renderPointHistory();
}
function pointTeamDropdown(team, isAway = false) {
  const teamIndex = pointTeams.indexOf(team);
  const players = pointRoster[teamIndex] || [];
  const content = players.length ? `<ul>${players.map((player) => `<li>${escapePoint(player)}</li>`).join("")}</ul>` : "<span>Nenhum participante cadastrado.</span>";
  return `<div class="team-dropdown ${isAway ? "team-away" : ""}"><details><summary>${escapePoint(team)}</summary><div class="dropdown-menu"><strong>${escapePoint(team)}</strong>${content}</div></details></div>`;
}

function renderPointRanking() {
  document.querySelector("#point-ranking").innerHTML = getPointStandings().map((team, index) => `<div class="ranking-row ${index < 3 ? "podium" : ""}"><strong>${index + 1}º</strong>${pointTeamDropdown(team.name)}<small class="ranking-stats"><span><b>Vit.</b>${team.wins}</span><span><b>Der.</b>${team.losses}</span><span><b>Jogos</b>${team.games}</span><span><b>Pontos</b>${team.points}</span><span><b>Saldo</b>${team.difference >= 0 ? "+" : ""}${team.difference}</span></small></div>`).join("");
}

function renderPointMatch() {
  const round = pointSchedule[pointRound];
  if (!round) {
    document.querySelector("#point-round-title").textContent = "Jogo concluído";
    document.querySelector("#point-progress").textContent = "Todas as rodadas foram concluídas.";
    document.querySelector("#point-current-match").innerHTML = '<div class="quick-bye">Todos os placares foram registrados.</div>';
    renderPointRanking(); renderPointLivePlayerRanking(); renderPointOverview(); renderPointHistory(); return;
  }
  const [home, away] = round.matches[pointMatch];
  const key = pointKey(pointRound, pointMatch);
  const score = pointScores.get(key) || { home: 0, away: 0, finished: false, confirmed: false };
  document.querySelector("#point-round-title").textContent = `Rodada ${pointRound + 1}`;
  document.querySelector("#point-progress").textContent = `${pointRound + 1} de ${pointSchedule.length} rodadas · primeiro time a ${pointsToWin.value} pontos`;
  document.querySelector("#point-share-code-value").textContent = pointShareCode || "--";
  const controls = (team) => score.finished ? "" : `<button class="point-add" data-team="${escapePoint(team)}" type="button" aria-label="Registrar ponto para ${escapePoint(team)}">+</button>`;
  const advance = score.finished ? `<button id="point-advance-match" class="confirm-round" type="button">${pointMatch < round.matches.length - 1 || pointRound < pointSchedule.length - 1 ? "Avançar para a próxima partida" : "Concluir jogo"}</button>` : "";
  document.querySelector("#point-current-match").innerHTML = `<article class="point-match"><section>${pointTeamDropdown(home)}<b>${score.home}</b>${controls(home)}</section><span>×</span><section>${pointTeamDropdown(away, true)}<b>${score.away}</b>${controls(away)}</section></article>${advance}`;
  renderPointRanking(); renderPointLivePlayerRanking(); renderPointOverview(); renderPointHistory();
}

function registerPoint(player) {
  const key = pointKey(pointRound, pointMatch);
  const score = pointScores.get(key) || { home: 0, away: 0, finished: false, confirmed: false };
  const [home] = pointSchedule[pointRound].matches[pointMatch];
  const side = selectedPointTeam === home ? "home" : "away";
  score[side] += 1;
  pointScores.set(key, score);
  pointHistory.set(key, [...(pointHistory.get(key) || []), { team: selectedPointTeam, player, side, homeScore: score.home, awayScore: score.away, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }]);
  if (score[side] >= Number(pointsToWin.value)) score.finished = true;
  selectedPointTeam = ""; selectedPointPlayer = ""; renderPointMatch(); savePointGame();
}
function advancePointMatch() {
  const round = pointSchedule[pointRound];
  const score = pointScores.get(pointKey(pointRound, pointMatch));
  if (!round || !score?.finished) return;
  score.confirmed = true;
  if (pointMatch < round.matches.length - 1) pointMatch += 1; else { pointRound += 1; pointMatch = 0; }
  renderPointMatch(); savePointGame();
}

function overviewRoster(team, key) { return selectedOverviewTeam === `${key}:${team}` ? `<div class="point-overview-roster"><strong>${escapePoint(team)}</strong><span>${(pointRoster[pointTeams.indexOf(team)] || []).map(escapePoint).join(", ") || "Nenhum participante cadastrado."}</span></div>` : ""; }
function renderPointOverview() {
  document.querySelector("#point-overview-rounds").innerHTML = pointSchedule.map((round, roundIndex) => `<article class="round overview-round ${roundIndex === pointRound ? "is-current" : ""}"><header class="round-title">Rodada ${roundIndex + 1}<span>${roundIndex === pointRound ? "ATUAL" : roundIndex < pointRound ? "CONCLUÍDA" : "AGUARDANDO"}</span></header>${round.matches.map(([home, away], matchIndex) => { const key = pointKey(roundIndex, matchIndex); const score = pointScores.get(key); const currentGame = roundIndex === pointRound && matchIndex === pointMatch; const history = !pointRequireNames.checked && selectedOverviewMatch === key ? `<div class="point-overview-history"><strong>Histórico de pontos</strong><div class="point-history">${historyItems(key)}</div></div>` : ""; return `<div class="match overview-match ${currentGame ? "is-current-match" : ""}" data-overview-match="${key}"><span class="point-overview-team" data-overview-team="${escapePoint(home)}">${escapePoint(home)}</span><span class="overview-score ${pointRequireNames.checked ? "" : "point-overview-score"}" ${pointRequireNames.checked ? "" : `data-overview-score="${key}" role="button" tabindex="0" aria-label="Ver histórico de pontos"`}>${score ? `${score.home} × ${score.away}` : "×"}</span><span class="team-away point-overview-team" data-overview-team="${escapePoint(away)}">${escapePoint(away)}</span></div>${overviewRoster(home, key)}${overviewRoster(away, key)}${history}`; }).join("")}${round.bye ? `<div class="bye">Folga: <strong>${escapePoint(round.bye)}</strong></div>` : ""}</article>`).join("");
}

function renderPointRetroInputs() {
  if (!pointRetroEditingUnlocked) return;
  document.querySelectorAll("#point-overview-rounds .overview-round").forEach((roundNode, roundIndex) => {
    if (roundIndex >= pointRound) return;
    roundNode.querySelectorAll(".overview-match").forEach((matchNode, matchIndex) => {
      const [home, away] = pointSchedule[roundIndex].matches[matchIndex];
      const score = pointScores.get(pointKey(roundIndex, matchIndex)) || { home: "", away: "" };
      matchNode.classList.add("retro-match");
      matchNode.innerHTML = `<span>${escapePoint(home)}</span><span class="retro-score-inputs"><input data-point-retro-round="${roundIndex}" data-point-retro-game="${matchIndex}" data-side="home" type="number" min="0" value="${score.home}" /><b>×</b><input data-point-retro-round="${roundIndex}" data-point-retro-game="${matchIndex}" data-side="away" type="number" min="0" value="${score.away}" /></span><span class="team-away">${escapePoint(away)}</span>`;
    });
  });
}
async function unlockPointRetroEditing() {
  const password = document.querySelector("#point-retro-password").value;
  const message = document.querySelector("#point-retro-edit-message");
  if (!password) { message.textContent = "Informe a senha da conta."; return; }
  const client = window.quickGameStore.getCloudClient();
  if (!client) { message.textContent = "Não foi possível validar a conta."; return; }
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user?.email) { message.textContent = "Sessão da conta não encontrada."; return; }
  const { error } = await client.auth.signInWithPassword({ email: userData.user.email, password });
  if (error) { message.textContent = "Senha incorreta."; return; }
  pointRetroEditingUnlocked = true;
  document.querySelector("#point-retro-auth-panel").hidden = true;
  document.querySelector("#point-save-retro-scores").hidden = false;
  document.querySelector("#point-retro-edit-toggle").textContent = "Ajustes liberados";
  renderPointOverview(); renderPointRetroInputs();
}
function savePointRetroScores() {
  const inputs = [...document.querySelectorAll("#point-overview-rounds input[data-point-retro-round]")];
  const pairs = new Map();
  inputs.forEach((input) => { const key = `${input.dataset.pointRetroRound}-${input.dataset.pointRetroGame}`; const pair = pairs.get(key) || { home: "", away: "" }; pair[input.dataset.side] = input.value; pairs.set(key, pair); });
  const invalid = [...pairs.values()].some((score) => score.home === "" || score.away === "" || Number(score.home) < 0 || Number(score.away) < 0 || Number(score.home) === Number(score.away));
  const message = document.querySelector("#point-retro-edit-message");
  if (invalid) { message.textContent = "Informe placares diferentes e válidos para todos os jogos ajustados."; return; }
  pairs.forEach((score, key) => { pointScores.set(key, { home: Number(score.home), away: Number(score.away), finished: true, confirmed: true }); pointHistory.delete(key); });
  pointRetroEditingUnlocked = false;
  document.querySelector("#point-save-retro-scores").hidden = true;
  document.querySelector("#point-retro-edit-toggle").textContent = "Ajustar jogos";
  document.querySelector("#point-retro-password").value = "";
  document.querySelector("#point-retro-auth-panel").hidden = true;
  message.textContent = "";
  renderPointMatch(); savePointGame();
}

function makeLivePointTeamInputs() {
  const total = Number(document.querySelector("#point-live-team-count").value);
  const previous = [...document.querySelectorAll(".point-live-team-name")].map((input) => input.value);
  document.querySelector("#point-live-team-names").innerHTML = Array.from({ length: total }, (_, index) => `<label class="name-field">TIME ${index + 1}<input class="point-live-team-name" type="text" maxlength="28" value="${escapePoint(previous[index] || pointTeams[index] || `Equipe ${index + 1}`)}" /></label>`).join("");
  makeLivePointPlayerInputs();
}
function makeLivePointPlayerInputs() {
  const teams = [...document.querySelectorAll(".point-live-team-name")].map((input, index) => input.value.trim() || `Equipe ${index + 1}`);
  const count = Number(document.querySelector("#point-live-player-count").value);
  const previous = new Map([...document.querySelectorAll(".point-live-player-name")].map((input) => [input.dataset.playerKey, input.value]));
  document.querySelector("#point-live-players").innerHTML = `<div class="players-grid">${teams.map((team, teamIndex) => `<section class="player-team"><h3>${escapePoint(team)}</h3><div class="player-inputs">${Array.from({ length: count }, (_, playerIndex) => { const key = `${teamIndex}-${playerIndex}`; const value = previous.get(key) ?? pointRoster[teamIndex]?.[playerIndex] ?? ""; return `<input class="point-live-player-name" data-team="${teamIndex}" data-player-key="${key}" type="text" maxlength="40" value="${escapePoint(value)}" />`; }).join("")}</div></section>`).join("")}</div>`;
}
function getLivePointPlayers() {
  return [...document.querySelectorAll(".point-live-team-name")].map((_, teamIndex) => [...document.querySelectorAll(`.point-live-player-name[data-team="${teamIndex}"]`)].map((input) => input.value.trim()).filter(Boolean));
}
function openLivePointSettings() {
  const panel = document.querySelector("#point-live-settings");
  panel.hidden = !panel.hidden;
  document.querySelector("#point-adjust-game").setAttribute("aria-expanded", String(!panel.hidden));
  if (!panel.hidden) {
    document.querySelector("#point-live-team-count").value = pointTeams.length;
    document.querySelector("#point-live-round-count").value = pointSchedule.length;
    document.querySelector("#point-live-player-count").value = pointCurrentPlayerCount;
    makeLivePointTeamInputs();
    document.querySelector("#point-live-players").hidden = true;
    document.querySelector("#point-live-players-toggle").setAttribute("aria-expanded", "false");
    document.querySelector("#point-live-players-toggle").textContent = "Editar participantes";
  }
}
function applyLivePointSettings() {
  const liveTeams = [...document.querySelectorAll(".point-live-team-name")].map((input, index) => input.value.trim() || `Equipe ${index + 1}`);
  const teamCountChanged = liveTeams.length !== pointTeams.length;
  pointCurrentPlayerCount = Number(document.querySelector("#point-live-player-count").value);
  pointRoster = getLivePointPlayers();
  if (teamCountChanged) {
    const requestedTotal = Math.max(pointRound + 1, Number(document.querySelector("#point-live-round-count").value) || pointRound + 1);
    const preserved = pointSchedule.slice(0, pointRound + 1);
    const futureRounds = requestedTotal - preserved.length;
    const previousRound = pointSchedule[pointRound];
    const previousTeams = pointTeams;
    pointTeams = liveTeams;
    pointSchedule = [...preserved, ...buildPointExpandedSchedule(previousRound, previousTeams, pointTeams, futureRounds, preserved)];
  }
  document.querySelector("#point-live-settings").hidden = true;
  document.querySelector("#point-adjust-game").setAttribute("aria-expanded", "false");
  renderPointMatch(); savePointGame();
}

function pointPdfFileName(date = new Date()) {
  const value = new Date(date); const pad = (number) => String(number).padStart(2, "0");
  return `Volei Hub - ${pad(value.getDate())}-${pad(value.getMonth() + 1)}-${value.getFullYear()} ${pad(value.getHours())}h${pad(value.getMinutes())}.pdf`;
}
async function printPointGamePdf() {
  if (!pointSchedule.length) return;
  const Pdf = window.jspdf?.jsPDF;
  if (Pdf) {
    const pdf = new Pdf({ unit: "mm", format: "a4" }); let y = 18;
    const line = (text, size = 10, bold = false) => { pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size); const lines = pdf.splitTextToSize(text, 175); if (y + lines.length * 6 > 280) { pdf.addPage(); y = 18; } pdf.text(lines, 18, y); y += lines.length * 6; };
    line("VÔLEI HUB", 12, true); line("Tabelas do Jogo Ponto a Ponto", 20, true);
    pointSchedule.forEach((round, roundIndex) => { line(`Rodada ${roundIndex + 1}`, 13, true); round.matches.forEach(([home, away], matchIndex) => { const score = pointScores.get(pointKey(roundIndex, matchIndex)); line(`${home}    ${score ? `${score.home} × ${score.away}` : "×"}    ${away}`); }); if (round.bye) line(`Folga: ${round.bye}`, 9); y += 3; });
    const file = new File([pdf.output("blob")], pointPdfFileName(), { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ title: "Tabelas do Jogo Ponto a Ponto", text: "Tabelas de jogos do Vôlei Hub.", files: [file] }); return; } catch (error) { if (error.name === "AbortError") return; } }
  }
  const report = window.open("", "_blank");
  if (!report) { window.alert("Permita a abertura de janelas para enviar o PDF."); return; }
  const rounds = pointSchedule.map((round, roundIndex) => `<section class="round"><h2>Rodada ${roundIndex + 1}</h2>${round.matches.map(([home, away], matchIndex) => { const score = pointScores.get(pointKey(roundIndex, matchIndex)); return `<div class="match"><span>${escapePoint(home)}</span><strong>${score ? `${score.home} × ${score.away}` : "×"}</strong><span>${escapePoint(away)}</span></div>`; }).join("")}${round.bye ? `<p>Folga: <b>${escapePoint(round.bye)}</b></p>` : ""}</section>`).join("");
  report.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Tabelas do Jogo Ponto a Ponto</title><style>body{font-family:Arial,sans-serif;color:#1e293b;margin:36px}h1{font-size:30px}.round{break-inside:avoid;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0}.round h2{margin:0 0 12px}.match{display:grid;grid-template-columns:1fr auto 1fr;gap:18px;padding:9px 0;border-bottom:1px solid #e2e8f0}.match span:last-child{text-align:right}.match strong{color:#0e7490}@media print{body{margin:18px}}</style></head><body><p>VÔLEI HUB · JOGO PONTO A PONTO</p><h1>Tabelas de jogos</h1>${rounds}</body></html>`);
  report.document.close();
  window.setTimeout(() => { report.focus(); report.print(); }, 300);
}

function pointPlayerStandings() {
  const players = new Map();
  pointHistory.forEach((items) => items.forEach((item) => {
    if (item.player === "Outros") return;
    const key = `${item.team}\u0000${item.player}`;
    const entry = players.get(key) || { team: item.team, name: item.player, points: 0 };
    entry.points += 1; players.set(key, entry);
  }));
  return [...players.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
function renderPointLivePlayerRanking() {
  const node = document.querySelector("#point-live-player-ranking");
  const players = pointPlayerStandings().slice(0, 10);
  node.innerHTML = players.length ? players.map((player, index) => `<div class="ranking-row ${index < 3 ? "podium" : ""}"><strong>${index + 1}º</strong><span>${escapePoint(player.name)} <small>(${escapePoint(player.team)})</small></span><small class="ranking-stats"><span><b>Pontos</b>${player.points}</span></small></div>`).join("") : "<p>Nenhum ponto individual foi registrado.</p>";
}
function renderPointFinishedHistory() {
  const sections = pointSchedule.flatMap((round, roundIndex) => round.matches.map(([home, away], matchIndex) => {
    const key = pointKey(roundIndex, matchIndex); const items = pointHistory.get(key) || [];
    return `<div class="point-finished-match"><strong>Rodada ${roundIndex + 1}: ${escapePoint(home)} × ${escapePoint(away)}</strong><div class="point-history">${historyItems(key)}</div></div>`;
  })).join("");
  document.querySelector("#point-finished-history").innerHTML = `<h3>Histórico de movimentos</h3>${sections || "<p>Nenhum ponto registrado.</p>"}`;
}
async function finishPointGame(message) {
  const standings = getPointStandings();
  const playerStandings = pointPlayerStandings();
  const result = { id: Date.now(), gameType: "points", startedAt: pointStartedAt, finishedAt: new Date().toISOString(), reason: message, standings, playerStandings, schedule: pointSchedule, scores: [...pointScores.entries()].map(([key, score]) => [key, [String(score.home), String(score.away)]]), teams: pointTeams, players: pointRoster, playerCount: pointCurrentPlayerCount, pointHistory: [...pointHistory.entries()] };
  window.quickGameStore.addResult(result);
  const { error } = await window.quickGameStore.saveResultToCloud(result);
  if (error) console.warn("Não foi possível salvar o resultado no Supabase.", error);
  window.quickGameStore.clearActive();
  await window.quickGameStore.closeLiveGame(pointShareCode);
  document.querySelector("#point-game").hidden = true;
  document.querySelector("#point-overview").hidden = true;
  document.querySelector("#point-finished").hidden = false;
  document.querySelector("#point-finished-copy").textContent = message;
  document.querySelector("#point-finished-ranking").innerHTML = `<h3>Classificação final</h3><div class="ranking-list">${standings.map((team, index) => `<div class="ranking-row ${index < 3 ? "podium" : ""}"><strong>${index + 1}º</strong><span>${escapePoint(team.name)}</span><small class="ranking-stats"><span><b>Vit.</b>${team.wins}</span><span><b>Der.</b>${team.losses}</span><span><b>Jogos</b>${team.games}</span><span><b>Pontos</b>${team.points}</span><span><b>Saldo</b>${team.difference >= 0 ? "+" : ""}${team.difference}</span></small></div>`).join("")}</div>`;
  document.querySelector("#point-player-ranking").innerHTML = `<h3>Top 10 jogadores que mais pontuaram</h3><div class="ranking-list">${playerStandings.length ? playerStandings.slice(0, 10).map((player, index) => `<div class="ranking-row ${index < 3 ? "podium" : ""}"><strong>${index + 1}º</strong><span>${escapePoint(player.name)} <small>(${escapePoint(player.team)})</small></span><small class="ranking-stats"><span><b>Pontos</b>${player.points}</span></small></div>`).join("") : "<p>Nenhum ponto individual foi registrado.</p>"}</div>`;
  renderPointFinishedHistory();
  document.querySelector("#point-finished-history").hidden = true;
  document.querySelector("#point-finished-history-toggle").setAttribute("aria-expanded", "false");
  document.querySelector("#point-finished-history-toggle").textContent = "Ver histórico de movimentos";
}

function openScorerDialog(team) {
  selectedPointTeam = team; selectedPointPlayer = "";
  const players = [...(pointRoster[pointTeams.indexOf(team)] || []), "Outros"];
  document.querySelector("#point-scorer-title").textContent = team;
  document.querySelector("#point-scorer-options").innerHTML = players.map((player) => `<button class="point-scorer-choice" data-player="${escapePoint(player)}" type="button">${escapePoint(player)}</button>`).join("");
  document.querySelector("#point-scorer-continue").disabled = true;
  const dialog = document.querySelector("#point-scorer-dialog");
  if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
}
function closeScorerDialog() {
  selectedPointTeam = ""; selectedPointPlayer = "";
  const dialog = document.querySelector("#point-scorer-dialog");
  if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open");
}

document.querySelector("#point-settings-toggle").addEventListener("click", () => { const panel = document.querySelector("#point-settings-panel"); panel.hidden = !panel.hidden; });
pointTeamCount.addEventListener("change", makePointInputs);
pointPlayerCount.addEventListener("change", makePointPlayerInputs);
pointUnlimited.addEventListener("change", makePointInputs);
pointTeamNames.addEventListener("change", makePointPlayerInputs);
document.querySelector("#point-start").addEventListener("click", async () => {
  if (!readPointSetup()) {
    document.querySelector("#point-setup-message").textContent = "Informe pelo menos um participante em cada time ou ative a opção para iniciar sem nomes.";
    document.querySelector("#point-setup-message").className = "auth-message is-error";
    return;
  }
  const localActive = window.quickGameStore.getActive();
  if (localActive?.status === "active" && localActive.started === true) { document.querySelector("#point-setup-message").textContent = "Já existe um jogo em andamento. Encerre-o antes de iniciar outro."; document.querySelector("#point-setup-message").className = "auth-message is-error"; return; }
  const { data: cloudActive } = await window.quickGameStore.getOwnActiveLiveGame();
  if (cloudActive?.status === "active" && cloudActive.started === true) { document.querySelector("#point-setup-message").textContent = "Já existe um jogo em andamento nesta conta. Retorne ao jogo atual para continuar."; document.querySelector("#point-setup-message").className = "auth-message is-error"; return; }
  const rounds = normalizePointRounds(pointRoundCount.value, pointTeams.length, pointUnlimited.checked);
  pointRoundCount.value = rounds; pointCurrentPlayerCount = Number(pointPlayerCount.value); pointSchedule = buildPointSchedule(pointTeams, rounds); pointRound = 0; pointMatch = 0;
  pointScores.clear(); pointHistory.clear(); selectedOverviewMatch = ""; selectedOverviewTeam = ""; pointShareCode = generatePointShareCode(); pointStartedAt = new Date().toISOString();
  document.querySelector("#point-setup").hidden = true; document.querySelector("#point-game").hidden = false; renderPointMatch(); savePointGame();
});
document.querySelector("#point-current-match").addEventListener("click", (event) => {
  const add = event.target.closest(".point-add");
  if (add) { if (pointRequireNames.checked) { selectedPointTeam = add.dataset.team; registerPoint("Outros"); } else openScorerDialog(add.dataset.team); return; }
  if (event.target.closest("#point-advance-match")) advancePointMatch();
});
document.querySelector("#point-ranking").addEventListener("click", (event) => {
  const selected = event.target.closest("details");
  if (!selected) return;
  document.querySelectorAll("#point-ranking details[open]").forEach((details) => { if (details !== selected) details.removeAttribute("open"); });
});
document.querySelector("#point-scorer-options").addEventListener("click", (event) => {
  const choice = event.target.closest(".point-scorer-choice");
  if (!choice) return;
  selectedPointPlayer = choice.dataset.player;
  document.querySelectorAll(".point-scorer-choice").forEach((button) => button.classList.toggle("is-selected", button === choice));
  document.querySelector("#point-scorer-continue").disabled = false;
});
document.querySelector("#point-scorer-continue").addEventListener("click", () => {
  if (!selectedPointTeam || !selectedPointPlayer) return;
  const dialog = document.querySelector("#point-scorer-dialog");
  if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open");
  registerPoint(selectedPointPlayer);
});
document.querySelector("#point-scorer-close").addEventListener("click", closeScorerDialog);
document.querySelector("#point-scorer-dialog").addEventListener("cancel", () => { selectedPointTeam = ""; selectedPointPlayer = ""; });
document.querySelector("#point-show-rounds").addEventListener("click", () => { renderPointOverview(); if (pointRetroEditingUnlocked) renderPointRetroInputs(); document.querySelector("#point-overview").hidden = false; document.querySelector("#point-overview").scrollIntoView({ behavior: "smooth" }); });
document.querySelector("#point-print-game").addEventListener("click", printPointGamePdf);
document.querySelector("#point-adjust-game").addEventListener("click", openLivePointSettings);
document.querySelector("#point-live-team-count").addEventListener("change", makeLivePointTeamInputs);
document.querySelector("#point-live-player-count").addEventListener("change", makeLivePointPlayerInputs);
document.querySelector("#point-live-team-names").addEventListener("change", makeLivePointPlayerInputs);
document.querySelector("#point-live-players-toggle").addEventListener("click", () => { const panel = document.querySelector("#point-live-players"); panel.hidden = !panel.hidden; const open = !panel.hidden; document.querySelector("#point-live-players-toggle").setAttribute("aria-expanded", String(open)); document.querySelector("#point-live-players-toggle").textContent = open ? "Ocultar participantes" : "Editar participantes"; });
document.querySelector("#point-apply-live-settings").addEventListener("click", applyLivePointSettings);
document.querySelector("#point-retro-edit-toggle").addEventListener("click", () => { if (pointRetroEditingUnlocked) return; const panel = document.querySelector("#point-retro-auth-panel"); panel.hidden = !panel.hidden; if (!panel.hidden) document.querySelector("#point-retro-password").focus(); });
document.querySelector("#point-unlock-retro-edit").addEventListener("click", unlockPointRetroEditing);
document.querySelector("#point-save-retro-scores").addEventListener("click", savePointRetroScores);
document.querySelector("#point-close-overview").addEventListener("click", () => { document.querySelector("#point-overview").hidden = true; pointRetroEditingUnlocked = false; document.querySelector("#point-retro-auth-panel").hidden = true; document.querySelector("#point-save-retro-scores").hidden = true; document.querySelector("#point-retro-edit-toggle").textContent = "Ajustar jogos"; document.querySelector("#point-retro-password").value = ""; document.querySelector("#point-retro-edit-message").textContent = ""; });
document.querySelector("#point-overview-rounds").addEventListener("click", (event) => {
  const team = event.target.closest(".point-overview-team");
  const score = event.target.closest(".point-overview-score");
  const match = event.target.closest("[data-overview-match]");
  if (team && match) { const selected = `${match.dataset.overviewMatch}:${team.dataset.overviewTeam}`; selectedOverviewTeam = selectedOverviewTeam === selected ? "" : selected; selectedOverviewMatch = ""; renderPointOverview(); return; }
  if (score && !pointRequireNames.checked) { const selected = score.dataset.overviewScore; selectedOverviewMatch = selectedOverviewMatch === selected ? "" : selected; selectedOverviewTeam = ""; renderPointOverview(); }
});
document.querySelector("#point-finish").addEventListener("click", () => { document.querySelector("#point-finish-confirm").hidden = false; });
document.querySelector("#point-cancel-finish").addEventListener("click", () => { document.querySelector("#point-finish-confirm").hidden = true; });
document.querySelector("#point-confirm-finish").addEventListener("click", () => { document.querySelector("#point-finish-confirm").hidden = true; finishPointGame(`O jogo foi encerrado na rodada ${Math.min(pointRound + 1, pointSchedule.length)}.`); });
document.querySelector("#point-copy-share-code").addEventListener("click", async () => { try { await navigator.clipboard.writeText(pointShareCode); document.querySelector("#point-copy-share-code").textContent = "Código copiado"; } catch { document.querySelector("#point-copy-share-code").textContent = pointShareCode; } window.setTimeout(() => { document.querySelector("#point-copy-share-code").textContent = "Copiar código"; }, 1800); });
document.querySelector("#point-copy-share-link").addEventListener("click", async () => {
  const link = new URL(`acompanhar.html?codigo=${encodeURIComponent(pointShareCode)}`, window.location.href).href;
  try { await navigator.clipboard.writeText(link); document.querySelector("#point-copy-share-link").textContent = "Link copiado"; }
  catch { document.querySelector("#point-copy-share-link").textContent = "Não foi possível copiar"; }
  window.setTimeout(() => { document.querySelector("#point-copy-share-link").textContent = "Copiar link"; }, 1800);
});
document.querySelector("#point-new-game").addEventListener("click", () => { document.querySelector("#point-finished").hidden = true; document.querySelector("#point-setup").hidden = false; });
document.querySelector("#point-finished-history-toggle").addEventListener("click", () => { const history = document.querySelector("#point-finished-history"); history.hidden = !history.hidden; const open = !history.hidden; document.querySelector("#point-finished-history-toggle").setAttribute("aria-expanded", String(open)); document.querySelector("#point-finished-history-toggle").textContent = open ? "Ocultar histórico de movimentos" : "Ver histórico de movimentos"; });
makePointInputs();

try {
  const imported = JSON.parse(localStorage.getItem("volley-generator-import-points") || "null");
  if (imported?.teams?.length >= 3 && imported.teams.length <= 8) {
    pointTeamCount.value = imported.teams.length;
    pointPlayerCount.value = Math.max(3, Math.min(6, Number(imported.playerCount) || 4));
    makePointInputs();
    document.querySelectorAll(".point-team-name").forEach((input, index) => { input.value = imported.teams[index] || `Equipe ${index + 1}`; });
    makePointPlayerInputs();
    document.querySelectorAll(".point-player-name").forEach((input) => { const [teamIndex, playerIndex] = input.dataset.key.split("-").map(Number); input.value = imported.players?.[teamIndex]?.[playerIndex] || ""; });
    localStorage.removeItem("volley-generator-import-points");
  }
} catch { localStorage.removeItem("volley-generator-import-points"); }

function restorePointGame(game) {
  pointTeams = game.teams || [];
  pointRoster = game.players || pointTeams.map(() => []);
  pointSchedule = game.schedule || [];
  pointRound = Number(game.currentRound) || 0;
  pointMatch = Number(game.pointMatch) || 0;
  pointCurrentPlayerCount = Number(game.playerCount) || 4;
  pointShareCode = game.shareCode || generatePointShareCode();
  pointStartedAt = game.startedAt || new Date().toISOString();
  pointRequireNames.checked = Boolean(game.allowNoNames);
  pointScores.clear(); (game.scores || []).forEach(([key, score]) => { const [roundIndex, matchIndex] = key.split("-").map(Number); if (score.finished && score.confirmed === undefined) score.confirmed = roundIndex < pointRound || (roundIndex === pointRound && matchIndex < pointMatch); pointScores.set(key, score); });
  pointHistory.clear(); (game.pointHistory || []).forEach(([key, history]) => pointHistory.set(key, history));
  document.querySelector("#point-setup").hidden = true;
  document.querySelector("#point-game").hidden = false;
  renderPointMatch();
  savePointGame();
}

(async () => {
  const localGame = window.quickGameStore.getActive();
  if (localGame?.status === "active" && localGame.started === true && localGame.gameType === "points") { restorePointGame(localGame); return; }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: cloudGame } = await window.quickGameStore.getOwnActiveLiveGame();
    if (cloudGame?.status === "active" && cloudGame.started === true && cloudGame.gameType === "points") { restorePointGame(cloudGame); return; }
    if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 350));
  }
})().catch(() => {});
