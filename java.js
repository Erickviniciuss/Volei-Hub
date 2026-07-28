const countSelect = document.querySelector("#team-count");
const roundCount = document.querySelector("#round-count");
const playerCount = document.querySelector("#player-count");
const settingsToggle = document.querySelector("#settings-toggle");
const settingsPanel = document.querySelector("#settings-panel");
const unlimitedRounds = document.querySelector("#unlimited-rounds");
const namesContainer = document.querySelector("#team-names");
const playersPanel = document.querySelector("#players-panel");
const playersToggle = document.querySelector("#players-toggle");
const generateButton = document.querySelector("#generate-button");
const roundsContainer = document.querySelector("#rounds");
const summary = document.querySelector("#schedule-summary");

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;",
  })[character]);
}

function makeNameInputs() {
  const total = Number(countSelect.value);
  const previousNames = [...document.querySelectorAll(".team-name")].map((input) => input.value);

  namesContainer.innerHTML = Array.from({ length: total }, (_, index) => `
    <label class="name-field" for="team-${index + 1}">
      TIME ${index + 1}
      <input class="team-name" id="team-${index + 1}" type="text" value="${previousNames[index] || `Equipe ${index + 1}`}" maxlength="28" />
    </label>
  `).join("");
  makePlayerInputs();
  const maximumRounds = maximumUniqueGameRounds(total);
  if (!unlimitedRounds.checked) {
    roundCount.removeAttribute("max");
    roundCount.min = maximumRounds;
    roundCount.step = maximumRounds;
  } else {
    roundCount.removeAttribute("max");
    roundCount.min = 1;
    roundCount.step = 1;
  }
  roundCount.value = maximumRounds;
}

function makePlayerInputs() {
  const teams = [...document.querySelectorAll(".team-name")].map((input, index) => input.value.trim() || `Equipe ${index + 1}`);
  const totalPlayers = Number(playerCount.value);
  const savedPlayers = new Map([...document.querySelectorAll(".player-name")].map((input) => [input.id, input.value]));

  playersPanel.innerHTML = `
    <div class="players-grid">
      ${teams.map((team, teamIndex) => `
        <section class="player-team">
          <h3>${escapeHtml(team)}</h3>
          <div class="player-inputs">
            ${Array.from({ length: totalPlayers }, (_, playerIndex) => {
              const id = `player-${teamIndex + 1}-${playerIndex + 1}`;
              const value = savedPlayers.get(id) || `Pessoa ${playerIndex + 1}`;
              return `<input class="player-name" id="${id}" data-team="${teamIndex}" type="text" value="${escapeHtml(value)}" maxlength="28" aria-label="Pessoa ${playerIndex + 1} de ${escapeHtml(team)}" />`;
            }).join("")}
          </div>
        </section>
      `).join("")}
    </div>
  `;
}

function maximumUniqueGameRounds(teamCount) {
  return teamCount % 2 === 0 ? teamCount - 1 : teamCount;
}

function createUniqueMatchdays(teams) {
  const hasBye = teams.length % 2 !== 0;
  // A primeira rodada sempre segue: 1 × 2, 3 × 4, 5 × 6...
  // Com quantidade ímpar, a última equipe fica de folga.
  const evenOrdered = [
    ...teams.filter((_, index) => index % 2 === 0),
    ...teams.filter((_, index) => index % 2 !== 0).reverse(),
  ];
  const oddTeams = teams.slice(0, -1);
  const oddOrdered = [
    ...oddTeams.filter((_, index) => index % 2 === 0),
    ...oddTeams.filter((_, index) => index % 2 !== 0).reverse(),
  ];
  const players = hasBye
    ? [teams.at(-1), ...oddOrdered, null]
    : evenOrdered;

  const totalRounds = players.length - 1;
  const firstHalf = [];

  for (let round = 0; round < totalRounds; round += 1) {
    const matches = [];
    let bye = null;
    for (let i = 0; i < players.length / 2; i += 1) {
      const home = players[i];
      const away = players[players.length - 1 - i];
      if (!home || !away) bye = home || away;
      else matches.push(round % 2 === 0 ? [home, away] : [away, home]);
    }
    firstHalf.push({ matches, bye });
    players.splice(1, 0, players.pop());
  }

  return firstHalf;
}

function normalizeRoundCount(value, maximumRounds, allowRepeats) {
  const requested = Math.max(1, Number(value) || 1);
  if (allowRepeats) return requested;

  // No modo padrão, cada bloco completo equivale a um turno ou retorno.
  return Math.max(maximumRounds, Math.round(requested / maximumRounds) * maximumRounds);
}

function putOpeningMatchFirst(matches, openingTeam) {
  if (!openingTeam) return matches;
  const openingIndex = matches.findIndex(([home, away]) => home === openingTeam || away === openingTeam);
  if (openingIndex <= 0) return matches;
  return [matches[openingIndex], ...matches.slice(0, openingIndex), ...matches.slice(openingIndex + 1)];
}

