const QUICK_GAME_ACTIVE_KEY = "volley-hub-quick-game-active";
const QUICK_GAME_RESULTS_KEY = "volley-hub-quick-game-results";
const cloudConfig = window.SUPABASE_CONFIG;
const cloudEnabled = cloudConfig?.anonKey && !cloudConfig.anonKey.startsWith("COLE_A_CHAVE") && window.supabase;
const cloudSupabase = cloudEnabled ? window.supabase.createClient(cloudConfig.url, cloudConfig.anonKey) : null;

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
  async saveResultToCloud(result) {
    if (!cloudSupabase) return { error: new Error("Supabase não configurado") };
    const { data: userData, error: userError } = await cloudSupabase.auth.getUser();
    if (userError || !userData.user) return { error: userError || new Error("Sessão não encontrada") };
    return cloudSupabase.from("game_results").upsert({
      user_id: userData.user.id,
      local_id: String(result.id),
      finished_at: result.finishedAt,
      game_data: result,
    }, { onConflict: "user_id,local_id" });
  },
  async getCloudResults() {
    if (!cloudSupabase) return { data: [], error: new Error("Supabase não configurado") };
    const { data, error } = await cloudSupabase.from("game_results").select("game_data").order("finished_at", { ascending: false });
    return { data: (data || []).map((row) => row.game_data), error };
  },
  async deleteResultFromCloud(id) {
    if (!cloudSupabase) return { error: new Error("Supabase não configurado") };
    return cloudSupabase.from("game_results").delete().eq("local_id", String(id));
  },
  async saveLiveGame(game) {
    if (!cloudSupabase) return { error: new Error("Supabase não configurado") };
    return cloudSupabase.from("live_games").upsert({
      share_code: game.shareCode,
      game_data: game,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "share_code" });
  },
  async closeLiveGame(shareCode) {
    if (!cloudSupabase || !shareCode) return { error: null };
    return cloudSupabase.from("live_games").update({ is_active: false, updated_at: new Date().toISOString() }).eq("share_code", shareCode);
  },
  async getLiveGame(shareCode) {
    if (!cloudSupabase) return { data: null, error: new Error("Supabase não configurado") };
    const { data, error } = await cloudSupabase.from("live_games").select("game_data,is_active,updated_at").eq("share_code", shareCode).maybeSingle();
    return { data: data ? { ...data.game_data, isActive: data.is_active, updatedAt: data.updated_at } : null, error };
  },
  async getOwnActiveLiveGame() {
    if (!cloudSupabase) return { data: null, error: new Error("Supabase não configurado") };
    const { data: userData, error: userError } = await cloudSupabase.auth.getUser();
    if (userError || !userData.user) return { data: null, error: userError || new Error("Sessão não encontrada") };
    const { data, error } = await cloudSupabase.from("live_games").select("game_data,is_active,updated_at").eq("user_id", userData.user.id).eq("is_active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    return { data: data ? { ...data.game_data, isActive: data.is_active, updatedAt: data.updated_at } : null, error };
  },
  getCloudClient() { return cloudSupabase; },
};
