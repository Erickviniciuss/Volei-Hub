const viewerStatus = document.querySelector("#viewer-status");
const viewerContent = document.querySelector("#viewer-content");
const viewerCode = document.querySelector("#viewer-code");
const liveCode = new URLSearchParams(window.location.search).get("codigo")?.trim().toUpperCase();

function escapeViewer(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]); }
function scoreKeyViewer(round, game) { return `${round}-${game}`; }
function viewerStats(team) { return `<small class="ranking-stats"><span><b>Vit.</b>${team.wins}</span><span><b>Pontos</b>${team.points}</span><span><b>Saldo</b>${team.difference >= 0 ? "+" : ""}${team.difference}</span></small>`; }

function standingsFor(game) {
  const names = new Set(game.teams || []);
  (game.schedule || []).forEach((round) => round.matches.forEach(([home, away]) => { names.add(home); names.add(away); }));
  const standings = [...names].map((name) => ({ name, wins: 0, points: 0, conceded: 0, difference: 0 }));
  const byName = new Map(standings.map((team) => [team.name, team]));
  const scores = new Map(game.scores || []);
  (game.schedule || []).forEach((round, roundIndex) => round.matches.forEach(([home, away], gameIndex) => {
    const score = scores.get(scoreKeyViewer(roundIndex, gameIndex));
    if (!score || score[0] === "" || score[1] === "") return;
    const homePoints = Number(score[0]); const awayPoints = Number(score[1]);
    const homeTeam = byName.get(home); const awayTeam = byName.get(away);
    homeTeam.points += homePoints; homeTeam.conceded += awayPoints;
    awayTeam.points += awayPoints; awayTeam.conceded += homePoints;
    if (homePoints > awayPoints) homeTeam.wins += 1;
    if (awayPoints > homePoints) awayTeam.wins += 1;
  }));
  return standings.map((team) => ({ ...team, difference: team.points - team.conceded })).sort((a, b) => b.wins - a.wins || b.difference - a.difference || b.points - a.points || a.name.localeCompare(b.name));
}

function renderViewer(game) {
  viewerCode.textContent = `Código: ${liveCode}`;
  viewerStatus.textContent = `Atualizado às ${new Date(game.updatedAt || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`;
  document.querySelector("#viewer-ranking").innerHTML = standingsFor(game).map((team, index) => `<div class="ranking-row ${index < 3 ? "podium" : ""}"><strong>${index + 1}º</strong><span>${escapeViewer(team.name)}</span>${viewerStats(team)}</div>`).join("");
  const scores = new Map(game.scores || []);
  document.querySelector("#viewer-rounds").innerHTML = game.schedule.map((round, roundIndex) => `<article class="round overview-round ${roundIndex === game.currentRound ? "is-current" : ""}"><header class="round-title">Rodada ${roundIndex + 1}<span>${roundIndex === game.currentRound ? "ATUAL" : roundIndex < game.currentRound ? "CONCLUÍDA" : "AGUARDANDO"}</span></header>${round.matches.map(([home, away], gameIndex) => { const score = scores.get(scoreKeyViewer(roundIndex, gameIndex)); const value = score && score[0] !== "" && score[1] !== "" ? `${score[0]} × ${score[1]}` : "×"; return `<div class="match overview-match"><span>${escapeViewer(home)}</span><span class="overview-score">${value}</span><span class="team-away">${escapeViewer(away)}</span></div>`; }).join("")}${round.bye ? `<div class="bye">Folga: <strong>${escapeViewer(round.bye)}</strong></div>` : ""}</article>`).join("");
  viewerContent.hidden = false;
}

async function loadViewerGame() {
  if (!liveCode) { viewerStatus.textContent = "Código de jogo não informado."; viewerStatus.classList.add("is-error"); return; }
  const { data, error } = await window.quickGameStore.getLiveGame(liveCode);
  if (error || !data) { viewerStatus.textContent = "Jogo não encontrado ou já finalizado."; viewerStatus.classList.add("is-error"); viewerContent.hidden = true; return; }
  viewerStatus.classList.remove("is-error");
  renderViewer(data);
}

const viewerClient = window.quickGameStore.getCloudClient();
if (!viewerClient) { viewerStatus.textContent = "O Supabase não está configurado para o acompanhamento ao vivo."; viewerStatus.classList.add("is-error"); }
else {
  loadViewerGame();
  viewerClient.channel(`live-game-${liveCode}`).on("postgres_changes", { event: "*", schema: "public", table: "live_games", filter: `share_code=eq.${liveCode}` }, (payload) => {
    if (payload.new?.is_active === false) { viewerStatus.textContent = "Este jogo foi encerrado."; viewerContent.hidden = true; return; }
    loadViewerGame();
  }).subscribe();
  window.setInterval(loadViewerGame, 10000);
}
