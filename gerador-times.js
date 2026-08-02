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

function escapeGenerator(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]); }
function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
function getIdealTeamCount() { return Math.ceil(Number(peopleCount.value) / Number(peoplePerTeam.value)); }
function getTeamCount() { return Math.max(3, Math.min(8, Number(teamTotal.value) || getIdealTeamCount())); }

function updateTeamInformation() {
  const ideal = getIdealTeamCount();
  teamTotal.value = getTeamCount();
  idealTeamCount.innerHTML = `Quantidade ideal pela configuração atual: <strong>${ideal} ${ideal === 1 ? "time" : "times"}</strong>. Você pode escolher outra quantidade para o sorteio.`;
}

function selectedSeedCount() {
  return [...document.querySelectorAll(".seed-check input:checked")].length;
}

function renderPeopleInputs() {
  const saved = [...document.querySelectorAll(".generator-person")].map((input) => ({ name: input.value, seed: input.closest("label").querySelector("input[type=checkbox]")?.checked }));
  const total = Math.max(2, Math.min(100, Number(peopleCount.value) || 2));
  peopleCount.value = total;
  seedCountField.hidden = !seedEnabled.checked;
  updateTeamInformation();
  const seedLimit = getTeamCount() * Number(seedsPerTeam.value || 1);
  const alreadySelected = selectedSeedCount();
  const maySelectSeed = !seedEnabled.checked || alreadySelected < seedLimit;
  peopleNames.innerHTML = Array.from({ length: total }, (_, index) => {
    const person = saved[index] || {};
    const seedControl = person.seed ? '<span class="seed-check"><input type="checkbox" checked /> Cabeça de chave</span>' : maySelectSeed && seedEnabled.checked ? '<span class="seed-check"><input type="checkbox" /> Cabeça de chave</span>' : "";
    return `<label class="generator-person-field"><span>Participante ${index + 1}</span><input class="generator-person" type="text" maxlength="40" value="${escapeGenerator(person.name || "")}" placeholder="Nome do participante" />${seedControl}</label>`;
  }).join("");
  seedsPerTeam.innerHTML = Array.from({ length: Math.min(6, Number(peoplePerTeam.value)) }, (_, index) => `<option value="${index + 1}" ${Number(seedsPerTeam.value || 1) === index + 1 ? "selected" : ""}>${index + 1} por time</option>`).join("");
}

function renderGeneratedTeams(teams) {
  generatedTeams.hidden = false;
  generatedTeams.innerHTML = `<p class="eyebrow">RESULTADO DO SORTEIO</p><h2>Times definidos</h2><div class="generated-teams-grid">${teams.map((team, index) => `<article><h3>Time ${index + 1}</h3><ol>${team.length ? team.map((person) => `<li>${escapeGenerator(person.name)}${person.seed ? '<small>Cabeça de chave</small>' : ""}</li>`).join("") : '<li class="empty-generated-team">Vazio</li>'}</ol></article>`).join("")}</div><button id="import-quick-game" class="secondary-button import-quick-game" type="button">Usar no Jogo por Resultado</button>`;
  document.querySelector("#import-quick-game").addEventListener("click", importToQuickGame);
}

function drawTeams() {
  const people = [...document.querySelectorAll(".generator-person")].map((input, index) => ({ name: input.value.trim() || `Participante ${index + 1}`, seed: seedEnabled.checked && input.closest("label").querySelector("input[type=checkbox]")?.checked }));
  const teamCount = getTeamCount();
  const targets = Array.from({ length: teamCount }, (_, index) => Math.floor(people.length / teamCount) + (index < people.length % teamCount ? 1 : 0));
  const teams = Array.from({ length: teamCount }, () => []);
  const seeded = shuffle(people.filter((person) => person.seed));
  const remaining = shuffle(people.filter((person) => !person.seed));

  if (seedEnabled.checked) {
    const perTeam = Number(seedsPerTeam.value);
    const required = teamCount * perTeam;
    if (perTeam > Math.min(...targets)) {
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
    const smallest = Math.min(...available.map(({ size }) => size));
    const options = available.filter(({ size }) => size === smallest);
    teams[options[Math.floor(Math.random() * options.length)].index].push(person);
  });
  lastDraw = teams;
  generatorMessage.textContent = `${teamCount} times sorteados.`;
  generatorMessage.className = "auth-message is-success";
  renderGeneratedTeams(teams);
}

function importToQuickGame() {
  if (!lastDraw) return;
  const largestTeam = Math.max(...lastDraw.map((team) => team.length));
  if (largestTeam > 6) {
    generatorMessage.textContent = "Para importar ao Jogo por Resultado, cada time deve ter no máximo 6 participantes.";
    generatorMessage.className = "auth-message is-error";
    return;
  }
  const teams = lastDraw.map((team, index) => `Equipe ${index + 1}`);
  const players = lastDraw.map((team) => team.map((person) => person.name));
  localStorage.setItem("volley-generator-import", JSON.stringify({ teams, players, playerCount: Math.max(3, largestTeam) }));
  window.location.href = "jogo.html";
}

peopleCount.addEventListener("input", renderPeopleInputs);
peoplePerTeam.addEventListener("change", renderPeopleInputs);
teamTotal.addEventListener("input", renderPeopleInputs);
seedsPerTeam.addEventListener("change", renderPeopleInputs);
seedEnabled.addEventListener("change", () => { seedCountField.hidden = !seedEnabled.checked; renderPeopleInputs(); });
peopleNames.addEventListener("change", (event) => { if (event.target.matches(".seed-check input")) renderPeopleInputs(); });
document.querySelector("#draw-teams").addEventListener("click", drawTeams);
renderPeopleInputs();
