using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using FaturamentoService.Models;

namespace FaturamentoService.Repositories;

public sealed class RepositorioNotaFiscalMemoria : IRepositorioNotaFiscal
{
    private readonly ConcurrentDictionary<Guid, NotaFiscal> _notas = new();
    private int _sequencia;

    public Task<NotaFiscal> CriarAsync(IReadOnlyCollection<ItemNotaFiscal> itens, CancellationToken cancelamento)
    {
        cancelamento.ThrowIfCancellationRequested();
        var numeroSequencial = Interlocked.Increment(ref _sequencia);
        var notaFiscal = NotaFiscal.Criar(numeroSequencial, itens);
        _notas[notaFiscal.Id] = notaFiscal;
        return Task.FromResult(notaFiscal);
    }

    public Task<IReadOnlyCollection<NotaFiscal>> ObterTodasAsync(CancellationToken cancelamento)
    {
        cancelamento.ThrowIfCancellationRequested();
        var instantaneo = _notas.Values
            .OrderBy(nota => nota.NumeroSequencial)
            .ToArray();

        return Task.FromResult<IReadOnlyCollection<NotaFiscal>>(instantaneo);
    }

    public Task<NotaFiscal?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
    {
        cancelamento.ThrowIfCancellationRequested();
        _notas.TryGetValue(id, out var notaFiscal);
        return Task.FromResult(notaFiscal);
    }

    public Task<NotaFiscal?> FecharAsync(Guid id, CancellationToken cancelamento)
    {
        cancelamento.ThrowIfCancellationRequested();
        if (!_notas.TryGetValue(id, out var notaFiscal))
        {
            return Task.FromResult<NotaFiscal?>(null);
        }

        if (!notaFiscal.TentarFechar())
        {
            return Task.FromResult<NotaFiscal?>(null);
        }

        return Task.FromResult<NotaFiscal?>(notaFiscal);
    }
}
