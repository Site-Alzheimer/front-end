import { Component } from '@angular/core';

interface TeamMember {
  name: string;
  role: string;
  highlight?: boolean;
}

@Component({
  selector: 'app-team',
  imports: [],
  templateUrl: './team.html',
  styleUrl: './team.css',
})
export class Team {
  protected readonly members: TeamMember[] = [
    { name: 'Saraiva', role: 'Responsabilidades', highlight: true },
    { name: 'Nome da pessoa', role: 'Responsabilidades' },
    { name: 'Nome da pessoa', role: 'Responsabilidades' },
    { name: 'Nome da pessoa', role: 'Responsabilidades' },
    { name: 'Nome da pessoa', role: 'Responsabilidades' },
    { name: 'Nome da pessoa', role: 'Responsabilidades' },
    { name: 'Nome da pessoa', role: 'Responsabilidades' },
    { name: 'Nome da pessoa', role: 'Responsabilidades' },
  ];
}