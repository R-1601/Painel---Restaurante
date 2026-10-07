/**
 * Busca todas as linhas de uma consulta, paginando de 1000 em 1000
 * (o Supabase devolve no máximo 1000 linhas por requisição).
 */
export async function fetchAll<T>(
  build: () => { range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> },
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data || []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

export function traduzErro(msg: string) {
  if (/row-level security|permission denied/i.test(msg)) return 'Sem permissão para essa ação. Verifique se seu acesso está ativo.';
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/User already registered/i.test(msg)) return 'Este e-mail já tem cadastro. Use a opção Entrar.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem conexão. Verifique a internet e tente de novo.';
  if (/Código de convite inválido/i.test(msg)) return 'Código de convite inválido.';
  if (/Database error saving new user/i.test(msg)) return 'Não foi possível concluir o cadastro. Confira o código de convite.';
  if (/duplicate key/i.test(msg)) return 'Já existe um registro com esses dados.';
  return msg;
}
