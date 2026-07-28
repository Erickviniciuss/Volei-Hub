const resultsList = document.querySelector("#results-list");

function escapeResult(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]); }
function scoreFor(result, roundIndex, gameIndex) {
  const score = new Map(result.scores || []).get(`${roundIndex}-${gameIndex}`);
  return score && score[0] !== "" && score[1] !== "" ? `${score[0]} × ${score[1]}` : "—";
}
function resultStats(team) { return `<small class="ranking-stats"><span><b>Vit.</b>${team.wins}</span><span><b>Pontos</b>${team.points}</span><span><b>Saldo</b>${team.difference >= 0 ? "+" : ""}${team.difference}</span></small>`; }

function renderResults() {
  const savedResults = window.quickGameStore.getResults();
  if (!savedResults.length) {
    resultsList.innerHTML = `<section class="empty-results"><h2>Nenhum jogo encerrado</h2><p>Os resultados aparecerão aqui quando uma partida for finalizada.</p></section>`;
    return;
  }
  resultsList.innerHTML = savedResults.map((result) => {
    const date = new Date(result.finishedAt).toLocaleString("pt-BR");
    return `<article class="result-card"><div class="result-card-heading"><div><p class="eyebrow">${date}</p><h2>${escapeResult(result.reason)}</h2></div><div class="result-actions"><button class="print-result" type="button" data-id="${result.id}">Imprimir PDF</button><button class="delete-result" type="button" data-id="${result.id}">Excluir</button></div></div><div class="result-ranking">${result.standings.map((team, index) => `<div><strong>${index + 1}º</strong><span>${escapeResult(team.name)}</span>${resultStats(team)}</div>`).join("")}</div></article>`;
  }).join("");
}

function printResult(result) {
  if (!result.schedule) {
    window.alert("Este histórico foi salvo antes do relatório detalhado. Apenas os novos jogos possuem rodadas para impressão.");
    return;
  }
  const rows = result.standings.map((team, index) => `<tr><td>${index + 1}º</td><td>${escapeResult(team.name)}</td><td>${team.wins}</td><td>${team.points}</td><td>${team.difference >= 0 ? "+" : ""}${team.difference}</td></tr>`).join("");
  const rounds = result.schedule.map((round, roundIndex) => `<section class="round"><h2>Rodada ${roundIndex + 1}</h2>${round.matches.map(([home, away], gameIndex) => `<div class="match"><span>${escapeResult(home)}</span><strong>${scoreFor(result, roundIndex, gameIndex)}</strong><span>${escapeResult(away)}</span></div>`).join("")}${round.bye ? `<p>Folga: <b>${escapeResult(round.bye)}</b></p>` : ""}</section>`).join("");
  const report = window.open("", "_blank");
  if (!report) return;
  report.document.open();
  report.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Resultado - Vôlei Hub</title><style>body{font-family:Arial,sans-serif;color:#1e293b;margin:36px}h1{margin:0;font-size:32px}h2{margin:28px 0 12px}.muted{color:#64748b}table{width:100%;border-collapse:collapse;margin:16px 0 30px}th,td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left}.round{break-inside:avoid;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0}.round h2{margin:0 0 12px}.match{display:grid;grid-template-columns:1fr auto 1fr;gap:20px;padding:9px 0;border-bottom:1px solid #e2e8f0}.match span:last-child{text-align:right}.match strong{color:#0e7490}@media print{body{margin:18px}}</style></head><body><p class="muted">VÔLEI HUB · RESULTADO DE PARTIDA</p><h1>Classificação final</h1><p class="muted">${escapeResult(result.reason)} · ${new Date(result.finishedAt).toLocaleString("pt-BR")}</p><table><thead><tr><th>#</th><th>Time</th><th>Vitórias</th><th>Pontos</th><th>Saldo</th></tr></thead><tbody>${rows}</tbody></table><h1>Jogos por rodada</h1>${rounds}</body></html>`);
  report.document.close();
  window.setTimeout(() => { report.focus(); report.print(); }, 300);
}

resultsList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  const id = Number(button.dataset.id);
  const result = window.quickGameStore.getResults().find((item) => item.id === id);
  if (!result) return;
  if (button.classList.contains("delete-result")) {
    if (window.confirm("Excluir este histórico de jogo?")) { window.quickGameStore.deleteResult(id); renderResults(); }
  } else if (button.classList.contains("print-result")) printResult(result);
});

renderResults();
