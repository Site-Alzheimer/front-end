import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [UpperCasePipe, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);
  protected readonly hidden = signal(false);
  protected readonly activeSection = signal('analise');
  private lastScrollY = 0;

  // A análise é a tela inicial (/); o resto do site fica em /sobre
  protected readonly links = [
    { id: 'analise', label: 'Análise', route: '/', fragment: undefined },
    { id: 'sobre', label: 'Sobre', route: '/sobre', fragment: undefined },
    { id: 'equipe', label: 'Equipe', route: '/sobre', fragment: 'equipe' },
  ];

  constructor() {
    // Listener passivo e fora do template: no modo zoneless, um @HostListener de scroll
    // agendaria detecção de mudanças da aplicação inteira a cada evento.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const onScroll = () => this.onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
      this.onScroll();
    });
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.onScroll());
  }

  protected toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  protected selectSection(id: string): void {
    this.activeSection.set(id);
    this.menuOpen.set(false);
  }

  private onScroll(): void {
    const currentScrollY = window.scrollY;
    const hidden = currentScrollY > this.lastScrollY && currentScrollY > 72;
    if (hidden !== this.hidden()) this.hidden.set(hidden);
    this.lastScrollY = currentScrollY;
    this.updateActiveSection();
  }

  private updateActiveSection(): void {
    // Em /sobre, "Equipe" acende quando a seção chega ao topo; fora dela, tudo é análise
    let id = 'analise';
    if (this.router.url.startsWith('/sobre')) {
      const equipe = document.getElementById('equipe');
      id = equipe !== null && equipe.getBoundingClientRect().top <= 160 ? 'equipe' : 'sobre';
    }
    if (id !== this.activeSection()) this.activeSection.set(id);
  }
}
