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
    { label: 'Início', fragment: 'inicio' },
    { label: 'Sobre', fragment: 'sobre' },
    { label: 'Diagnóstico', fragment: 'diagnostico' },
    { label: 'Equipe', fragment: 'equipe' },
  ];
}
