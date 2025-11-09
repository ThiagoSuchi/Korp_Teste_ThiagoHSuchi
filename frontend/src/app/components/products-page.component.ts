import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { ApiService, ProdutoResposta } from '../services/api.service';
import { ToastService } from '@shared/components/toast/toast.service';
import { extrairMensagemErro } from '@shared/utils/helpers';

@Component({
  standalone: true,
  selector: 'app-products-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="flex flex-col gap-8">
      <header class="flex flex-wrap items-start justify-between gap-6">
        <div class="max-w-xl">
          <h1 class="text-3xl font-semibold text-gray-700">Produtos</h1>
          <p class="mt-2 text-sm text-gray-700">
            Cadastre itens de estoque e acompanhe saldos disponíveis para faturamento.
          </p>
        </div>
      </header>

      <div class="grid gap-6 lg:grid-cols-2">
  <article class="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/70 backdrop-blur">
          <h2 class="text-xl font-semibold text-gray-700">Novo produto</h2>
          <form [formGroup]="formulario" (ngSubmit)="salvarProduto()" class="grid gap-4">
            <label class="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Código</span>
              <input
                type="text"
                formControlName="codigo"
                placeholder="Ex.: PROD-001"
                autocomplete="off"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-500 placeholder:text-slate-400 shadow-sm shadow-slate-200 transition focus:border-[#fc064b] focus:outline-none focus:ring-2 focus:ring-[#fc064b]/20"
              />
            </label>
            <label class="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Descrição</span>
              <input
                type="text"
                formControlName="descricao"
                placeholder="Ex.: Monitor 27"
                autocomplete="off"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-500 placeholder:text-slate-400 shadow-sm shadow-slate-200 transition focus:border-[#fc064b] focus:outline-none focus:ring-2 focus:ring-[#fc064b]/20"
              />
            </label>
            <label class="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <span>Saldo inicial</span>
              <input
                type="number"
                formControlName="saldo"
                min="0"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-500 placeholder:text-slate-400 shadow-sm shadow-slate-200 transition focus:border-[#fc064b] focus:outline-none focus:ring-2 focus:ring-[#fc064b]/20"
              />
            </label>

            <div class="flex justify-end">
              <button
                type="submit"
                  class="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-[#d50460] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2b4859] disabled:cursor-not-allowed disabled:opacity-60"
                [disabled]="formulario.invalid || salvando()"
              >
                <span *ngIf="!salvando(); else saving">Cadastrar produto</span>
              </button>
              <ng-template #saving>Salvando...</ng-template>
            </div>
          </form>
        </article>

  <article class="flex max-h-[50vh] flex-col gap-6 overflow-hidden rounded-lg border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/70 backdrop-blur">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-xl font-semibold text-gray-600">Estoque atual</h2>
            <span class="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {{ produtos().length }} itens
            </span>
          </div>
          <div class="flex-1 overflow-y-auto rounded-lg border border-slate-200 shadow-sm shadow-slate-200/60" *ngIf="produtos().length; else vazio">
            <table class="min-w-full divide-y divide-slate-200 text-sm">
              <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th class="px-4 py-3">Código</th>
                  <th class="px-4 py-3">Descrição</th>
                  <th class="px-4 py-3 text-right">Saldo</th>
                  <th class="px-4 py-3">Atualizado em</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white/70">
                <tr *ngFor="let produto of produtos()" class="hover:bg-slate-50/70">
                  <td class="px-4 py-3 font-mono text-sm text-slate-700">{{ produto.codigo }}</td>
                  <td class="px-4 py-3 text-slate-700">{{ produto.descricao }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-slate-900">{{ produto.saldo }}</td>
                  <td class="px-4 py-3 text-slate-500">{{ produto.criadoEmUtc | date: 'short' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #vazio>
            <div class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
              Nenhum produto cadastrado até o momento.
            </div>
          </ng-template>
        </article>
      </div>
    </section>
  `
})

export class ProductsPageComponent {
  private readonly api = inject(ApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  protected readonly produtos = signal<ProdutoResposta[]>([]);
  protected readonly salvando = signal(false);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(32)]],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    saldo: [0, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    this.carregarProdutos();
  }

  carregarProdutos(): void {
    this.api
      .listarProdutos()
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (produtos: ProdutoResposta[]) => this.produtos.set(produtos),
        error: (erro: unknown) => {
          this.toast.error('Não foi possível carregar os produtos', this.resolverErro(erro, 'Verifique sua conexão e tente novamente.'));
        }
      });
  }

  salvarProduto(): void {
    if (this.formulario.invalid || this.salvando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    const { codigo, descricao, saldo } = this.formulario.getRawValue();

    this.api
      .criarProduto({ codigo: codigo.trim(), descricao: descricao.trim(), saldo })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.salvando.set(false))
      )
      .subscribe({
        next: (produto: ProdutoResposta) => {
          this.toast.success('Produto cadastrado', `Código ${produto.codigo} disponível para faturamento.`);
          this.formulario.reset({ codigo: '', descricao: '', saldo: 0 });
          this.carregarProdutos();
        },
        error: (erro: unknown) => {
          this.toast.error('Cadastro não concluído', this.resolverErro(erro, 'Não foi possível cadastrar o produto.'));
        }
      });
  }

  private resolverErro(erro: unknown, fallback: string): string {
    return extrairMensagemErro(erro) ?? fallback;
  }
}
