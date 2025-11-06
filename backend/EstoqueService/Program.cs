using EstoqueService.Contracts;
using EstoqueService.Mappings;
using EstoqueService.Models;
using EstoqueService.Repositories;

var construtor = WebApplication.CreateBuilder(args);

construtor.Services.AddEndpointsApiExplorer();
construtor.Services.AddSwaggerGen();
construtor.Services.AddSingleton<IRepositorioProduto, RepositorioProdutoMemoria>();

var aplicativo = construtor.Build();

if (aplicativo.Environment.IsDevelopment())
{
    aplicativo.UseSwagger();
    aplicativo.UseSwaggerUI();
}

aplicativo.UseHttpsRedirection();

aplicativo.MapPost("/produtos", async Task<IResult> (
    CriarProdutoRequisicao requisicao,
    IRepositorioProduto repositorio,
    CancellationToken cancelamento) =>
{
    if (!CriarProdutoRequisicao.EhValido(requisicao, out var erroValidacao))
    {
        return Results.BadRequest(new { erro = erroValidacao });
    }

    var produto = Produto.Criar(requisicao.Codigo!, requisicao.Descricao!, requisicao.Saldo!.Value);

    if (!await repositorio.TentarAdicionarAsync(produto, cancelamento).ConfigureAwait(false))
    {
        return Results.Conflict(new { erro = "Código do produto já existe." });
    }

    var resposta = produto.ParaResposta();
    return Results.Created($"/produtos/{resposta.Id}", resposta);
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

aplicativo.Run();
