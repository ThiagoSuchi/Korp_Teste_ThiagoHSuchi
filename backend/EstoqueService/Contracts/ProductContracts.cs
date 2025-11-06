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
