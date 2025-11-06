using System.Linq;
using global::FaturamentoService.Contracts;
using global::FaturamentoService.Mappings;
using global::FaturamentoService.Models;
using global::FaturamentoService.Repositories;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace FaturamentoService;

public static class Program
{
    public static void Main(string[] args)
    {
        var construtor = WebApplication.CreateBuilder(args);

        construtor.Services.AddEndpointsApiExplorer();
        construtor.Services.AddSwaggerGen();
        construtor.Services.AddSingleton<IRepositorioNotaFiscal, RepositorioNotaFiscalMemoria>();

        var aplicativo = construtor.Build();

        if (aplicativo.Environment.IsDevelopment())
        {
            aplicativo.UseSwagger();
            aplicativo.UseSwaggerUI();
        }

        aplicativo.UseHttpsRedirection();

        aplicativo.MapPost("/notas-fiscais", async Task<IResult> (
            CriarNotaFiscalRequisicao requisicao,
            IRepositorioNotaFiscal repositorio,
            CancellationToken cancelamento) =>
        {
            if (!CriarNotaFiscalRequisicao.EhValida(requisicao, out var erroValidacao))
            {
                return Results.BadRequest(new { erro = erroValidacao });
            }

            var itens = requisicao.Itens!
                .Select(item => ItemNotaFiscal.Criar(item.CodigoProduto!, item.Quantidade!.Value))
                .ToArray();

            var notaFiscal = await repositorio.CriarAsync(itens, cancelamento).ConfigureAwait(false);
            return Results.Created($"/notas-fiscais/{notaFiscal.Id}", notaFiscal.ParaResposta());
        })
        .WithName("CriarNotaFiscal")
        .WithOpenApi();

        aplicativo.MapGet("/notas-fiscais", async Task<IResult> (IRepositorioNotaFiscal repositorio, CancellationToken cancelamento) =>
        {
            var notas = await repositorio.ObterTodasAsync(cancelamento).ConfigureAwait(false);
            return Results.Ok(notas.Select(nota => nota.ParaResposta()));
        })
        .WithName("ListarNotasFiscais")
        .WithOpenApi();

        aplicativo.MapPost("/notas-fiscais/{notaFiscalId:guid}/fechamento", async Task<IResult> (
            Guid notaFiscalId,
            IRepositorioNotaFiscal repositorio,
            CancellationToken cancelamento) =>
        {
            var notaExistente = await repositorio.ObterPorIdAsync(notaFiscalId, cancelamento).ConfigureAwait(false);
            if (notaExistente is null)
            {
                return Results.NotFound(new { erro = "Nota fiscal não encontrada." });
            }

            if (notaExistente.Status == StatusNotaFiscal.Fechada)
            {
                return Results.Conflict(new { erro = "Nota fiscal já está fechada." });
            }

            var notaFechada = await repositorio.FecharAsync(notaFiscalId, cancelamento).ConfigureAwait(false);
            if (notaFechada is null)
            {
                return Results.BadRequest(new { erro = "Não foi possível fechar a nota fiscal." });
            }

            return Results.Ok(notaFechada.ParaResposta());
        })
        .WithName("FecharNotaFiscal")
        .WithOpenApi();

        aplicativo.Run();
    }
}
