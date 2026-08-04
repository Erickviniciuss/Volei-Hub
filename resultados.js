const resultsList = document.querySelector("#results-list");
const resultSyncStatus = document.querySelector("#result-sync-status");
const resultsDateFilter = document.querySelector("#results-date-filter");
const resultsTypeFilter = document.querySelector("#results-type-filter");
let displayedResults = [];
let allResults = [];
let visibleResults = 5;

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
function resultStats(team, result) { const visual = resultVisualStats(result, team); return `<small class="ranking-stats"><span><b>Vit.</b>${team.wins}</span><span><b>Der.</b>${visual.losses}</span><span><b>Jogos</b>${visual.games}</span><span><b>Pontos</b>${team.points}</span><span><b>Saldo</b>${team.difference >= 0 ? "+" : ""}${team.difference}</span></small>`; }

function localDate(value) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function renderResults() {
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
    return `<article class="result-card"><div class="result-card-heading"><div><p class="eyebrow">${date}</p><span class="result-game-type ${resultGameType(result)}">${resultGameTypeLabel(result)}</span><h2>${escapeResult(result.reason)}</h2></div><div class="result-actions"><button class="print-result" type="button" data-id="${result.id}">Enviar PDF</button><button class="delete-result" type="button" data-id="${result.id}">Excluir</button></div></div><div class="result-ranking">${result.standings.map((team, index) => `<div><strong>${index + 1}º</strong><span class="result-team-name">${escapeResult(team.name)}</span>${resultStats(team, result)}</div>`).join("")}</div>${playerHighlight}</article>`;
  }).join("") + (visible.length < results.length ? `<button id="show-more-results" class="show-more-results" type="button">Mostrar mais</button>` : "");
}

