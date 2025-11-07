using EstoqueService.Models;

namespace EstoqueService.Repositories;

public interface IRepositorioProduto
{
	Task<bool> TentarAdicionarAsync(Produto produto, CancellationToken cancellationToken);
	Task<IReadOnlyCollection<Produto>> ObterTodosAsync(CancellationToken cancellationToken);
	Task<Produto?> ObterPorCodigoAsync(string codigo, CancellationToken cancellationToken);
	Task<(bool Sucesso, string? Erro)> TentarDebitarAsync(IReadOnlyCollection<(Produto produto, int quantidade)> consumos, CancellationToken cancellationToken);
}
