using System.Linq;
using global::FaturamentoService.Contracts;
using global::FaturamentoService.Mappings;
using global::FaturamentoService.Models;
using global::FaturamentoService.Repositories;
using global::FaturamentoService.Idempotency;
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
        construtor.Services.AddMemoryCache();
        construtor.Services.AddSingleton<IIdempotencyService, IdempotencyService>();

        const string politicaCors = "CorsFrontend";
        construtor.Services.AddCors(opcoes =>
            opcoes.AddPolicy(politicaCors, configuracao =>
                configuracao
                    .AllowAnyOrigin()
                    .AllowAnyHeader()
                    .AllowAnyMethod()));

        var estoqueBaseUrl = construtor.Configuration["Servicos:Estoque:BaseUrl"];
        if (string.IsNullOrWhiteSpace(estoqueBaseUrl))
        {
            estoqueBaseUrl = "http://localhost:5213";
        }

        construtor.Services.AddHttpClient("EstoqueService", cliente =>
        {
            cliente.BaseAddress = new Uri(estoqueBaseUrl);
        });

        var aplicativo = construtor.Build();

        if (aplicativo.Environment.IsDevelopment())
        {
            aplicativo.UseSwagger();
            aplicativo.UseSwaggerUI();
        }

        aplicativo.UseCors(politicaCors);

        aplicativo.MapPost("/notas-fiscais", async Task<IResult> (
            HttpContext contexto,
            CriarNotaFiscalRequisicao requisicao,
            IRepositorioNotaFiscal repositorio,
            IIdempotencyService idempotencia,
            CancellationToken cancelamento) =>
        {
            return await idempotencia.ExecuteAsync(
                contexto.Request.Headers["Idempotency-Key"].FirstOrDefault(),
                contexto,
                async token =>
                {
                    if (!CriarNotaFiscalRequisicao.EhValida(requisicao, out var erroValidacao))
                    {
                        return Results.BadRequest(new { erro = erroValidacao });
                    }

                    var itens = requisicao.Itens!
                        .Select(item => ItemNotaFiscal.Criar(item.CodigoProduto!, item.Quantidade!.Value))
                        .ToArray();

                    var notaFiscal = await repositorio.CriarAsync(itens, token).ConfigureAwait(false);
                    return Results.Created($"/notas-fiscais/{notaFiscal.Id}", notaFiscal.ParaResposta());
                },
                cancelamento).ConfigureAwait(false);
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
            HttpContext contexto,
            Guid notaFiscalId,
            IRepositorioNotaFiscal repositorio,
            IIdempotencyService idempotencia,
            CancellationToken cancelamento) =>
        {
            return await idempotencia.ExecuteAsync(
                contexto.Request.Headers["Idempotency-Key"].FirstOrDefault(),
                contexto,
                async token =>
                {
                    var notaExistente = await repositorio.ObterPorIdAsync(notaFiscalId, token).ConfigureAwait(false);
                    if (notaExistente is null)
                    {
                        return Results.NotFound(new { erro = "Nota fiscal não encontrada." });
                    }

                    if (notaExistente.Status == StatusNotaFiscal.Fechada)
                    {
                        return Results.Conflict(new { erro = "Nota fiscal já está fechada." });
                    }

                    var notaFechada = await repositorio.FecharAsync(notaFiscalId, token).ConfigureAwait(false);
                    if (notaFechada is null)
                    {
                        return Results.BadRequest(new { erro = "Não foi possível fechar a nota fiscal." });
                    }

                    return Results.Ok(notaFechada.ParaResposta());
                },
                cancelamento).ConfigureAwait(false);
        })
        .WithName("FecharNotaFiscal")
        .WithOpenApi();

        aplicativo.MapPost("/notas-fiscais/{notaFiscalId:guid}/impressao", async Task<IResult> (
            HttpContext contexto,
            Guid notaFiscalId,
            IRepositorioNotaFiscal repositorio,
            IHttpClientFactory httpClientFactory,
            IIdempotencyService idempotencia,
            CancellationToken cancelamento) =>
        {
            return await idempotencia.ExecuteAsync(
                contexto.Request.Headers["Idempotency-Key"].FirstOrDefault(),
                contexto,
                async token =>
                {
                    var notaExistente = await repositorio.ObterPorIdAsync(notaFiscalId, token).ConfigureAwait(false);
                    if (notaExistente is null)
                    {
                        return Results.NotFound(new { erro = "Nota fiscal não encontrada." });
                    }

                    if (notaExistente.Status == StatusNotaFiscal.Fechada)
                    {
                        return Results.Conflict(new { erro = "Nota fiscal já está fechada." });
                    }

                    var clienteEstoque = httpClientFactory.CreateClient("EstoqueService");
                    var requisicaoConsumo = new
                    {
                        itens = notaExistente.Itens.Select(item => new { codigo = item.CodigoProduto, quantidade = item.Quantidade })
                    };

                    var respostaConsumo = await clienteEstoque.PostAsJsonAsync("/produtos/consumo", requisicaoConsumo, token).ConfigureAwait(false);
                    if (!respostaConsumo.IsSuccessStatusCode)
                    {
                        var corpoErro = await respostaConsumo.Content.ReadFromJsonAsync<object?>(cancellationToken: token).ConfigureAwait(false);
                        return Results.Json(
                            corpoErro ?? new { erro = "Falha ao debitar estoque." },
                            statusCode: (int)respostaConsumo.StatusCode);
                    }

                    var notaFechada = await repositorio.FecharAsync(notaFiscalId, token).ConfigureAwait(false);
                    if (notaFechada is null)
                    {
                        return Results.BadRequest(new { erro = "Não foi possível fechar a nota fiscal." });
                    }

                    return Results.Ok(new
                    {
                        mensagem = "Nota fiscal impressa com sucesso.",
                        nota = notaFechada.ParaResposta()
                    });
                },
                cancelamento).ConfigureAwait(false);
        })
        .WithName("ImprimirNotaFiscal")
        .WithOpenApi();

        aplicativo.Run();
    }
}
