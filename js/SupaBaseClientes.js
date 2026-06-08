// Removido o '=' extra da URL e corrigida a inicialização
const supabaseUrl = 'https://vqeqbbatesybahqkssol.supabase.co';
const supabaseAnonKey = 'sb_publishable_j36w6ViTquzsus8-7xjwQQ_pbLeKvPz';

// Inicializa o cliente globalmente usando a biblioteca carregada no index.html
const _supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

console.log('Cliente Supabase inicializado com sucesso!');