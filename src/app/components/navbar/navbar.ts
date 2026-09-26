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
  protected readonly activeSection = signal('inicio');
  private lastScrollY = 0;

  protected readonly links = [
    { label: 'Início', fragment: 'inicio' },
    { label: 'Sobre', fragment: 'sobre' },
    { label: 'Diagnóstico', fragment: 'diagnostico' },
    { label: 'Equipe', fragment: 'equipe' },
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

  protected selectSection(fragment: string): void {
    this.activeSection.set(fragment);
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
    // Fora da home, a análise pertence à seção "Diagnóstico"
    if (
      !this.router.url.startsWith('/#') &&
      this.router.url !== '/' &&
      !this.router.url.startsWith('/?')
    ) {
      this.activeSection.set('diagnostico');
      return;
    }
    const current = [...this.links]
      .reverse()
      .map((link) => document.getElementById(link.fragment))
      .find((section) => section !== null && section.getBoundingClientRect().top <= 160);
    const id = current?.id ?? 'inicio';
    if (id !== this.activeSection()) this.activeSection.set(id);
  }
}
