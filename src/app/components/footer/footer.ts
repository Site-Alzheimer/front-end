import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, Icon],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  protected readonly currentYear = new Date().getFullYear();

  protected readonly topicLinks = [
    { label: 'Análise', route: '/', fragment: undefined },
    { label: 'Sobre', route: '/sobre', fragment: undefined },
    { label: 'Equipe', route: '/sobre', fragment: 'equipe' },
  ];

  protected backToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
