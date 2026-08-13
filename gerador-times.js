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
let participantDraft = [{ name: "", seed: false }];

function escapeGenerator(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]); }
function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
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

function selectedSeedCount() {
  return participantDraft.filter((person) => person.seed).length;
}

function saveParticipantDraftFromInputs() {
  const fields = [...document.querySelectorAll(".generator-person-field")];
  if (!fields.length) return;
  participantDraft = fields.map((field) => ({
    name: field.querySelector(".generator-person")?.value || "",
    seed: Boolean(field.querySelector(".seed-check input")?.checked),
  }));
}

function renderPeopleInputs(syncInputs = true) {
  if (syncInputs) saveParticipantDraftFromInputs();
  const selectedSeedsPerTeam = Math.max(1, Number(seedsPerTeam.value) || 1);
  peopleCount.value = participantDraft.length;
  peoplePerTeam.value = Math.min(6, Math.max(1, Number(peoplePerTeam.value) || 1));
  teamTotal.value = Math.min(7, Math.max(1, Number(teamTotal.value) || 1));
  seedCountField.hidden = !seedEnabled.checked;
  updateTeamInformation();
  const capacity = getTeamCount() * Number(peoplePerTeam.value);
  if (participantDraft.length > capacity) {
    generatorMessage.textContent = `A configuração atual permite no máximo ${capacity} participantes.`;
    generatorMessage.className = "auth-message is-error";
  }
  const seedLimit = getTeamCount() * selectedSeedsPerTeam;
  const alreadySelected = selectedSeedCount();
  const maySelectSeed = !seedEnabled.checked || alreadySelected < seedLimit;
  peopleNames.innerHTML = participantDraft.map((person, index) => {
    const seedControl = person.seed ? '<span class="seed-check"><input type="checkbox" checked /> Cabeça de chave</span>' : maySelectSeed && seedEnabled.checked ? '<span class="seed-check"><input type="checkbox" /> Cabeça de chave</span>' : "";
    return `<div class="generator-person-field"><label>Participante ${index + 1}<input class="generator-person" type="text" maxlength="40" value="${escapeGenerator(person.name || "")}" placeholder="Nome do participante" /></label>${seedControl ? `<label class="seed-check">${seedControl.replace('<span class="seed-check">', '').replace('</span>', '')}</label>` : ""}</div>`;
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
  participantDraft.push({ name: "", seed: false });
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
  generatedTeams.innerHTML = `<p class="eyebrow">RESULTADO DO SORTEIO</p><h2>Times definidos</h2><div class="generated-teams-grid">${teams.map((team, index) => {
    const members = [...team, ...Array.from({ length: Math.max(0, capacity - team.length) }, () => ({ name: "Vazio", empty: true }))];
    return `<article><h3>Time ${index + 1}</h3><ol>${members.map((person) => `<li class="${person.empty ? "empty-generated-team" : ""}">${escapeGenerator(person.name)}${person.seed ? '<small>Cabeça de chave</small>' : ""}</li>`).join("")}</ol></article>`;
  }).join("")}</div><div class="generator-import-actions"><button id="import-quick-game" class="secondary-button import-quick-game" type="button">Usar no Jogo por Resultado</button><button id="import-point-game" class="secondary-button import-quick-game" type="button">Usar no Jogo Ponto a Ponto</button></div>`;
  document.querySelector("#import-quick-game").addEventListener("click", () => importToGame("result"));
  document.querySelector("#import-point-game").addEventListener("click", () => importToGame("points"));
  refreshImportAvailability();
}

function drawTeams() {
  const teamCount = getTeamCount();
  const capacity = getPeoplePerTeam();
  if (!teamCount || !capacity) {
    generatorMessage.textContent = "Informe a quantidade de times e de pessoas por time antes de sortear.";
    generatorMessage.className = "auth-message is-error";
    return;
  }
  const inputs = [...document.querySelectorAll(".generator-person")];
  const missingName = inputs.findIndex((input) => !input.value.trim());
  if (missingName >= 0) {
    generatorMessage.textContent = `Informe o nome do Participante ${missingName + 1} antes de sortear os times.`;
    generatorMessage.className = "auth-message is-error";
    inputs[missingName].focus();
    return;
  }
  const people = inputs.map((input) => ({ name: input.value.trim(), seed: seedEnabled.checked && input.closest(".generator-person-field")?.querySelector(".seed-check input")?.checked }));
  const totalCapacity = teamCount * capacity;
  if (people.length > totalCapacity) {
    generatorMessage.textContent = `Não é possível sortear ${people.length} pessoas em ${teamCount} times com ${capacity} vagas por time.`;
    generatorMessage.className = "auth-message is-error";
    generatedTeams.hidden = true;
    return;
  }
  const targets = Array.from({ length: teamCount }, () => capacity);
  const teams = Array.from({ length: teamCount }, () => []);
  const seeded = shuffle(people.filter((person) => person.seed));
  const remaining = shuffle(people.filter((person) => !person.seed));

  if (seedEnabled.checked) {
    const perTeam = Number(seedsPerTeam.value);
    const required = teamCount * perTeam;
    if (perTeam > capacity) {
      generatorMessage.textContent = "A quantidade de cabeças de chave por time é maior que a capacidade de uma das equipes.";
      generatorMessage.className = "auth-message is-error";
      return;
    }
    if (seeded.length !== required) {
      generatorMessage.textContent = `Marque exatamente ${required} cabeças de chave para este sorteio.`;
      generatorMessage.className = "auth-message is-error";
      return;
    }
    teams.forEach((team) => team.push(...seeded.splice(0, perTeam)));
  }

  shuffle(remaining).forEach((person) => {
    const available = teams.map((team, index) => ({ index, size: team.length })).filter(({ index, size }) => size < targets[index]);
    teams[available[Math.floor(Math.random() * available.length)].index].push(person);
  });
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
seedsPerTeam.addEventListener("change", () => renderPeopleInputs());
seedEnabled.addEventListener("change", () => { seedCountField.hidden = !seedEnabled.checked; renderPeopleInputs(); });
peopleNames.addEventListener("change", (event) => { if (event.target.matches(".seed-check input")) renderPeopleInputs(); });
document.querySelector("#draw-teams").addEventListener("click", drawTeams);
document.querySelector("#add-generator-person").addEventListener("click", addGeneratorPerson);
document.querySelector("#remove-generator-person").addEventListener("click", removeGeneratorPerson);
renderPeopleInputs();