async function printResult(result) {
  if (!result.schedule) { window.alert("Este histórico foi salvo antes do relatório detalhado."); return; }
  const rows = result.standings.map((team, index) => { const visual = resultVisualStats(result, team); return `<tr><td>${index + 1}º</td><td>${escapeResult(team.name)}</td><td>${visual.games}</td><td>${team.wins}</td><td>${visual.losses}</td><td>${team.points}</td><td>${team.difference >= 0 ? "+" : ""}${team.difference}</td></tr>`; }).join("");
  const teamNames = result.teams?.length ? result.teams : result.standings.map((team) => team.name);
  const totalPlayers = result.playerCount || Math.max(4, ...(result.players || []).map((players) => players.length));
  const topPlayers = resultGameType(result) === "points" ? pointPlayerRanking(result).slice(0, 10) : [];
  const participants = teamNames.map((team, teamIndex) => {
    const names = Array.from({ length: totalPlayers }, (_, playerIndex) => result.players?.[teamIndex]?.[playerIndex] || "Vazio");
    return `<section class="team"><h3>${escapeResult(team)}</h3><p>${names.map(escapeResult).join(" · ")}</p></section>`;
  }).join("");
  const rounds = result.schedule.map((round, roundIndex) => `<section class="round"><h2>Rodada ${roundIndex + 1}</h2>${round.matches.map(([home, away], gameIndex) => { const movements = pointMovements(result, roundIndex, gameIndex); return `<div class="match"><span>${escapeResult(home)}</span><strong>${scoreFor(result, roundIndex, gameIndex)}</strong><span>${escapeResult(away)}</span></div>${movements.length ? `<div class="print-movements"><b>Histórico de movimentos</b>${movements.map((movement, index) => `<p>${index + 1}º lance · ${escapeResult(movementText(movement))}</p>`).join("")}</div>` : ""}`; }).join("")}${round.bye ? `<p>Folga: <b>${escapeResult(round.bye)}</b></p>` : ""}</section>`).join("");
  const topPlayersHtml = topPlayers.length ? `<h1>Top 10 jogadores</h1><ol>${topPlayers.map((player) => `<li>${escapeResult(player.name)} · ${escapeResult(player.team)} · ${player.points} pontos</li>`).join("")}</ol>` : "";
  const Pdf = window.jspdf?.jsPDF;
  if (Pdf) {
    const pdf = new Pdf({ unit: "mm", format: "a4" }); let y = 18;
    const line = (text, size = 10, bold = false) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(text, 175);
      if (y + lines.length * 6 > 280) { pdf.addPage(); y = 18; }
      pdf.text(lines, 18, y); y += lines.length * 6;
    };
    const compactMovements = (movements) => {
      const writeCompact = (text) => {
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(6);
        const lines = pdf.splitTextToSize(text, 175);
        if (y + lines.length * 2.6 > 280) { pdf.addPage(); y = 18; }
        pdf.text(lines, 18, y); y += lines.length * 2.6;
      };
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6);
      let row = [];
      movements.forEach((movement, index) => {
        const entry = `${index + 1}º ${movement.team}: ${movement.player}${movement.time ? ` ${movement.time}` : ""} ${movement.homeScore} × ${movement.awayScore}`;
        const candidate = [...row, entry].join(" | ");
        if (row.length && (row.length === 6 || pdf.getTextWidth(candidate) > 175)) { writeCompact(row.join(" | ")); row = [entry]; }
        else row.push(entry);
      });
      if (row.length) writeCompact(row.join(" | "));
    };
    line("VÔLEI HUB", 12, true); line("Resultado de partida", 20, true); line(result.reason); y += 3;
    line("Classificação final", 15, true);
    const columns = [10, 62, 18, 18, 18, 24, 24];
    const headers = ["#", "Equipe", "Jogos", "Vit.", "Der.", "Pontos", "Saldo"];
    const drawRankingRow = (cells, header = false) => {
      const height = 8;
      if (y + height > 280) { pdf.addPage(); y = 18; }
      let x = 18;
      cells.forEach((cell, index) => {
        pdf.setDrawColor(190, 200, 210);
        pdf.setFillColor(header ? 30 : 255, header ? 41 : 255, header ? 59 : 255);
        pdf.rect(x, y, columns[index], height, "F");
        pdf.rect(x, y, columns[index], height, "S");
        pdf.setTextColor(header ? 255 : 30, header ? 255 : 41, header ? 255 : 59);
        pdf.setFont("helvetica", header ? "bold" : "normal"); pdf.setFontSize(header ? 8 : 8.5);
        const text = pdf.splitTextToSize(String(cell), columns[index] - 3)[0] || "";
        const centered = index !== 1;
        if (centered) pdf.text(text, x + columns[index] / 2, y + 5.2, { align: "center" });
        else pdf.text(text, x + 1.5, y + 5.2);
        x += columns[index];
      });
      y += height;
    };
    drawRankingRow(headers, true);
    result.standings.forEach((team, index) => {
      const visual = resultVisualStats(result, team);
      drawRankingRow([`${index + 1}º`, team.name, visual.games, team.wins, visual.losses, team.points, `${team.difference >= 0 ? "+" : ""}${team.difference}`]);
    });
    pdf.setTextColor(30, 41, 59);
    if (topPlayers.length) {
      y += 12; line("Top 10 jogadores", 15, true);
      topPlayers.forEach((player, index) => line(`${index + 1}º ${player.name} · ${player.team} · ${player.points} pontos`));
    }
    y += 12; line("Participantes por equipe", 15, true);
    teamNames.forEach((team, teamIndex) => {
      const names = Array.from({ length: totalPlayers }, (_, playerIndex) => result.players?.[teamIndex]?.[playerIndex] || "Vazio");
      line(`${team}: ${names.join(", ")}`);
    });
    y += 3; line("Jogos por rodada", 15, true);
    result.schedule.forEach((round, roundIndex) => {
      line(`Rodada ${roundIndex + 1}`, 13, true);
      round.matches.forEach(([home, away], gameIndex) => {
        line(`${home}    ${scoreFor(result, roundIndex, gameIndex)}    ${away}`);
        const movements = pointMovements(result, roundIndex, gameIndex);
        compactMovements(movements);
        if (movements.length) y += 4;
      });
      if (round.bye) line(`Folga: ${round.bye}`, 9);
      y += 3;
    });
    const file = new File([pdf.output("blob")], resultPdfFileName(result.startedAt || result.finishedAt), { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: "Resultado - Vôlei Hub", text: "Resultado da partida.", files: [file] }); return; }
      catch (error) { if (error.name === "AbortError") return; }
    }
  }
  const report = window.open("", "_blank"); if (!report) return;
  report.document.open();
  report.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Resultado - Vôlei Hub</title><style>body{font-family:Arial,sans-serif;color:#1e293b;margin:36px}h1{margin:0;font-size:32px}h2{margin:28px 0 12px}.muted{color:#64748b}table{width:100%;border-collapse:collapse;margin:16px 0 30px}th,td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left}.teams{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0 30px}.team,.round{break-inside:avoid;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0}.team{margin:0}.team h3{margin:0 0 8px}.team p{margin:0;line-height:1.5}.round h2{margin:0 0 12px}.match{display:grid;grid-template-columns:1fr auto 1fr;gap:20px;padding:9px 0;border-bottom:1px solid #e2e8f0}.match span:last-child{text-align:right}.match strong{color:#0e7490}@media print{body{margin:18px}}</style></head><body><p class="muted">VÔLEI HUB · RESULTADO DE PARTIDA</p><h1>Classificação final</h1><p class="muted">${escapeResult(result.reason)} · ${new Date(result.finishedAt).toLocaleString("pt-BR")}</p><table><thead><tr><th>#</th><th>Time</th><th>Jogos</th><th>Vitórias</th><th>Derrotas</th><th>Pontos</th><th>Saldo</th></tr></thead><tbody>${rows}</tbody></table><h1>Participantes por equipe</h1><div class="teams">${participants}</div><h1>Jogos por rodada</h1>${rounds}</body></html>`);
  report.document.close(); window.setTimeout(() => { report.focus(); report.print(); }, 300);
}

