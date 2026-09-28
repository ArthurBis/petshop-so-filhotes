// ============================================================
// SÓ FILHOTES — configuração do Supabase
// ============================================================
// Pegue esses valores em: Supabase > seu projeto > Project Settings > API
// - "Project URL"      → SUPABASE_URL
// - "anon public" key  → SUPABASE_ANON_KEY
//
// Esta chave é PÚBLICA por design do Supabase — quem protege os dados de
// verdade são as políticas de RLS (configuradas nas tabelas filhotes e
// interessados), não o sigilo desta chave. Por isso é seguro versionar
// (commitar no Git) este arquivo normalmente.
// ============================================================

const SUPABASE_URL = 'https://xyebletpkdrhtyeadzas.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZWJsZXRwa2RyaHR5ZWFkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzYyNjEsImV4cCI6MjEwNDQ1MjI2MX0.oW7DhhVJszyzsnXQNifQP-N86kdPh6HoyGAvdo4Ph_o';
