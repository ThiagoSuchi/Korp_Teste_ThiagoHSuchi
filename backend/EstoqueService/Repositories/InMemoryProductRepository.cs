using System.Collections.Concurrent;
using EstoqueService.Models;

namespace EstoqueService.Repositories;

public sealed class RepositorioProdutoMemoria : IRepositorioProduto
{
	private readonly ConcurrentDictionary<string, Produto> _produtos = new(StringComparer.OrdinalIgnoreCase);
	private readonly object _sincronizacao = new();

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

	public Task<Produto?> ObterPorCodigoAsync(string codigo, CancellationToken cancelamento)
	{
		cancelamento.ThrowIfCancellationRequested();
		_produtos.TryGetValue(codigo, out var produto);
		return Task.FromResult(produto);
	}

	public Task<(bool Sucesso, string? Erro)> TentarDebitarAsync(IReadOnlyCollection<(Produto produto, int quantidade)> consumos, CancellationToken cancelamento)
	{
		cancelamento.ThrowIfCancellationRequested();

		lock (_sincronizacao)
		{
			foreach (var (produto, quantidade) in consumos)
			{
				if (!produto.TentarDebitar(quantidade, out var erro))
				{
					return Task.FromResult((Sucesso: false, Erro: erro));
				}
			}

			return Task.FromResult((Sucesso: true, Erro: (string?)null));
		}
	}
}
