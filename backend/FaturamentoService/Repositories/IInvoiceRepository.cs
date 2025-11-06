using FaturamentoService.Models;

namespace FaturamentoService.Repositories;

public interface IRepositorioNotaFiscal
{
    Task<NotaFiscal> CriarAsync(IReadOnlyCollection<ItemNotaFiscal> itens, CancellationToken cancelamento);
    Task<IReadOnlyCollection<NotaFiscal>> ObterTodasAsync(CancellationToken cancelamento);
    Task<NotaFiscal?> ObterPorIdAsync(Guid id, CancellationToken cancelamento);
    Task<NotaFiscal?> FecharAsync(Guid id, CancellationToken cancelamento);
}
