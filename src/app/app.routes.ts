import { Routes } from '@angular/router';

export const routes: Routes = [
  // A tela inicial já é a de análise: envio do exame e carrossel de exemplos
  {
    path: '',
    loadComponent: () => import('./pages/analysis/analysis-page').then((m) => m.AnalysisPage),
    title: 'NeuroIA',
  },
  {
    path: 'sobre',
    loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage),
    title: 'Sobre · NeuroIA',
  },
  { path: 'analise', redirectTo: '' },
  { path: '**', redirectTo: '' },
];
