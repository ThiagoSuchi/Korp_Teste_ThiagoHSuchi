using EstoqueService.Contracts;
using EstoqueService.Models;

namespace EstoqueService.Mappings;

public static class ProdutoMapeamento
{
	public static ProdutoResposta ParaResposta(this Produto produto)
	{
		return new ProdutoResposta(produto.Id, produto.Codigo, produto.Descricao, produto.Saldo, produto.CriadoEmUtc);
	}
}
