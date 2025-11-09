import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ProdutoResposta {
  id: string;
  codigo: string;
  descricao: string;
  saldo: number;
  criadoEmUtc: string;
}

export interface CriarProdutoRequisicao {
  codigo: string;
  descricao: string;
  saldo: number;
}

export interface ItemNotaFiscalResposta {
  id: string;
  codigoProduto: string;
  quantidade: number;
}

export interface NotaFiscalResposta {
  id: string;
  numeroSequencial: number;
  status: string;
  criadaEmUtc: string;
  itens: ItemNotaFiscalResposta[];
}

export interface CriarNotaFiscalRequisicao {
  itens: Array<{
    codigoProduto: string;
    quantidade: number;
  }>;
}

export interface ImpressaoNotaFiscalResposta {
  mensagem: string;
  nota: NotaFiscalResposta;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly estoqueBaseUrl = 'http://localhost:5213';
  private readonly faturamentoBaseUrl = 'http://localhost:5284';

  private buildIdempotencyHeaders(customKey?: string) {
    const key = customKey ?? crypto.randomUUID();
    return new HttpHeaders({ 'Idempotency-Key': key });
  }

  listarProdutos(): Observable<ProdutoResposta[]> {
    return this.http.get<ProdutoResposta[]>(`${this.estoqueBaseUrl}/produtos`);
  }

  criarProduto(payload: CriarProdutoRequisicao): Observable<ProdutoResposta> {
    return this.http.post<ProdutoResposta>(`${this.estoqueBaseUrl}/produtos`, payload, {
      headers: this.buildIdempotencyHeaders(),
    });
  }

  listarNotas(): Observable<NotaFiscalResposta[]> {
    return this.http.get<NotaFiscalResposta[]>(`${this.faturamentoBaseUrl}/notas-fiscais`);
  }

  criarNota(payload: CriarNotaFiscalRequisicao): Observable<NotaFiscalResposta> {
    return this.http.post<NotaFiscalResposta>(`${this.faturamentoBaseUrl}/notas-fiscais`, payload, {
      headers: this.buildIdempotencyHeaders(),
    });
  }

  imprimirNota(notaId: string): Observable<ImpressaoNotaFiscalResposta> {
    return this.http.post<ImpressaoNotaFiscalResposta>(
      `${this.faturamentoBaseUrl}/notas-fiscais/${notaId}/impressao`,
      {},
      {
        headers: this.buildIdempotencyHeaders(),
      }
    );
  }
}
