using System.Diagnostics.CodeAnalysis;

namespace FaturamentoService.Contracts;

public sealed record ItemNotaFiscalRequisicao(string? CodigoProduto, int? Quantidade);

public sealed record CriarNotaFiscalRequisicao(IReadOnlyCollection<ItemNotaFiscalRequisicao>? Itens)
{
    public static bool EhValida(CriarNotaFiscalRequisicao requisicao, [NotNullWhen(false)] out string? erro)
    {
        if (requisicao.Itens is null || requisicao.Itens.Count == 0)
        {
            erro = "É necessário informar ao menos um item.";
            return false;
        }

        foreach (var item in requisicao.Itens)
        {
            if (item.CodigoProduto is null || string.IsNullOrWhiteSpace(item.CodigoProduto))
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

public sealed record ItemNotaFiscalResposta(Guid Id, string CodigoProduto, int Quantidade);

public sealed record NotaFiscalResposta(Guid Id, int NumeroSequencial, string Status, DateTime CriadaEmUtc, IReadOnlyCollection<ItemNotaFiscalResposta> Itens);
