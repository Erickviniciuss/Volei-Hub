// Configuração do cliente Supabase.
// NOTA DE SEGURANÇA: A chave 'anon' (publishable) é de acesso público no front-end.
// A segurança dos dados é garantida pelas políticas de Row Level Security (RLS) no Supabase.
window.SUPABASE_CONFIG = {
  url: window.ENV_SUPABASE_URL || "https://sqwmiozwygszkbesxuay.supabase.co",
  anonKey: window.ENV_SUPABASE_ANON_KEY || localStorage.getItem("SUPABASE_ANON_KEY") || "sb_publishable_XC4fJjlKKfR9n5_tec1uPA_s-PAa0-g",
};

// Instância única para manter sessão e estado de autenticação consistentes
if (!window.supabaseClient && window.supabase && window.SUPABASE_CONFIG.anonKey && !window.SUPABASE_CONFIG.anonKey.startsWith("COLE_A_CHAVE")) {
  window.supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
}
