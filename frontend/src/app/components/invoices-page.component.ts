import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal, effect } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  ApiService,
  CriarNotaFiscalRequisicao,
  ImpressaoNotaFiscalResposta,
  NotaFiscalResposta
} from '../services/api.service';
import { PdfService } from '../services/pdf.service';
import { extrairMensagemErro, formatarData } from '../shared/utils/helpers';
import { ToastService } from '@shared/components/toast/toast.service';

@Component({
  standalone: true,
  selector: 'app-invoices-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="px-6 pb-2">
      <div class="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header class="flex flex-wrap items-start justify-between gap-6">
          <div class="max-w-2xl">
            <p class="text-sm font-semibold uppercase tracking-wide text-[#fc064b]">Faturamento</p>
            <h1 class="mt-1 text-3xl font-semibold text-slate-700">Painel de notas fiscais</h1>
            <p class="mt-2 text-sm text-slate-600">
              Cadastre produtos em uma nova nota, acompanhe os status e finalize a operação com a impressão.
            </p>
          </div>
        </header>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/60">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Notas cadastradas</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ totalNotas() }}</p>
          </div>
          <div class="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/60">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Notas abertas</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ notasAbertas() }}</p>
          </div>
          <div class="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/60">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Notas fechadas</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ notasFechadas() }}</p>
          </div>
          <div class="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/60">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Itens controlados</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ totalItens() }}</p>
            <ng-container *ngIf="ultimaAtualizacao() as ultima; else aguardandoAtualizacao">
              <p class="mt-1 text-xs text-slate-500">Atualizado em {{ formatarData(ultima.toISOString()) }}</p>
            </ng-container>
            <ng-template #aguardandoAtualizacao>
              <p class="mt-1 text-xs text-slate-500">Sem sincronização registrada</p>
            </ng-template>
          </div>
        </div>

        <div class="grid items-start gap-8 lg:grid-cols-[minmax(360px,420px)_1fr]">
          <article class="rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-lg shadow-slate-200/60 lg:sticky lg:top-10">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-slate-700">Nova nota fiscal</h2>
              <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {{ itens().length }} {{ itens().length === 1 ? 'item' : 'itens' }}
              </span>
            </div>

            <form [formGroup]="formulario" (ngSubmit)="salvarNota()" class="mt-6 flex flex-1 flex-col gap-5">
              <div formArrayName="itens" class="flex max-h-72 flex-col gap-5 overflow-y-auto pr-1">
                <div
                  class="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm shadow-slate-200/40 transition hover:border-[#fc064b]/30"
                  *ngFor="let item of itens().controls; let i = index"
                  [formGroupName]="i"
                >
                  <div class="flex flex-wrap items-start gap-4">
                    <label class="flex min-w-[200px] flex-1 flex-col gap-2 text-sm font-medium text-slate-600">
                      <span>Código do produto</span>
                      <input
                        type="text"
                        formControlName="codigoProduto"
                        placeholder="Ex.: PROD-001"
                        class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm transition focus:border-[#fc064b] focus:outline-none focus:ring-2 focus:ring-[#fc064b]/20"
                      />
                    </label>
                    <label class="flex w-full max-w-[140px] flex-col gap-2 text-sm font-medium text-slate-600">
                      <span>Quantidade</span>
                      <input
                        type="number"
                        formControlName="quantidade"
                        min="1"
                        class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm transition focus:border-[#fc064b] focus:outline-none focus:ring-2 focus:ring-[#fc064b]/20"
                      />
                    </label>
                    <button
                      type="button"
                      class="ml-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-base font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      (click)="removerItem(i)"
                      [disabled]="itens().length === 1"
                      aria-label="Remover item"
                    >&times;</button>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#fc064b]/40 bg-white px-4 py-2 text-sm font-semibold text-[#fc064b] transition hover:text-[#2b4859] hover:border-[#2b4859] disabled:cursor-not-allowed disabled:opacity-60"
                  (click)="adicionarItem()"
                >
                  Adicionar produto
                </button>
                <button
                  type="submit"
                  class="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-[#d50460] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2b4859] disabled:cursor-not-allowed disabled:opacity-60"
                  [disabled]="formulario.invalid || salvando()"
                >
                  <span *ngIf="!salvando(); else savingNota">Registrar nota</span>
                </button>
                <ng-template #savingNota>Salvando...</ng-template>
              </div>
            </form>
          </article>

          <article class="flex max-h-[50vh] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
            <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 class="text-xl font-semibold text-slate-700">Notas registradas</h2>
                <ng-container *ngIf="ultimaAtualizacao() as ultima; else aguardandoLista">
                  <p class="mt-1 text-sm text-slate-500">Atualizado em {{ formatarData(ultima.toISOString()) }}</p>
                </ng-container>
                <ng-template #aguardandoLista>
                  <p class="mt-1 text-sm text-slate-500">Aguardando sincronização inicial</p>
                </ng-template>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto" *ngIf="notas().length; else listaVazia">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-6 py-3 font-semibold">Número</th>
                    <th class="px-6 py-3 font-semibold">Status</th>
                    <th class="px-6 py-3 font-semibold">Produtos</th>
                    <th class="px-6 py-3 font-semibold">Criada em</th>
                    <th class="px-6 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  <tr *ngFor="let nota of notas()" class="transition hover:bg-slate-50">
                    <td class="px-6 py-3 font-medium text-slate-800">#{{ nota.numeroSequencial }}</td>
                    <td class="px-6 py-3">
                      <span
                        class="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-semibold"
                        [ngClass]="nota.status === 'Fechada'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-[#fc064b]/40 bg-[#fc064b]/10 text-[#fc064b]'"
                      >
                        {{ nota.status }}
                      </span>
                    </td>
                    <td class="px-6 py-3 text-slate-600">{{ nota.itens.length }}</td>
                    <td class="px-6 py-3 text-slate-500">{{ nota.criadaEmUtc | date: 'short' }}</td>
                    <td class="px-6 py-3 text-right">
                      <button
                        type="button"
                        class="inline-flex cursor-pointer items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-600 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        (click)="imprimirNota(nota)"
                        [disabled]="nota.status === 'Fechada' || imprimindoId() === nota.id"
                      >
                        <ng-container *ngIf="imprimindoId() === nota.id; else rotuloImprimir">Processando...</ng-container>
                        <ng-template #rotuloImprimir>Imprimir</ng-template>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <ng-template #listaVazia>
              <div class="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                <p class="text-sm font-medium text-slate-600">Nenhuma nota fiscal cadastrada até o momento.</p>
                <p class="mt-1 text-sm text-slate-500">Utilize o formulário ao lado para registrar a primeira nota.</p>
              </div>
            </ng-template>
          </article>
        </div>
      </div>
    </section>
  `
})
export class InvoicesPageComponent {
  private readonly api = inject(ApiService);
  private readonly pdfService = inject(PdfService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  protected readonly notas = signal<NotaFiscalResposta[]>([]);
  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly imprimindoId = signal<string | null>(null);
  protected readonly ultimaAtualizacao = signal<Date | null>(null);
  protected readonly formatarData = formatarData;

  protected readonly formulario = this.formBuilder.nonNullable.group({
    itens: this.formBuilder.array([
      this.criarItem()
    ])
  });

  protected readonly totalNotas = computed(() => this.notas().length);
  protected readonly notasAbertas = computed(() => this.notas().filter(nota => nota.status !== 'Fechada').length);
  protected readonly notasFechadas = computed(() => this.notas().filter(nota => nota.status === 'Fechada').length);
  protected readonly totalItens = computed(() => this.notas().reduce((total, nota) => total + nota.itens.length, 0));

  private readonly STORAGE_KEY = 'korp_rascunho_nota_fiscal';

  constructor() {
    this.carregarNotas();
    this.restaurarRascunho();
    this.configurarAutoSalvamento();
  }

  protected itens(): FormArray {
    return this.formulario.controls.itens as FormArray;
  }

  protected adicionarItem(): void {
    this.itens().push(this.criarItem());
    this.salvarRascunho();
  }

  protected removerItem(indice: number): void {
    if (this.itens().length > 1) {
      this.itens().removeAt(indice);
      this.salvarRascunho();
    }
  }

  protected carregarNotas(): void {
    this.carregando.set(true);
    this.api
      .listarNotas()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.carregando.set(false))
      )
      .subscribe({
        next: (notas: NotaFiscalResposta[]) => {
          this.notas.set(notas);
          this.ultimaAtualizacao.set(new Date());
        },
        error: (erro: unknown) => {
          this.toast.error('Não foi possível carregar as notas fiscais', this.resolverErro(erro, 'Verifique a conexão e tente novamente.'));
        }
      });
  }

  protected salvarNota(): void {
    if (this.formulario.invalid || this.salvando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const itensPayload = this.itens()
      .controls
      .map(controle => controle.value as { codigoProduto: string; quantidade: number })
      .map(item => ({ codigoProduto: item.codigoProduto.trim(), quantidade: item.quantidade }));

    const payload: CriarNotaFiscalRequisicao = { itens: itensPayload };

    this.salvando.set(true);
    this.api
      .criarNota(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.salvando.set(false))
      )
      .subscribe({
        next: (nota: NotaFiscalResposta) => {
          this.toast.success('Nota fiscal registrada', `Documento #${nota.numeroSequencial} está disponível na listagem.`);
          this.itens().clear();
          this.itens().push(this.criarItem());
          this.limparRascunho();
          this.carregarNotas();
        },
        error: (erro: unknown) => {
          this.toast.error('Registro não concluído', this.resolverErro(erro, 'Não foi possível registrar a nota fiscal.'));
        }
      });
  }

  protected imprimirNota(nota: NotaFiscalResposta): void {
    if (nota.status === 'Fechada') {
      return;
    }

    this.imprimindoId.set(nota.id);
    this.api
      .imprimirNota(nota.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (resposta: ImpressaoNotaFiscalResposta) => {
          try {
            await this.gerarPdfNota(resposta.nota);
            this.toast.success('Nota fiscal impressa', resposta.mensagem);
            this.carregarNotas();
          } catch (erro) {
            console.error('Falha ao gerar PDF da nota fiscal.', erro);
            this.toast.error('Falha ao gerar PDF', 'Não foi possível gerar o PDF da nota fiscal.');
          } finally {
            this.imprimindoId.set(null);
          }
        },
        error: (erro: unknown) => {
          this.toast.error('Impressão não concluída', this.resolverErro(erro, 'Não foi possível imprimir a nota fiscal.'));
          this.imprimindoId.set(null);
        }
      });
  }

  private criarItem() {
    return this.formBuilder.nonNullable.group({
      codigoProduto: ['', [Validators.required, Validators.maxLength(32)]],
      quantidade: [1, [Validators.required, Validators.min(1)]]
    });
  }

  private async gerarPdfNota(nota: NotaFiscalResposta): Promise<void> {
    await this.pdfService.gerarNotaFiscalPdf(nota);
  }

  private resolverErro(erro: unknown, fallback: string): string {
    return extrairMensagemErro(erro) ?? fallback;
  }

  private configurarAutoSalvamento(): void {
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.salvarRascunho();
      });
  }

  private salvarRascunho(): void {
    try {
      const rascunho = {
        itens: this.itens().controls.map(controle => controle.value),
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rascunho));
    } catch (erro) {
      console.warn('Não foi possível salvar o rascunho da nota fiscal.', erro);
    }
  }

  private restaurarRascunho(): void {
    try {
      const rascunhoSalvo = localStorage.getItem(this.STORAGE_KEY);
      if (!rascunhoSalvo) {
        return;
      }

      const rascunho = JSON.parse(rascunhoSalvo);
      if (!rascunho?.itens || !Array.isArray(rascunho.itens) || rascunho.itens.length === 0) {
        return;
      }

      this.itens().clear();
      for (const item of rascunho.itens) {
        const grupo = this.criarItem();
        grupo.patchValue({
          codigoProduto: item.codigoProduto || '',
          quantidade: item.quantidade || 1
        });
        this.itens().push(grupo);
      }
    } catch (erro) {
      console.warn('Não foi possível restaurar o rascunho da nota fiscal.', erro);
      this.limparRascunho();
    }
  }

  private limparRascunho(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (erro) {
      console.warn('Não foi possível limpar o rascunho da nota fiscal.', erro);
    }
  }
}
