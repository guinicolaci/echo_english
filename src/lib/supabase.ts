import { createBrowserClient } from '@supabase/ssr'

// Função para criar o cliente Supabase
export function createClient() {
  // O '!' no final diz ao TypeScript: "Eu garanto que estas variáveis de ambiente existem".
  // Nós já as configuramos no arquivo .env.local
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Opcional, mas útil: exportar uma instância padrão para uso rápido
const supabase = createClient();

export default supabase;