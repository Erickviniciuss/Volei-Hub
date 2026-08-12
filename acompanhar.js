const viewerStatus = document.querySelector("#viewer-status");
const viewerContent = document.querySelector("#viewer-content");
const viewerCode = document.querySelector("#viewer-code");
const liveCode = new URLSearchParams(window.location.search).get("codigo")?.trim().toUpperCase();
const viewerCodeInput = document.querySelector("#viewer-game-code");
const viewerEnterCode = document.querySelector("#viewer-enter-code");
let viewerGame = null;
let selectedViewerHistory = "";

// Esta página é pública e não passa pelo table-auth, que normalmente remove esta classe.
document.body.classList.remove("app-loading");

function escapeViewer(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]); }
function scoreKeyViewer(round, game) { return `${round}-${game}`; }
function viewerStats(team) { return `<small class="ranking-stats"><span><b>Vit.</b>${team.wins}</span><span><b>Der.</b>${team.losses}</span><span><b>Jogos</b>${team.games}</span><span><b>Pontos</b>${team.points}</span><span><b>Saldo</b>${team.difference >= 0 ? "+" : ""}${team.difference}</span></small>`; }
function viewerTeamDropdown(game, team, away = false) {
  const teamIndex = (game.teams || []).indexOf(team);
  const players = game.players?.[teamIndex] || [];
  const content = players.length ? `<ul>${players.map((player) => `<li>${escapeViewer(player)}</li>`).join("")}</ul>` : "<span>Nenhum participante cadastrado.</span>";
  return `<div class="team-dropdown ${away ? "team-away" : ""}"><details><summary>${escapeViewer(team)}</summary><div class="dropdown-menu"><strong>${escapeViewer(team)}</strong>${content}</div></details></div>`;
}
// test
function viewerPointRanking(game) {
  if (Array.isArray(game.playerStandings)) return game.playerStandings.slice(0, 10);
  const players = new Map();
  (game.pointHistory || []).forEach(([, movements]) => (movements || []).forEach((movement) => {
    if (!movement.player || movement.player === "Outros") return;
    const key = `${movement.team}\u0000${movement.player}`;
    const player = players.get(key) || { team: movement.team, name: movement.player, points: 0 };
    player.points += 1; players.set(key, player);
  }));
  return [...players.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)).slice(0, 10);
}
function viewerMovementItems(game, key) {
  const movements = new Map(game.pointHistory || []).get(key) || [];
  return movements.map((movement, index) => `<span class="point-history-item"><strong>${index + 1}º lance</strong><em>${escapeViewer(movement.team)}: ${escapeViewer(movement.player)}</em><small>${movement.homeScore} × ${movement.awayScore}</small><time>${escapeViewer(movement.time || "")}</time></span>`).join("") || "Nenhum ponto registrado.";
}

function standingsFor(game) {
  const names = new Set(game.teams || []);
  (game.schedule || []).forEach((round) => round.matches.forEach(([home, away]) => { names.add(home); names.add(away); }));
  const standings = [...names].map((name) => ({ name, games: 0, wins: 0, losses: 0, points: 0, conceded: 0, difference: 0 }));
  const byName = new Map(standings.map((team) => [team.name, team]));
  const scores = new Map(game.scores || []);
  (game.schedule || []).forEach((round, roundIndex) => round.matches.forEach(([home, away], gameIndex) => {
    const score = scores.get(scoreKeyViewer(roundIndex, gameIndex));
    if (!score) return;
    const homePoints = Number(Array.isArray(score) ? score[0] : score.home);
    const awayPoints = Number(Array.isArray(score) ? score[1] : score.away);
    if (!Number.isFinite(homePoints) || !Number.isFinite(awayPoints)) return;
    const homeTeam = byName.get(home); const awayTeam = byName.get(away);
    homeTeam.games += 1; awayTeam.games += 1;
    homeTeam.points += homePoints; homeTeam.conceded += awayPoints;
    awayTeam.points += awayPoints; awayTeam.conceded += homePoints;
    if (homePoints > awayPoints) { homeTeam.wins += 1; awayTeam.losses += 1; }
    if (awayPoints > homePoints) { awayTeam.wins += 1; homeTeam.losses += 1; }
  }));
  return standings.map((team) => ({ ...team, difference: team.points - team.conceded })).sort((a, b) => b.wins - a.wins || b.difference - a.difference || b.points - a.points || a.name.localeCompare(b.name));
}

