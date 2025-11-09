import { inject, Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { firstValueFrom } from 'rxjs';

import { ApiService, NotaFiscalResposta, ProdutoResposta } from './api.service';
import { formatarData, limitarTexto } from '../shared/utils/helpers';

@Injectable({ providedIn: 'root' })
export class PdfService {
  private readonly api = inject(ApiService);
  private produtosPorCodigo = new Map<string, ProdutoResposta>();
  private catalogoCarregado = false;

  async gerarNotaFiscalPdf(nota: NotaFiscalResposta): Promise<void> {
    await this.carregarCatalogoProdutos();

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margem = 15;
    const larguraUtil = pageWidth - margem * 2;

    // Cabeçalho
    this.desenharCabecalho(doc, pageWidth, margem);

    // Resumo da nota
    let cursorY = this.desenharResumo(doc, nota, margem, larguraUtil);

    // Tabela de itens
    cursorY = this.desenharTabelaItens(doc, nota, margem, larguraUtil, pageHeight, cursorY);

    // Observações
    this.desenharObservacoes(doc, margem, larguraUtil, pageHeight, cursorY);

    doc.save(`nota-fiscal-${nota.numeroSequencial}.pdf`);
  }

  private desenharCabecalho(doc: jsPDF, pageWidth: number, margem: number): void {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Nota Fiscal', margem, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Gerado em ${formatarData(new Date().toISOString())}`, pageWidth - margem, 12, { align: 'right' });
  }

  private desenharResumo(doc: jsPDF, nota: NotaFiscalResposta, margem: number, larguraUtil: number): number {
    let cursorY = 30;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.setTextColor(30, 41, 59);
    doc.rect(margem, cursorY - 6, larguraUtil, 26, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Número: ${nota.numeroSequencial}`, margem + 6, cursorY);
    doc.text(`Status: ${nota.status}`, margem + larguraUtil / 2, cursorY);

    cursorY += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Criada em: ${formatarData(nota.criadaEmUtc)}`, margem + 6, cursorY);
    doc.text(`Itens registrados: ${nota.itens.length}`, margem + larguraUtil / 2, cursorY);

    return cursorY + 20;
  }

  private desenharTabelaItens(
    doc: jsPDF,
    nota: NotaFiscalResposta,
    margem: number,
    larguraUtil: number,
    pageHeight: number,
    cursorInicial: number
  ): number {
    const alturaCabecalho = 9;
    const alturaLinha = 8;
    const colCodigo = 32;
    const colQuantidade = 26;
    const colSaldo = 26;
    const colDescricao = larguraUtil - colCodigo - colQuantidade - colSaldo;

    let cursorY = cursorInicial;

    // Desenhar cabeçalho da tabela
    const desenharCabecalho = (topo: number) => {
      doc.setFillColor(226, 232, 240);
      doc.rect(margem, topo, larguraUtil, alturaCabecalho, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.text('Código', margem + 4, topo + 6);
      doc.text('Descrição', margem + colCodigo + 4, topo + 6);
      doc.text('Qtd.', margem + colCodigo + colDescricao + colQuantidade / 2, topo + 6, { align: 'center' });
      doc.text('Saldo', margem + colCodigo + colDescricao + colQuantidade + colSaldo / 2, topo + 6, { align: 'center' });
    };

    desenharCabecalho(cursorY);
    cursorY += alturaCabecalho;

    if (!nota.itens.length) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text('Nenhum item foi associado a esta nota fiscal.', margem + 2, cursorY + 6);
      return cursorY + 18;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    nota.itens.forEach((item: any, indice: number) => {
      if (cursorY + alturaLinha > pageHeight - margem) {
        doc.addPage();
        doc.setTextColor(30, 41, 59);
        desenharCabecalho(margem);
        cursorY = margem + alturaCabecalho;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
      }

      const produto = this.produtosPorCodigo.get(item.codigoProduto);
      const descricao = limitarTexto(produto?.descricao ?? 'Descrição indisponível', 70);
      const saldo = produto?.saldo ?? null;

      if (indice % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margem, cursorY, larguraUtil, alturaLinha, 'F');
      }

      doc.text(item.codigoProduto, margem + 4, cursorY + 5);
      doc.text(descricao, margem + colCodigo + 4, cursorY + 5, { maxWidth: colDescricao - 6 });
      doc.text(String(item.quantidade), margem + colCodigo + colDescricao + colQuantidade / 2, cursorY + 5, { align: 'center' });
      doc.text(saldo !== null ? String(saldo) : '-/-', margem + colCodigo + colDescricao + colQuantidade + colSaldo / 2, cursorY + 5, { align: 'center' });

      cursorY += alturaLinha;
    });

    return cursorY;
  }

  private desenharObservacoes(doc: jsPDF, margem: number, larguraUtil: number, pageHeight: number, cursorInicial: number): void {
    const cursorY = Math.min(cursorInicial + 12, pageHeight - margem - 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text('Observações', margem, cursorY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Documento gerado automaticamente pelo módulo de faturamento. A impressão confirma a baixa dos produtos no estoque.',
      margem,
      cursorY + 6,
      { maxWidth: larguraUtil }
    );
  }

  private async carregarCatalogoProdutos(): Promise<void> {
    try {
      const produtos = await firstValueFrom(this.api.listarProdutos()) as ProdutoResposta[];
      this.produtosPorCodigo.clear();
      for (const produto of produtos) {
        this.produtosPorCodigo.set(produto.codigo, produto);
      }
      this.catalogoCarregado = true;
    } catch (erro) {
      console.error('Falha ao carregar catálogo de produtos.', erro);
    }
  }

  invalidarCache(): void {
    this.catalogoCarregado = false;
  }
}