resultsList.addEventListener("click", async (event) => {
  if (event.target.closest("#show-more-results")) { visibleResults += 5; renderResults(); return; }
  const button = event.target.closest("button[data-id]"); if (!button) return;
  const id = Number(button.dataset.id); const result = displayedResults.find((item) => item.id === id); if (!result) return;
  if (button.classList.contains("delete-result") && window.confirm("Excluir este histórico de jogo?")) {
    window.quickGameStore.deleteResult(id);
    await window.quickGameStore.deleteResultFromCloud(id);
    await loadResults();
  } else if (button.classList.contains("print-result")) printResult(result);
});

async function loadResults() {
  const localResults = window.quickGameStore.getResults();
  const syncResponses = await Promise.all(localResults.map((result) => window.quickGameStore.saveResultToCloud(result)));
  const { data: cloudResults, error } = await window.quickGameStore.getCloudResults();
  const merged = [...cloudResults, ...localResults.filter((local) => !cloudResults.some((cloud) => cloud.id === local.id))]
    .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));
  allResults = merged;
  visibleResults = 5;
  renderResults();
  const syncError = syncResponses.find((response) => response?.error)?.error;
  if (error || syncError) {
    resultSyncStatus.textContent = "Não foi possível sincronizar com o Supabase. Verifique se o script supabase-schema.sql foi executado no projeto.";
    resultSyncStatus.className = "result-sync-status is-error";
    console.warn("Resultados do Supabase indisponíveis.", error || syncError);
  } else {
    resultSyncStatus.textContent = cloudResults.length ? "Resultados sincronizados com sua conta." : "";
    resultSyncStatus.className = "result-sync-status";
  }
}

resultsDateFilter.addEventListener("change", () => { visibleResults = 5; renderResults(); });
resultsTypeFilter.addEventListener("change", () => { visibleResults = 5; renderResults(); });
document.querySelector("#clear-results-filter").addEventListener("click", () => { resultsDateFilter.value = ""; resultsTypeFilter.value = "all"; visibleResults = 5; renderResults(); });

loadResults();
