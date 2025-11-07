using System.Collections.Generic;
using System.Linq;
using EstoqueService.Contracts;
using EstoqueService.Idempotency;
using EstoqueService.Mappings;
using EstoqueService.Models;
using EstoqueService.Repositories;

var construtor = WebApplication.CreateBuilder(args);

construtor.Services.AddEndpointsApiExplorer();
construtor.Services.AddSwaggerGen();
construtor.Services.AddSingleton<IRepositorioProduto, RepositorioProdutoMemoria>();
construtor.Services.AddMemoryCache();
construtor.Services.AddSingleton<IIdempotencyService, IdempotencyService>();

const string politicaCors = "CorsFrontend";
construtor.Services.AddCors(opcoes =>
    opcoes.AddPolicy(politicaCors, configuracao =>
        configuracao
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod()));

var aplicativo = construtor.Build();

if (aplicativo.Environment.IsDevelopment())
{
    aplicativo.UseSwagger();
    aplicativo.UseSwaggerUI();
}

aplicativo.UseCors(politicaCors);

aplicativo.MapPost("/produtos", async Task<IResult> (
    HttpContext contexto,
    CriarProdutoRequisicao requisicao,
    IRepositorioProduto repositorio,
    IIdempotencyService idempotencia,
    CancellationToken cancelamento) =>
{
    return await idempotencia.ExecuteAsync(
        contexto.Request.Headers["Idempotency-Key"].FirstOrDefault(),
        contexto,
        async token =>
        {
            if (!CriarProdutoRequisicao.EhValido(requisicao, out var erroValidacao))
            {
                return Results.BadRequest(new { erro = erroValidacao });
            }

            var produto = Produto.Criar(requisicao.Codigo!, requisicao.Descricao!, requisicao.Saldo!.Value);

            if (!await repositorio.TentarAdicionarAsync(produto, token).ConfigureAwait(false))
            {
                return Results.Conflict(new { erro = "Código do produto já existe." });
            }

            var resposta = produto.ParaResposta();
            return Results.Created($"/produtos/{resposta.Id}", resposta);
        },
        cancelamento).ConfigureAwait(false);
})
.WithName("CriarProduto")
.WithOpenApi();

aplicativo.MapGet("/produtos", async Task<IResult> (IRepositorioProduto repositorio, CancellationToken cancelamento) =>
{
    var produtos = await repositorio.ObterTodosAsync(cancelamento).ConfigureAwait(false);
    return Results.Ok(produtos.Select(produto => produto.ParaResposta()));
})
.WithName("ListarProdutos")
.WithOpenApi();

aplicativo.MapPost("/produtos/consumo", async Task<IResult> (
    HttpContext contexto,
    ConsumirProdutosRequisicao requisicao,
    IRepositorioProduto repositorio,
    IIdempotencyService idempotencia,
    CancellationToken cancelamento) =>
{
    return await idempotencia.ExecuteAsync(
        contexto.Request.Headers["Idempotency-Key"].FirstOrDefault(),
        contexto,
        async token =>
        {
            if (!ConsumirProdutosRequisicao.EhValida(requisicao, out var erroValidacao))
            {
                return Results.BadRequest(new { erro = erroValidacao });
            }

            var consumos = new List<(Produto produto, int quantidade)>();

            foreach (var item in requisicao.Itens!)
            {
                var produto = await repositorio.ObterPorCodigoAsync(item.Codigo!, token).ConfigureAwait(false);
                if (produto is null)
                {
                    return Results.NotFound(new { erro = $"Produto com código '{item.Codigo}' não encontrado." });
                }

                consumos.Add((produto, item.Quantidade!.Value));
            }

            var resultado = await repositorio.TentarDebitarAsync(consumos, token).ConfigureAwait(false);
            if (!resultado.Sucesso)
            {
                return Results.Conflict(new { erro = resultado.Erro ?? "Saldo insuficiente para um dos produtos." });
            }

            var respostas = consumos.Select(item => item.produto.ParaResposta()).ToArray();
            return Results.Ok(respostas);
        },
        cancelamento).ConfigureAwait(false);
})
.WithName("ConsumirProdutos")
.WithOpenApi();

aplicativo.Run();
