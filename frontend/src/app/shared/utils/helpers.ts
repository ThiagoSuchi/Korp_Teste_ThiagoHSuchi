// Funções utilitárias para notas fiscais

export function extrairMensagemErro(erro: unknown): string | null {
  if (typeof erro === 'object' && erro && 'error' in erro) {
    const payload = (erro as { error?: unknown }).error;
    if (payload && typeof payload === 'object' && 'erro' in payload) {
      const mensagem = (payload as { erro?: unknown }).erro;
      return mensagem ? String(mensagem) : null;
    }
  }
  return null;
}

export function formatarData(dataIso: string): string {
  try {
    const data = new Date(dataIso);
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(data);
  } catch {
    return dataIso;
  }
}

export function limitarTexto(texto: string, limite: number): string {
  if (texto.length <= limite) {
    return texto;
  }
  return `${texto.slice(0, Math.max(0, limite - 3))}...`;
}
