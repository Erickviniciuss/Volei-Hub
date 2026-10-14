// game-export.js - Exportador de dados de jogos do Vôlei Hub para JSON
(function (global) {
  "use strict";

  function parseScoreValues(scoreVal) {
    if (!scoreVal) return null;
    if (Array.isArray(scoreVal)) {
      if (scoreVal[0] === "" || scoreVal[1] === "" || scoreVal[0] == null || scoreVal[1] == null) return null;
      const h = Number(scoreVal[0]);
      const a = Number(scoreVal[1]);
      return isNaN(h) || isNaN(a) ? null : [h, a];
    }
    if (typeof scoreVal === "object") {
      const h = Number(scoreVal.home ?? scoreVal.homeScore ?? scoreVal.p1);
      const a = Number(scoreVal.away ?? scoreVal.awayScore ?? scoreVal.p2);
      return isNaN(h) || isNaN(a) ? null : [h, a];
    }
    return null;
  }

  function getScoreFromData(scores, key) {
    if (!scores) return null;
    if (scores instanceof Map) return scores.get(key);
    if (Array.isArray(scores)) {
      const entry = scores.find((item) => Array.isArray(item) && item[0] === key);
      return entry ? entry[1] : null;
    }
    if (typeof scores === "object") return scores[key];
    return null;
  }

  function resultVisualStats(result, team) {
    if (Number.isFinite(team?.games) && Number.isFinite(team?.losses)) {
      return { games: team.games, losses: team.losses };
    }
    let games = 0;
    let losses = 0;
    const scores = result?.scores instanceof Map ? result.scores : new Map(result?.scores || []);
    (result?.schedule || []).forEach((round, roundIndex) => {
      (round?.matches || []).forEach(([home, away], gameIndex) => {
        if (home !== team.name && away !== team.name) return;
        const rawScore = scores.get(`${roundIndex}-${gameIndex}`);
        const parsed = parseScoreValues(rawScore);
        if (!parsed) return;
        games += 1;
        const [homePoints, awayPoints] = parsed;
        if ((home === team.name && homePoints < awayPoints) || (away === team.name && awayPoints < homePoints)) {
          losses += 1;
        }
      });
    });
    return { games, losses };
  }

  function extractTeams(result) {
    const list = [];
    if (Array.isArray(result?.teams)) {
      result.teams.forEach((t) => {
        if (typeof t === "string" && t.trim() && !list.includes(t.trim())) list.push(t.trim());
      });
    }
    if (Array.isArray(result?.standings)) {
      result.standings.forEach((s) => {
        if (s && typeof s.name === "string" && s.name.trim() && !list.includes(s.name.trim())) list.push(s.name.trim());
      });
    }
    if (Array.isArray(result?.schedule)) {
      result.schedule.forEach((round) => {
        (round?.matches || []).forEach(([home, away]) => {
          if (home && typeof home === "string" && !list.includes(home.trim())) list.push(home.trim());
          if (away && typeof away === "string" && !list.includes(away.trim())) list.push(away.trim());
        });
        if (round?.bye && typeof round.bye === "string" && !list.includes(round.bye.trim())) list.push(round.bye.trim());
      });
    }
    return list;
  }

  function extractTeamMembers(result, teamName, teamIndex) {
    const members = [];
    if (Array.isArray(result?.players) && result.players[teamIndex]) {
      const raw = Array.isArray(result.players[teamIndex]) ? result.players[teamIndex] : [result.players[teamIndex]];
      raw.forEach((p) => members.push(p));
    }
    if (result?.players && typeof result.players === "object" && !Array.isArray(result.players) && result.players[teamName]) {
      const raw = Array.isArray(result.players[teamName]) ? result.players[teamName] : [result.players[teamName]];
      raw.forEach((p) => members.push(p));
    }
    if (Array.isArray(result?.playerStandings)) {
      result.playerStandings.forEach((p) => {
        if (p && p.team === teamName && p.name && p.name !== "Outros") members.push(p.name);
      });
    }
    if (Array.isArray(result?.pointHistory)) {
      result.pointHistory.forEach(([, movements]) => {
        (movements || []).forEach((m) => {
          if (m && m.team === teamName && m.player && m.player !== "Outros") members.push(m.player);
        });
      });
    }
    const clean = members
      .map((p) => String(p || "").trim())
      .filter((p) => p !== "" && p !== "Vazio" && p.toLowerCase() !== "null" && p.toLowerCase() !== "undefined");
    return [...new Set(clean)];
  }

  function resultLeader(team, result, standings) {
    const leader = standings?.[0];
    if (!leader || leader.wins <= 0) return false;
    if (result?.tieBreakMode === "wins") return team.wins === leader.wins;
    return team.wins === leader.wins && team.difference === leader.difference && team.points === leader.points;
  }

  function generateStandingsFromSchedule(result) {
    const teamNames = extractTeams(result);
    const byName = new Map(teamNames.map((name) => [name, { name, games: 0, wins: 0, losses: 0, points: 0, conceded: 0, difference: 0 }]));
    const scores = result?.scores instanceof Map ? result.scores : new Map(result?.scores || []);
    (result?.schedule || []).forEach((round, roundIndex) => {
      (round?.matches || []).forEach(([home, away], gameIndex) => {
        const raw = scores.get(`${roundIndex}-${gameIndex}`);
        const parsed = parseScoreValues(raw);
        if (!parsed) return;
        const [homePoints, awayPoints] = parsed;
        const hTeam = byName.get(home);
        const aTeam = byName.get(away);
        if (hTeam) {
          hTeam.games += 1;
          hTeam.points += homePoints;
          hTeam.conceded += awayPoints;
          if (homePoints > awayPoints) hTeam.wins += 1;
          else if (awayPoints > homePoints) hTeam.losses += 1;
        }
        if (aTeam) {
          aTeam.games += 1;
          aTeam.points += awayPoints;
          aTeam.conceded += homePoints;
          if (awayPoints > homePoints) aTeam.wins += 1;
          else if (homePoints > awayPoints) aTeam.losses += 1;
        }
      });
    });
    const list = [...byName.values()];
    list.forEach((t) => { t.difference = t.points - t.conceded; });
    return list.sort((a, b) => b.wins - a.wins || b.difference - a.difference || b.points - a.points || a.name.localeCompare(b.name));
  }

  function pointPlayerRanking(result) {
    if (Array.isArray(result?.playerStandings)) return result.playerStandings;
    const players = new Map();
    (result?.pointHistory || []).forEach(([, movements]) => (movements || []).forEach((movement) => {
      if (!movement?.player || movement.player === "Outros") return;
      const key = `${movement.team}\u0000${movement.player}`;
      const current = players.get(key) || { team: movement.team, name: movement.player, points: 0 };
      current.points += 1;
      players.set(key, current);
    }));
    return [...players.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  }

  function buildGameExportData(result) {
    if (!result) throw new Error("Objeto de jogo inválido");

    const allTeams = extractTeams(result);
    const standingsRaw = (Array.isArray(result.standings) && result.standings.length > 0)
      ? result.standings
      : generateStandingsFromSchedule(result);

    const standings = standingsRaw.length > 0
      ? standingsRaw
      : allTeams.map((name) => ({ name, wins: 0, losses: 0, games: 0, points: 0, conceded: 0, difference: 0 }));

    const teamsExport = standings.map((team, index) => {
      const teamIdx = allTeams.indexOf(team.name);
      const players = extractTeamMembers(result, team.name, teamIdx !== -1 ? teamIdx : index);
      const visual = resultVisualStats(result, team);

      const wins = Number.isFinite(team.wins) ? team.wins : 0;
      const losses = Number.isFinite(team.losses) ? team.losses : (visual.losses ?? 0);
      const games = Number.isFinite(team.games) ? team.games : (visual.games ?? (wins + losses));
      const points = Number.isFinite(team.points) ? team.points : 0;
      const difference = Number.isFinite(team.difference) ? team.difference : 0;
      const conceded = Number.isFinite(team.conceded) ? team.conceded : (points - difference);
      const isLeader = resultLeader(team, result, standings) || (index === 0 && (wins > 0 || games > 0));

      return {
        nome: team.name,
        posicao: index + 1,
        vencedor: isLeader,
        vitorias: wins,
        derrotas: losses,
        jogos: games,
        saldo: difference,
        pontos: points,
        pontosSofridos: conceded,
        jogadores: players,

        // Compatibilidade internacional / sistemas em inglês:
        name: team.name,
        position: index + 1,
        isWinner: isLeader,
        wins: wins,
        losses: losses,
        games: games,
        difference: difference,
        points: points,
        conceded: conceded,
        players: players
      };
    });

    const leader = standings[0];
    const tiedLeaders = standings.filter((t) => resultLeader(t, result, standings));
    const winnersList = tiedLeaders.length > 0 ? tiedLeaders.map((t) => t.name) : (leader ? [leader.name] : []);
    const mainWinner = winnersList.length > 0 ? winnersList[0] : (leader?.name || null);

    const rodadasExport = (result.schedule || []).map((round, rIndex) => {
      return {
        rodada: rIndex + 1,
        folga: round?.bye || null,
        partidas: (round?.matches || []).map(([home, away], mIndex) => {
          const rawScore = getScoreFromData(result.scores, `${rIndex}-${mIndex}`);
          const parsed = parseScoreValues(rawScore);
          const finished = parsed != null;
          const homeScore = finished ? parsed[0] : null;
          const awayScore = finished ? parsed[1] : null;
          let matchWinner = null;
          if (finished) {
            if (homeScore > awayScore) matchWinner = home;
            else if (awayScore > homeScore) matchWinner = away;
            else matchWinner = "Empate";
          }
          return {
            partida: mIndex + 1,
            timeCasa: home,
            timeVisitante: away,
            placarCasa: homeScore,
            placarVisitante: awayScore,
            placarFormatado: finished ? `${homeScore} × ${awayScore}` : "—",
            vencedor: matchWinner,

            // Compatibilidade em inglês:
            matchNumber: mIndex + 1,
            homeTeam: home,
            awayTeam: away,
            homeScore: homeScore,
            awayScore: awayScore,
            scoreFormatted: finished ? `${homeScore} × ${awayScore}` : "—",
            winner: matchWinner
          };
        })
      };
    });

    const todasPartidas = [];
    rodadasExport.forEach((r) => {
      (r.partidas || []).forEach((p) => {
        todasPartidas.push({
          rodada: r.rodada,
          folgaRodada: r.folga,
          ...p
        });
      });
    });

    const individualRanking = result.gameType === "points" ? pointPlayerRanking(result) : [];
    const topScorers = individualRanking.map((p, idx) => ({
      posicao: idx + 1,
      nome: p.name,
      equipe: p.team,
      pontos: p.points,
      position: idx + 1,
      name: p.name,
      team: p.team,
      points: p.points
    }));

    const dateStarted = result.startedAt || null;
    const dateFinished = result.finishedAt || null;
    const finishedFormatted = dateFinished
      ? new Date(dateFinished).toLocaleString("pt-BR")
      : (dateStarted ? new Date(dateStarted).toLocaleString("pt-BR") : "");

    return {
      versaoExportacao: "1.0",
      sistema: "Vôlei Hub",
      exportadoEm: new Date().toISOString(),
      id: result.id,
      tipoJogo: result.gameType === "points" ? "points" : "result",
      tipoJogoDescricao: result.gameType === "points" ? "Jogo Ponto a Ponto" : "Jogo por Resultado",
      dataInicio: dateStarted,
      dataFim: dateFinished,
      dataFinalizacaoFormatada: finishedFormatted,
      motivo: result.reason || "Partida finalizada",
      vencedor: mainWinner,
      winner: mainWinner,
      vencedores: winnersList,
      winners: winnersList,
      equipes: teamsExport,
      teams: teamsExport,
      classificacao: teamsExport,
      standings: teamsExport,
      partidas: todasPartidas,
      matches: todasPartidas,
      rodadas: rodadasExport,
      rounds: rodadasExport,
      jogadoresDestaque: topScorers,
      topScorers: topScorers,
      alertaEquilibrio: result.exclusionAlert || null,
      criterioDesempate: result.tieBreakMode || "full",
      exibirSaldoPontos: result.showPointsBalance !== false,
      dadosBrutos: {
        schedule: result.schedule || [],
        scores: result.scores || [],
        standings: result.standings || [],
        players: result.players || [],
        pointHistory: result.pointHistory || []
      }
    };
  }

  function resultJsonFileName(result) {
    const dateValue = result?.finishedAt || result?.startedAt || new Date();
    const value = new Date(dateValue);
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = !isNaN(value.getTime())
      ? `${pad(value.getDate())}-${pad(value.getMonth() + 1)}-${value.getFullYear()} ${pad(value.getHours())}h${pad(value.getMinutes())}`
      : String(result?.id || Date.now());
    return `Volei Hub - ${dateStr}.json`;
  }

  function downloadJsonBlob(filename, data) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportGameAsJson(result, buttonEl) {
    try {
      const data = buildGameExportData(result);
      const filename = resultJsonFileName(result);
      downloadJsonBlob(filename, data);

      if (buttonEl) {
        const originalContent = buttonEl.innerHTML;
        const originalTitle = buttonEl.getAttribute("title") || "";
        buttonEl.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
        buttonEl.setAttribute("title", "Exportado com sucesso!");
        buttonEl.classList.add("is-exported");
        setTimeout(() => {
          buttonEl.innerHTML = originalContent;
          buttonEl.classList.remove("is-exported");
          if (originalTitle) buttonEl.setAttribute("title", originalTitle);
        }, 1400);
      }
      return { ok: true, filename, data };
    } catch (err) {
      console.error("Erro ao exportar jogo em JSON:", err);
      if (global.alert) global.alert("Não foi possível gerar o arquivo JSON deste jogo.");
      return { ok: false, error: err };
    }
  }

  global.buildGameExportData = buildGameExportData;
  global.resultJsonFileName = resultJsonFileName;
  global.downloadJsonBlob = downloadJsonBlob;
  global.exportGameAsJson = exportGameAsJson;
})(typeof window !== "undefined" ? window : globalThis);