function buildGameSchedule(teams, totalRounds) {
  const uniqueMatchdays = createUniqueMatchdays(teams);
  let previousBye = null;

  return Array.from({ length: totalRounds }, (_, index) => {
    const cycle = Math.floor(index / uniqueMatchdays.length);
    const matchday = uniqueMatchdays[index % uniqueMatchdays.length];
    const baseMatches = cycle % 2 !== 0
      ? matchday.matches.map(([home, away]) => [away, home])
      : matchday.matches;
    const matches = putOpeningMatchFirst(baseMatches, previousBye);
    previousBye = matchday.bye;
    return {
      ...matchday,
      matches,
      phase: cycle,
    };
  });
}

function playersForTeam(teamIndex) {
  return [...document.querySelectorAll(`.player-name[data-team="${teamIndex}"]`)]
    .map((input, index) => input.value.trim() || `Pessoa ${index + 1}`);
}

function teamDropdown(team, teamIndex, away = false) {
  const players = playersForTeam(teamIndex);
  return `<div class="${away ? "team-away " : ""}team-dropdown"><details><summary>${escapeHtml(team)}</summary><div class="dropdown-menu"><strong>${escapeHtml(team)}</strong><ul>${players.map((player) => `<li>${escapeHtml(player)}</li>`).join("")}</ul></div></details></div>`;
}

function renderSchedule() {
  const teams = [...document.querySelectorAll(".team-name")].map((input, index) => input.value.trim() || `Equipe ${index + 1}`);
  const maximumRounds = maximumUniqueGameRounds(teams.length);
  const totalRounds = normalizeRoundCount(roundCount.value, maximumRounds, unlimitedRounds.checked);
  roundCount.value = totalRounds;
  const schedule = buildGameSchedule(teams, totalRounds);
  const matches = schedule.reduce((total, round) => total + round.matches.length, 0);
  const possibleMatches = (teams.length * (teams.length - 1)) / 2;
  const uniqueMatches = new Set(schedule.flatMap((round) => round.matches.map(([home, away]) => [home, away].sort().join("|")))).size;
  const repeats = matches - uniqueMatches;
  const roundLabel = schedule.length === 1 ? "rodada" : "rodadas";

  summary.textContent = `${schedule.length} ${roundLabel} · ${matches} jogos · ${uniqueMatches} de ${possibleMatches} confrontos únicos${repeats ? ` · ${repeats} repetição(ões)` : ""}`;
  roundsContainer.innerHTML = schedule.map(({ matches: games, bye, phase }, index) => `
    <article class="round">
      <header class="round-title">Rodada ${index + 1}<span>${unlimitedRounds.checked ? (phase % 2 === 0 ? `TURNO ${Math.floor(phase / 2) + 1}` : `RETORNO ${Math.floor(phase / 2) + 1}`) : "JOGOS"}</span></header>
      ${games.map(([home, away]) => `<div class="match">${teamDropdown(home, teams.indexOf(home))}<span class="versus">×</span>${teamDropdown(away, teams.indexOf(away), true)}</div>`).join("")}
      ${bye ? `<div class="bye">Folga: <strong>${escapeHtml(bye)}</strong></div>` : ""}
    </article>
  `).join("");
}

countSelect.addEventListener("change", makeNameInputs);
playerCount.addEventListener("change", makePlayerInputs);
roundCount.addEventListener("change", () => {
  const maximumRounds = maximumUniqueGameRounds(Number(countSelect.value));
  roundCount.value = normalizeRoundCount(roundCount.value, maximumRounds, unlimitedRounds.checked);
});
settingsToggle.addEventListener("click", () => {
  const willOpen = settingsPanel.hidden;
  settingsPanel.hidden = !willOpen;
  settingsToggle.setAttribute("aria-expanded", String(willOpen));
});
unlimitedRounds.addEventListener("change", () => {
  const maximumRounds = maximumUniqueGameRounds(Number(countSelect.value));
  if (unlimitedRounds.checked) {
    roundCount.removeAttribute("max");
    roundCount.min = 1;
    roundCount.step = 1;
    roundCount.value = normalizeRoundCount(roundCount.value, maximumRounds, true);
  }
  else {
    roundCount.removeAttribute("max");
    roundCount.min = maximumRounds;
    roundCount.step = maximumRounds;
    roundCount.value = normalizeRoundCount(roundCount.value, maximumRounds, false);
  }
});
playersToggle.addEventListener("click", () => {
  const willOpen = playersPanel.hidden;
  playersPanel.hidden = !willOpen;
  playersToggle.setAttribute("aria-expanded", String(willOpen));
  playersToggle.textContent = willOpen ? "Ocultar participantes" : "Cadastrar participantes";
});
generateButton.addEventListener("click", renderSchedule);
roundsContainer.addEventListener("click", (event) => {
  const selected = event.target.closest(".team-dropdown details");
  if (!selected) return;

  requestAnimationFrame(() => {
    if (!selected.open) return;
    document.querySelectorAll(".team-dropdown details[open]").forEach((dropdown) => {
      if (dropdown !== selected) dropdown.removeAttribute("open");
    });
  });
});

makeNameInputs();
renderSchedule();
