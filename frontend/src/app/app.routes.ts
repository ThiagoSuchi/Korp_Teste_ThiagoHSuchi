import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'produtos' },
  {
    path: 'produtos',
    loadComponent: () => import('./components/products-page.component').then(m => m.ProductsPageComponent)
  },
  {
    path: 'notas-fiscais',
    loadComponent: () => import('./components/invoices-page.component').then(m => m.InvoicesPageComponent)
  },
  { path: '**', redirectTo: 'produtos' }
];
