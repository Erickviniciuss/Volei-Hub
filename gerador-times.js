const peopleCount = document.querySelector("#people-count");
const peoplePerTeam = document.querySelector("#people-per-team");
const teamTotal = document.querySelector("#team-total");
const seedEnabled = document.querySelector("#seed-enabled");
const seedCountField = document.querySelector("#seed-count-field");
const seedsPerTeam = document.querySelector("#seeds-per-team");
const peopleNames = document.querySelector("#people-names");
const generatorMessage = document.querySelector("#generator-message");
const generatedTeams = document.querySelector("#generated-teams");
const idealTeamCount = document.querySelector("#ideal-team-count");
let lastDraw = null;
let participantDraft = [{ name: "", seedLevel: 0, stars: 3 }];

function isStarDrawEnabled() {
  return localStorage.getItem("volley-star-draw-enabled") === "true";
}

if (window.supabaseClient) {
  window.supabaseClient.auth.getUser().then(({ data }) => {
    if (data?.user?.user_metadata) {
      const isStar = data.user.user_metadata.star_draw_enabled === true;
      localStorage.setItem("volley-star-draw-enabled", String(isStar));
      renderPeopleInputs();
    }
  });
}

function escapeGenerator(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]); }
function cryptoRandom() {
  const buffer = new Uint32Array(1);
  (window.crypto || window.msCrypto).getRandomValues(buffer);
  return buffer[0] / (0xffffffff + 1);
}
function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(cryptoRandom() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
function getPeoplePerTeam() { const value = Number(peoplePerTeam.value); return Number.isInteger(value) && value >= 1 && value <= 6 ? value : null; }
function getIdealTeamCount() { const perTeam = getPeoplePerTeam(); return perTeam ? Math.ceil(Math.max(1, Number(peopleCount.value) || 1) / perTeam) : null; }
function getTeamCount() { const value = Number(teamTotal.value); return Number.isInteger(value) && value >= 1 && value <= 7 ? value : null; }

function refreshIdealHint() {
  const ideal = getIdealTeamCount();
  idealTeamCount.innerHTML = ideal ? `Quantidade ideal pela configuração atual: <strong>${ideal} ${ideal === 1 ? "time" : "times"}</strong>. Você pode escolher outra quantidade para o sorteio.` : "Informe a quantidade de pessoas por time para ver a quantidade ideal de equipes.";
}

function updateTeamInformation() {
  const ideal = getIdealTeamCount();
  teamTotal.value = getTeamCount();
  idealTeamCount.innerHTML = `Quantidade ideal pela configuração atual: <strong>${ideal} ${ideal === 1 ? "time" : "times"}</strong>. Você pode escolher outra quantidade para o sorteio.`;
}

function nextSeedLevel() {
  const perTeam = Math.max(1, Number(seedsPerTeam.value) || 1);
  const teams = getTeamCount() || 1;
  for (let level = 1; level <= perTeam; level += 1) {
    if (participantDraft.filter((person) => person.seedLevel === level).length < teams) return level;
  }
  return 0;
}

function saveParticipantDraftFromInputs() {
  const fields = [...document.querySelectorAll(".generator-person-field")];
  if (!fields.length) return;
  participantDraft = fields.map((field, index) => {
    const activeBtns = [...field.querySelectorAll(".star-btn.is-active")];
    const starsValue = activeBtns.length ? Number(activeBtns[activeBtns.length - 1].dataset.star) || 3 : (participantDraft[index]?.stars || 3);
    return {
      name: field.querySelector(".generator-person")?.value || "",
      seedLevel: field.querySelector(".seed-check input")?.checked ? Number(field.querySelector(".seed-check input")?.dataset.seedLevel) || 1 : 0,
      stars: starsValue,
    };
  });
}

function renderPeopleInputs(syncInputs = true) {
  if (syncInputs) saveParticipantDraftFromInputs();
  const starMode = isStarDrawEnabled();
  const selectedSeedsPerTeam = Math.max(1, Number(seedsPerTeam.value) || 1);
  peopleCount.value = participantDraft.length;
  peoplePerTeam.value = Math.min(6, Math.max(1, Number(peoplePerTeam.value) || 1));
  teamTotal.value = Math.min(7, Math.max(1, Number(teamTotal.value) || 1));

  const seedContainer = document.querySelector(".generator-seed-settings");
  if (seedContainer) seedContainer.hidden = starMode;

  const generatorInstruction = document.querySelector("#generator-instruction");
  if (generatorInstruction) {
    generatorInstruction.textContent = starMode
      ? "Adicione os participantes e atribua de 1 a 5 estrelas para cada um."
      : "Adicione os participantes e, se desejar, marque os cabeças de chave.";
  }

  seedCountField.hidden = starMode || !seedEnabled.checked;
  updateTeamInformation();
  const capacity = getTeamCount() * Number(peoplePerTeam.value);
  if (participantDraft.length > capacity) {
    generatorMessage.textContent = `A configuração atual permite no máximo ${capacity} participantes.`;
    generatorMessage.className = "auth-message is-error";
  }

  const nextLevel = (!starMode && seedEnabled.checked) ? nextSeedLevel() : 0;
  peopleNames.innerHTML = participantDraft.map((person, index) => {
    if (starMode) {
      const currentStars = person.stars || 3;
      const starsHtml = [1, 2, 3, 4, 5].map((star) =>
        `<button type="button" class="star-btn ${star <= currentStars ? "is-active" : ""}" data-star="${star}" aria-label="${star} estrelas">★</button>`
      ).join("");
      return `<div class="generator-person-field">
        <label>Participante ${index + 1}<input class="generator-person" type="text" maxlength="40" value="${escapeGenerator(person.name || "")}" placeholder="Nome do participante" /></label>
        <div class="star-rating-picker" data-index="${index}">
          <div class="star-rating-buttons">${starsHtml}</div>
        </div>
      </div>`;
    } else {
      const level = person.seedLevel || nextLevel;
      const seedControl = level ? `<label class="seed-check"><input type="checkbox" data-seed-level="${level}" ${person.seedLevel ? "checked" : ""} /> ${level}º cabeça de chave</label>` : "";
      return `<div class="generator-person-field"><label>Participante ${index + 1}<input class="generator-person" type="text" maxlength="40" value="${escapeGenerator(person.name || "")}" placeholder="Nome do participante" /></label>${seedControl}</div>`;
    }
  }).join("");

  seedsPerTeam.innerHTML = Array.from({ length: Math.min(6, Number(peoplePerTeam.value)) }, (_, index) => `<option value="${index + 1}" ${selectedSeedsPerTeam === index + 1 ? "selected" : ""}>${index + 1} por time</option>`).join("");
}

function addGeneratorPerson() {
  saveParticipantDraftFromInputs();
  const current = participantDraft.length;
  const capacity = getTeamCount() * Math.max(1, Number(peoplePerTeam.value) || 1);
  if (current >= capacity) {
    generatorMessage.textContent = `Limite atingido: ${getTeamCount()} times com ${peoplePerTeam.value} pessoas por time permitem no máximo ${capacity} participantes.`;
    generatorMessage.className = "auth-message is-error";
    return;
  }
  generatorMessage.textContent = "";
  participantDraft.push({ name: "", seedLevel: 0, stars: 3 });
  renderPeopleInputs(false);
}

function removeGeneratorPerson() {
  saveParticipantDraftFromInputs();
  const current = participantDraft.length;
  if (current <= 1) {
    generatorMessage.textContent = "Mantenha pelo menos um participante cadastrado.";
    generatorMessage.className = "auth-message is-error";
    return;
  }
  generatorMessage.textContent = "";
  participantDraft.pop();
  renderPeopleInputs(false);
}

function renderGeneratedTeams(teams) {
  generatedTeams.hidden = false;
  const capacity = Number(peoplePerTeam.value);
  const starMode = isStarDrawEnabled();

  generatedTeams.innerHTML = `<p class="eyebrow">RESULTADO DO SORTEIO</p><h2>Times definidos ${starMode ? '<span class="star-mode-tag">★ Sorteio por Estrela</span>' : ""}</h2><div class="generated-teams-grid">${teams.map((team, index) => {
    const totalPoints = team.reduce((sum, person) => sum + (person.stars || 0), 0);
    const members = [...team, ...Array.from({ length: Math.max(0, capacity - team.length) }, () => ({ name: "Vazio", empty: true }))];
    return `<article>
      <h3>Time ${index + 1} ${starMode ? `<span class="team-points-badge">(${totalPoints} ${totalPoints === 1 ? "pt" : "pts"})</span>` : ""}</h3>
      <ol>${members.map((person) => {
        let meta = "";
        if (!person.empty) {
          if (starMode) {
            meta = `<small class="person-stars">${"★".repeat(person.stars || 3)} (${person.stars || 3} ${person.stars === 1 ? "pt" : "pts"})</small>`;
          } else if (person.seedLevel) {
            meta = `<small>${person.seedLevel}º cabeça de chave</small>`;
          }
        }
        return `<li class="${person.empty ? "empty-generated-team" : ""}">${escapeGenerator(person.name)}${meta}</li>`;
      }).join("")}</ol>
    </article>`;
  }).join("")}</div><div class="generator-import-actions"><button id="import-quick-game" class="secondary-button import-quick-game" type="button">Usar no Jogo por Resultado</button><button id="import-point-game" class="secondary-button import-quick-game" type="button">Usar no Jogo Ponto a Ponto</button></div>`;

  document.querySelector("#import-quick-game").addEventListener("click", () => importToGame("result"));
  document.querySelector("#import-point-game").addEventListener("click", () => importToGame("points"));
  refreshImportAvailability();
}

function drawBalancedTeamsByStars(people, teamCount, capacity) {
  let bestTeams = null;
  let bestGap = Infinity;
  let bestVariance = Infinity;

  const targetSizeLower = Math.floor(people.length / teamCount);

  for (let pass = 0; pass < 1000; pass += 1) {
    const candidateTeams = Array.from({ length: teamCount }, () => []);

    const starGroups = {};
    people.forEach((p) => {
      if (!starGroups[p.stars]) starGroups[p.stars] = [];
      starGroups[p.stars].push(p);
    });

    const sortedPeople = [];
    Object.keys(starGroups)
      .map(Number)
      .sort((a, b) => b - a)
      .forEach((starVal) => {
        sortedPeople.push(...shuffle(starGroups[starVal]));
      });

    sortedPeople.forEach((person) => {
      let validTeams = candidateTeams
        .map((team, index) => ({ index, size: team.length, sum: team.reduce((s, p) => s + p.stars, 0) }))
        .filter((t) => t.size < capacity);

      const minSizeInValid = Math.min(...validTeams.map((t) => t.size));
      if (minSizeInValid < targetSizeLower) {
        const undersized = validTeams.filter((t) => t.size === minSizeInValid);
        if (undersized.length > 0) validTeams = undersized;
      }

      const minSum = Math.min(...validTeams.map((t) => t.sum));
      const tiedTeams = validTeams.filter((t) => t.sum === minSum);
      const chosen = tiedTeams[Math.floor(cryptoRandom() * tiedTeams.length)];
      candidateTeams[chosen.index].push(person);
    });

    const teamSums = candidateTeams.map((t) => t.reduce((s, p) => s + p.stars, 0));
    const maxPts = Math.max(...teamSums);
    const minPts = Math.min(...teamSums);
    const gap = maxPts - minPts;
    const avg = teamSums.reduce((s, v) => s + v, 0) / teamCount;
    const variance = teamSums.reduce((s, v) => s + Math.pow(v - avg, 2), 0);

    if (gap < bestGap || (gap === bestGap && variance < bestVariance)) {
      bestGap = gap;
      bestVariance = variance;
      bestTeams = candidateTeams;
    }

    if (bestGap === 0) break;
  }

  return bestTeams;
}

function drawTeams() {
  const teamCount = getTeamCount();
  const capacity = getPeoplePerTeam();
  if (!teamCount || !capacity) {
    generatorMessage.textContent = "Informe a quantidade de times e de pessoas por time antes de sortear.";
    generatorMessage.className = "auth-message is-error";
    return;
  }
  saveParticipantDraftFromInputs();
  const missingName = participantDraft.findIndex((person) => !person.name.trim());
  if (missingName >= 0) {
    generatorMessage.textContent = `Informe o nome do Participante ${missingName + 1} antes de sortear os times.`;
    generatorMessage.className = "auth-message is-error";
    document.querySelectorAll(".generator-person")[missingName]?.focus();
    return;
  }

  const starMode = isStarDrawEnabled();
  const people = participantDraft.map((person) => ({
    name: person.name.trim(),
    seedLevel: (!starMode && seedEnabled.checked) ? person.seedLevel : 0,
    stars: person.stars || 3
  }));

  const totalCapacity = teamCount * capacity;
  if (people.length > totalCapacity) {
    generatorMessage.textContent = `Não é possível sortear ${people.length} pessoas em ${teamCount} times com ${capacity} vagas por time.`;
    generatorMessage.className = "auth-message is-error";
    generatedTeams.hidden = true;
    return;
  }

  let teams;
  if (starMode) {
    teams = drawBalancedTeamsByStars(people, teamCount, capacity);
  } else {
    teams = Array.from({ length: teamCount }, () => []);
    if (seedEnabled.checked) {
      const perTeam = Number(seedsPerTeam.value);
      const required = teamCount * perTeam;
      const seeded = people.filter((person) => person.seedLevel);
      if (perTeam > capacity || seeded.length !== required) {
        generatorMessage.textContent = `Marque exatamente ${required} cabeças de chave para este sorteio.`;
        generatorMessage.className = "auth-message is-error";
        return;
      }
      for (let level = 1; level <= perTeam; level += 1) {
        const levelSeeds = shuffle(people.filter((person) => person.seedLevel === level));
        if (levelSeeds.length !== teamCount) {
          generatorMessage.textContent = `Complete os ${teamCount} participantes do ${level}º nível de cabeça de chave.`;
          generatorMessage.className = "auth-message is-error";
          return;
        }
        teams.forEach((team, index) => team.push(levelSeeds[index]));
      }
    }
    const remaining = shuffle(people.filter((person) => !person.seedLevel));
    remaining.forEach((person) => {
      const available = teams.map((team, index) => ({ index, size: team.length })).filter(({ size }) => size < capacity);
      teams[available[Math.floor(cryptoRandom() * available.length)].index].push(person);
    });
  }

  lastDraw = teams;
  generatorMessage.textContent = `${teamCount} times sorteados.`;
  generatorMessage.className = "auth-message is-success";
  renderGeneratedTeams(teams);
}

async function hasActiveGame() {
  const local = window.quickGameStore?.getActive?.();
  if (local?.status === "active" && local.started === true) return true;
  const response = await window.quickGameStore?.getOwnActiveLiveGame?.();
  return response?.data?.status === "active" && response.data.started === true;
}

async function refreshImportAvailability() {
  const disabled = await hasActiveGame().catch(() => false);
  document.querySelectorAll(".import-quick-game").forEach((button) => { button.disabled = disabled; button.title = disabled ? "Encerre o jogo em andamento para importar os times." : ""; });
}

async function importToGame(type) {
  if (!lastDraw) return;
  if (await hasActiveGame()) {
    generatorMessage.textContent = "Encerre o jogo em andamento antes de importar os times.";
    generatorMessage.className = "auth-message is-error";
    refreshImportAvailability();
    return;
  }
  const largestTeam = Math.max(...lastDraw.map((team) => team.length));
  if (lastDraw.length < 3 || lastDraw.length > 8) {
    generatorMessage.textContent = "Para importar, escolha entre 3 e 8 times.";
    generatorMessage.className = "auth-message is-error";
    return;
  }
  if (largestTeam > 6) {
    generatorMessage.textContent = "Para importar, cada time deve ter no máximo 6 participantes.";
    generatorMessage.className = "auth-message is-error";
    return;
  }
  const teams = lastDraw.map((team, index) => `Equipe ${index + 1}`);
  const players = lastDraw.map((team) => team.map((person) => person.name));
  const mode = type === "points" ? "Jogo Ponto a Ponto" : "Jogo por Resultado";
  if (!window.confirm(`Importar os times para ${mode}?`)) return;
  localStorage.setItem(type === "points" ? "volley-generator-import-points" : "volley-generator-import", JSON.stringify({ teams, players, playerCount: Math.max(3, largestTeam) }));
  window.location.href = type === "points" ? "jogoajogo.html" : "jogo.html";
}

peoplePerTeam.addEventListener("input", () => { if (Number(peoplePerTeam.value) > 6) peoplePerTeam.value = 6; generatorMessage.textContent = ""; refreshIdealHint(); });
teamTotal.addEventListener("input", () => { if (Number(teamTotal.value) > 7) teamTotal.value = 7; generatorMessage.textContent = ""; refreshIdealHint(); });
seedsPerTeam.addEventListener("change", () => {
  saveParticipantDraftFromInputs();
  const limit = Number(seedsPerTeam.value) || 1;
  participantDraft.forEach((person) => { if (person.seedLevel > limit) person.seedLevel = 0; });
  renderPeopleInputs(false);
});
seedEnabled.addEventListener("change", () => { seedCountField.hidden = !seedEnabled.checked; renderPeopleInputs(); });
peopleNames.addEventListener("change", (event) => {
  if (!event.target.matches(".seed-check input")) return;
  saveParticipantDraftFromInputs();
  const field = event.target.closest(".generator-person-field");
  const index = [...peopleNames.querySelectorAll(".generator-person-field")].indexOf(field);
  if (index >= 0 && event.target.checked) participantDraft[index].seedLevel = Number(event.target.dataset.seedLevel) || nextSeedLevel();
  if (index >= 0 && !event.target.checked) participantDraft[index].seedLevel = 0;
  renderPeopleInputs(false);
});
peopleNames.addEventListener("click", (event) => {
  const starBtn = event.target.closest(".star-btn");
  if (!starBtn) return;
  event.preventDefault();
  const field = starBtn.closest(".generator-person-field");
  const index = [...peopleNames.querySelectorAll(".generator-person-field")].indexOf(field);
  if (index >= 0) {
    saveParticipantDraftFromInputs();
    const starVal = Number(starBtn.dataset.star) || 3;
    participantDraft[index].stars = starVal;
    renderPeopleInputs(false);
  }
});

function parseTxtContent(text) {
  const rawLines = text.split(/\r?\n/);
  const names = [];
  rawLines.forEach((line) => {
    let cleaned = line.trim();
    if (!cleaned) return;
    cleaned = cleaned.replace(/^[\d\s.\-•)*]+/g, "").trim();
    if (cleaned) names.push(cleaned);
  });
  return names;
}

function handleTxtImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result || "";
    const names = parseTxtContent(text);
    if (!names.length) {
      generatorMessage.textContent = "Nenhum nome válido encontrado no arquivo TXT.";
      generatorMessage.className = "auth-message is-error";
      return;
    }
    saveParticipantDraftFromInputs();
    participantDraft = names.map((name) => ({ name, seedLevel: 0, stars: 3 }));
    const perTeam = Math.max(1, Number(peoplePerTeam.value) || 4);
    const requiredTeams = Math.ceil(names.length / perTeam);
    if (requiredTeams > Number(teamTotal.value)) {
      teamTotal.value = Math.min(7, requiredTeams);
    }
    renderPeopleInputs(false);
    generatorMessage.textContent = `${names.length} ${names.length === 1 ? "participante importado" : "participantes importados"} do arquivo TXT com sucesso!`;
    generatorMessage.className = "auth-message is-success";
    event.target.value = "";
  };
  reader.readAsText(file);
}

const importTxtBtn = document.querySelector("#import-txt-btn");
const importTxtFile = document.querySelector("#import-txt-file");
if (importTxtBtn && importTxtFile) {
  importTxtBtn.addEventListener("click", () => importTxtFile.click());
  importTxtFile.addEventListener("change", handleTxtImport);
}

document.querySelector("#draw-teams").addEventListener("click", drawTeams);
document.querySelector("#add-generator-person").addEventListener("click", addGeneratorPerson);
document.querySelector("#remove-generator-person").addEventListener("click", removeGeneratorPerson);
renderPeopleInputs();


