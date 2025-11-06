namespace FaturamentoService.Models;

public enum StatusNotaFiscal
{
    Aberta = 0,
    Fechada = 1
}

public sealed class ItemNotaFiscal
{
    private ItemNotaFiscal(Guid id, string codigoProduto, int quantidade)
    {
        Id = id;
        CodigoProduto = codigoProduto;
        Quantidade = quantidade;
    }

    public Guid Id { get; }
    public string CodigoProduto { get; }
    public int Quantidade { get; }

    public static ItemNotaFiscal Criar(string codigoProduto, int quantidade)
    {
        return new ItemNotaFiscal(Guid.NewGuid(), codigoProduto.Trim(), quantidade);
    }
}

public sealed class NotaFiscal
{
    private NotaFiscal(Guid id, int numeroSequencial, StatusNotaFiscal status, IReadOnlyCollection<ItemNotaFiscal> itens, DateTime criadaEmUtc)
    {
        Id = id;
        NumeroSequencial = numeroSequencial;
        Status = status;
        Itens = itens;
        CriadaEmUtc = criadaEmUtc;
    }

    public Guid Id { get; }
    public int NumeroSequencial { get; }
    public StatusNotaFiscal Status { get; private set; }
    public IReadOnlyCollection<ItemNotaFiscal> Itens { get; }
    public DateTime CriadaEmUtc { get; }

    public static NotaFiscal Criar(int numeroSequencial, IReadOnlyCollection<ItemNotaFiscal> itens)
    {
        return new NotaFiscal(Guid.NewGuid(), numeroSequencial, StatusNotaFiscal.Aberta, itens, DateTime.UtcNow);
    }

    public bool TentarFechar()
    {
        if (Status == StatusNotaFiscal.Fechada)
        {
            return false;
        }

        Status = StatusNotaFiscal.Fechada;
        return true;
    }
}
