const QUICK_GAME_ACTIVE_KEY = "volley-hub-quick-game-active";
const QUICK_GAME_RESULTS_KEY = "volley-hub-quick-game-results";

window.quickGameStore = {
  getActive() {
    try { return JSON.parse(localStorage.getItem(QUICK_GAME_ACTIVE_KEY)); } catch { return null; }
  },
  saveActive(game) { localStorage.setItem(QUICK_GAME_ACTIVE_KEY, JSON.stringify(game)); },
  clearActive() { localStorage.removeItem(QUICK_GAME_ACTIVE_KEY); },
  getResults() {
    try { return JSON.parse(localStorage.getItem(QUICK_GAME_RESULTS_KEY)) || []; } catch { return []; }
  },
  addResult(result) {
    const results = this.getResults();
    results.unshift(result);
    localStorage.setItem(QUICK_GAME_RESULTS_KEY, JSON.stringify(results));
  },
  deleteResult(id) {
    const results = this.getResults().filter((result) => result.id !== id);
    localStorage.setItem(QUICK_GAME_RESULTS_KEY, JSON.stringify(results));
  },
};
