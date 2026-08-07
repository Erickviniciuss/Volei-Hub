window.SUPABASE_CONFIG = {
  url: "https://sqwmiozwygszkbesxuay.supabase.co",
  // Cole aqui a chave anon/publishable do projeto (Project Settings > API).
  anonKey: "sb_publishable_XC4fJjlKKfR9n5_tec1uPA_s-PAa0-g",
};

// Uma única instância mantém autenticação e atualização de token consistentes
// entre todos os scripts carregados na mesma página.
if (!window.supabaseClient && window.supabase && window.SUPABASE_CONFIG.anonKey && !window.SUPABASE_CONFIG.anonKey.startsWith("COLE_A_CHAVE")) {
  window.supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
}