function renderViewer(game) {
  const finished = game.isActive === false || game.status === "finished";
  document.querySelector("#viewer-print-pdf").hidden = !finished;
  viewerCode.textContent = `Código: ${liveCode}`;
  viewerStatus.textContent = `Atualizado às ${new Date(game.updatedAt || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`;
  document.querySelector("#viewer-ranking").innerHTML = standingsFor(game).map((team, index) => `<div class="ranking-row ${index < 3 ? "podium" : ""}"><strong>${index + 1}º</strong><span>${escapeViewer(team.name)}</span>${viewerStats(team)}</div>`).join("");
  const scores = new Map(game.scores || []);
  const currentGame = Number(game.gameType === "points" ? game.pointMatch : game.confirmedGameCount) || 0;
  document.querySelector("#viewer-rounds").innerHTML = game.schedule.map((round, roundIndex) => `<article class="round overview-round ${roundIndex === game.currentRound ? "is-current" : ""}"><header class="round-title">Rodada ${roundIndex + 1}<span>${roundIndex === game.currentRound ? "ATUAL" : roundIndex < game.currentRound ? "CONCLUÍDA" : "AGUARDANDO"}</span></header>${round.matches.map(([home, away], gameIndex) => { const score = scores.get(scoreKeyViewer(roundIndex, gameIndex)); const value = score ? (Array.isArray(score) ? `${score[0]} × ${score[1]}` : `${score.home} × ${score.away}`) : "×"; return `<div class="match overview-match ${roundIndex === game.currentRound && gameIndex === currentGame ? "is-current-match" : ""}">${viewerTeamDropdown(game, home)}<span class="overview-score">${value}</span>${viewerTeamDropdown(game, away, true)}</div>`; }).join("")}${round.bye ? `<div class="bye">Folga: <strong>${escapeViewer(round.bye)}</strong></div>` : ""}</article>`).join("");
  if (finished) viewerStatus.textContent = game.reason || "Este jogo foi encerrado.";
  viewerGame = game;
  const playerSection = document.querySelector("#viewer-player-ranking-section");
  if (game.gameType === "points") {
    const players = viewerPointRanking(game);
    playerSection.hidden = false;
    document.querySelector("#viewer-player-ranking").innerHTML = players.length ? players.map((player, index) => `<div class="ranking-row ${index < 3 ? "podium" : ""}"><strong>${index + 1}º</strong><span>${escapeViewer(player.name)} <small>(${escapeViewer(player.team)})</small></span><small class="ranking-stats"><span><b>Pontos</b>${player.points}</span></small></div>`).join("") : "<p>Nenhum ponto individual foi registrado.</p>";
    const keys = game.schedule.flatMap((round, roundIndex) => round.matches.map((_, gameIndex) => scoreKeyViewer(roundIndex, gameIndex)));
    document.querySelectorAll("#viewer-rounds .overview-score").forEach((scoreNode, index) => {
      const key = keys[index]; scoreNode.classList.add("viewer-point-score"); scoreNode.dataset.viewerScore = key; scoreNode.setAttribute("role", "button"); scoreNode.setAttribute("tabindex", "0");
      if (selectedViewerHistory === key) scoreNode.closest(".overview-match").insertAdjacentHTML("afterend", `<div class="point-overview-history"><strong>Histórico de pontos</strong><div class="point-history">${viewerMovementItems(game, key)}</div></div>`);
    });
  } else playerSection.hidden = true;
  viewerContent.hidden = false;
}

async function loadViewerGame() {
  if (!liveCode) { viewerStatus.textContent = "Código de jogo não informado."; viewerStatus.classList.add("is-error"); return; }
  const { data, error } = await window.quickGameStore.getLiveGame(liveCode);
  if (error || !data) { viewerStatus.textContent = error ? `Não foi possível carregar o jogo: ${error.message}` : "Jogo não encontrado ou já finalizado."; viewerStatus.classList.add("is-error"); viewerContent.hidden = true; return; }
  viewerStatus.classList.remove("is-error");
  renderViewer(data);
}

