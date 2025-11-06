namespace EstoqueService.Models;

public sealed class Produto
{
	private Produto(Guid id, string codigo, string descricao, int saldo, DateTime criadoEmUtc)
	{
		Id = id;
		Codigo = codigo;
		Descricao = descricao;
		Saldo = saldo;
		CriadoEmUtc = criadoEmUtc;
	}

	public Guid Id { get; }
	public string Codigo { get; }
	public string Descricao { get; }
	public int Saldo { get; private set; }
	public DateTime CriadoEmUtc { get; }

	public static Produto Criar(string codigo, string descricao, int saldo)
	{
		return new Produto(Guid.NewGuid(), codigo.Trim(), descricao.Trim(), saldo, DateTime.UtcNow);
	}
}
