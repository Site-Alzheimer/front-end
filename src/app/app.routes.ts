import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home-page';

export const routes: Routes = [
  { path: '', component: HomePage, title: 'NeuroIA' },
  {
    path: 'analise',
    loadComponent: () => import('./pages/analysis/analysis-page').then((m) => m.AnalysisPage),
    title: 'Análise · NeuroIA',
  },
  { path: '**', redirectTo: '' },
];