function printViewerPdf() {
  if (!viewerGame) return;
  const scores = new Map(viewerGame.scores || []);
  const ranking = standingsFor(viewerGame).map((team, index) => `<tr><td>${index + 1}º</td><td>${escapeViewer(team.name)}</td><td>${team.games}</td><td>${team.wins}</td><td>${team.losses}</td><td>${team.points}</td><td>${team.difference >= 0 ? "+" : ""}${team.difference}</td></tr>`).join("");
  const rounds = (viewerGame.schedule || []).map((round, roundIndex) => `<section><h2>Rodada ${roundIndex + 1}</h2>${round.matches.map(([home, away], matchIndex) => { const score = scores.get(scoreKeyViewer(roundIndex, matchIndex)); const value = score ? (Array.isArray(score) ? `${score[0]} × ${score[1]}` : `${score.home} × ${score.away}`) : "×"; return `<p>${escapeViewer(home)} <strong>${value}</strong> ${escapeViewer(away)}</p>`; }).join("")}${round.bye ? `<p>Folga: ${escapeViewer(round.bye)}</p>` : ""}</section>`).join("");
  const report = window.open("", "_blank");
  if (!report) return;
  report.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Volei Hub - Resultado</title><style>body{font-family:Arial,sans-serif;color:#1e293b;margin:32px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#1f2937;color:#fff}section{break-inside:avoid;border:1px solid #cbd5e1;border-radius:8px;padding:14px;margin-top:18px}h2{margin-top:0}strong{color:#0e7490}</style></head><body><h1>VÔLEI HUB</h1><p>${escapeViewer(viewerGame.reason || "Jogo encerrado")}</p><h2>Classificação final</h2><table><thead><tr><th>#</th><th>Equipe</th><th>Jogos</th><th>Vit.</th><th>Der.</th><th>Pontos</th><th>Saldo</th></tr></thead><tbody>${ranking}</tbody></table>${rounds}</body></html>`);
  report.document.close();
  window.setTimeout(() => { report.focus(); report.print(); }, 300);
}

function openViewerFromCode() {
  const code = viewerCodeInput.value.trim().toUpperCase();
  if (!code) { viewerStatus.textContent = "Informe o código do jogo para acompanhar."; viewerStatus.classList.add("is-error"); viewerCodeInput.focus(); return; }
  window.location.assign(`acompanhar.html?codigo=${encodeURIComponent(code)}`);
}

viewerCodeInput.value = liveCode || "";
document.querySelector(".viewer-access").hidden = Boolean(liveCode);
viewerEnterCode.addEventListener("click", openViewerFromCode);
viewerCodeInput.addEventListener("keydown", (event) => { if (event.key === "Enter") openViewerFromCode(); });
document.querySelector("#viewer-print-pdf").addEventListener("click", printViewerPdf);

const viewerClient = window.quickGameStore.getCloudClient();
if (!viewerClient) { viewerStatus.textContent = "O Supabase não está configurado para o acompanhamento ao vivo."; viewerStatus.classList.add("is-error"); }
else if (!liveCode) { viewerStatus.textContent = "Informe o código do jogo acima para acompanhar."; }
else {
  loadViewerGame();
  viewerClient.channel(`live-game-${liveCode}`).on("postgres_changes", { event: "*", schema: "public", table: "live_games", filter: `share_code=eq.${liveCode}` }, (payload) => {
    loadViewerGame();
  }).subscribe();
  window.setInterval(loadViewerGame, 10000);
}

document.querySelector("#viewer-rounds").addEventListener("click", (event) => {
  const score = event.target.closest(".viewer-point-score");
  if (score && viewerGame?.gameType === "points") { selectedViewerHistory = selectedViewerHistory === score.dataset.viewerScore ? "" : score.dataset.viewerScore; renderViewer(viewerGame); return; }
  const selected = event.target.closest("details");
  if (!selected) return;
  document.querySelectorAll("#viewer-rounds details[open]").forEach((details) => { if (details !== selected) details.removeAttribute("open"); });
});
