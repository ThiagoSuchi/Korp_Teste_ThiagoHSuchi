using System.Diagnostics.CodeAnalysis;

namespace EstoqueService.Contracts;

public sealed record CriarProdutoRequisicao(string? Codigo, string? Descricao, int? Saldo)
{
	public static bool EhValido(CriarProdutoRequisicao requisicao, [NotNullWhen(false)] out string? erro)
	{
		if (requisicao.Codigo is null || string.IsNullOrWhiteSpace(requisicao.Codigo))
		{
			erro = "Código é obrigatório.";
			return false;
		}

		if (requisicao.Descricao is null || string.IsNullOrWhiteSpace(requisicao.Descricao))
		{
			erro = "Descrição é obrigatória.";
			return false;
		}

		if (requisicao.Saldo is null)
		{
			erro = "Saldo é obrigatório.";
			return false;
		}

		if (requisicao.Saldo < 0)
		{
			erro = "Saldo não pode ser negativo.";
			return false;
		}

		erro = null;
		return true;
	}
}

public sealed record ProdutoResposta(Guid Id, string Codigo, string Descricao, int Saldo, DateTime CriadoEmUtc);

public sealed record ProdutoConsumoItem(string? Codigo, int? Quantidade);

public sealed record ConsumirProdutosRequisicao(IReadOnlyCollection<ProdutoConsumoItem>? Itens)
{
	public static bool EhValida(ConsumirProdutosRequisicao requisicao, [NotNullWhen(false)] out string? erro)
	{
		if (requisicao.Itens is null || requisicao.Itens.Count == 0)
		{
			erro = "É necessário informar ao menos um produto.";
			return false;
		}

		foreach (var item in requisicao.Itens)
		{
			if (item.Codigo is null || string.IsNullOrWhiteSpace(item.Codigo))
			{
				erro = "Código do produto é obrigatório.";
				return false;
			}

			if (item.Quantidade is null)
			{
				erro = "Quantidade é obrigatória.";
				return false;
			}

			if (item.Quantidade <= 0)
			{
				erro = "Quantidade deve ser maior que zero.";
				return false;
			}
		}

		erro = null;
		return true;
	}
}
