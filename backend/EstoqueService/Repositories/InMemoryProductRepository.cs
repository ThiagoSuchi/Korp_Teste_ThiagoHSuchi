using System.Collections.Concurrent;
using EstoqueService.Models;

namespace EstoqueService.Repositories;

public sealed class RepositorioProdutoMemoria : IRepositorioProduto
{
	private readonly ConcurrentDictionary<string, Produto> _produtos = new(StringComparer.OrdinalIgnoreCase);

	public Task<bool> TentarAdicionarAsync(Produto produto, CancellationToken cancelamento)
	{
		cancelamento.ThrowIfCancellationRequested();
		var adicionado = _produtos.TryAdd(produto.Codigo, produto);
		return Task.FromResult(adicionado);
	}

	public Task<IReadOnlyCollection<Produto>> ObterTodosAsync(CancellationToken cancelamento)
	{
		cancelamento.ThrowIfCancellationRequested();
		var instantaneo = _produtos.Values
			.OrderBy(produto => produto.Codigo, StringComparer.OrdinalIgnoreCase)
			.ToArray();

		return Task.FromResult<IReadOnlyCollection<Produto>>(instantaneo);
	}
}
