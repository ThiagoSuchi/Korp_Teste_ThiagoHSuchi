using System.Linq;
using FaturamentoService.Contracts;
using FaturamentoService.Models;

namespace FaturamentoService.Mappings;

public static class NotaFiscalMapeamento
{
    public static NotaFiscalResposta ParaResposta(this NotaFiscal notaFiscal)
    {
        var itens = notaFiscal.Itens
            .Select(item => new ItemNotaFiscalResposta(item.Id, item.CodigoProduto, item.Quantidade))
            .ToArray();

        return new NotaFiscalResposta(notaFiscal.Id, notaFiscal.NumeroSequencial, notaFiscal.Status.ToString(), notaFiscal.CriadaEmUtc, itens);
    }
}
