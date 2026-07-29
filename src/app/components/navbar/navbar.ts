import { Component, HostListener, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [UpperCasePipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  protected readonly menuOpen = signal(false);
  protected readonly hidden = signal(false);
  protected readonly activeSection = signal('inicio');
  private lastScrollY = 0;

  protected readonly links = [
    { label: 'Início', href: '#inicio' },
    { label: 'Sobre', href: '#sobre' },
    { label: 'Diagnóstico', href: '#diagnostico' },
    { label: 'Equipe', href: '#equipe' },
  ];

  protected toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  protected selectSection(href: string): void {
    this.activeSection.set(href.slice(1));
    this.menuOpen.set(false);
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    const currentScrollY = window.scrollY;

    this.hidden.set(currentScrollY > this.lastScrollY && currentScrollY > 72);
    this.lastScrollY = currentScrollY;
    this.updateActiveSection();
  }

  private updateActiveSection(): void {
    const sections = this.links
      .map((link) => document.querySelector<HTMLElement>(link.href))
      .filter((section): section is HTMLElement => section !== null);

    const current = [...sections]
      .reverse()
      .find((section) => section.getBoundingClientRect().top <= 160);

    this.activeSection.set(current?.id ?? 'inicio');
  }
}
