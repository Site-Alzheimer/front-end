import { Component, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [UpperCasePipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  protected readonly menuOpen = signal(false);

  protected readonly links = [
    { label: 'Início', href: '#inicio' },
    { label: 'Sobre', href: '#sobre' },
    { label: 'Diagnóstico', href: '#diagnostico' },
    { label: 'Equipe', href: '#equipe' },
  ];

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }
}
