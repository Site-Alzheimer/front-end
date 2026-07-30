import { Component } from '@angular/core';

type TeamGroup = 'desenvolvimento' | 'pesquisa';

interface TeamMember {
  name: string;
  role: string;
  team: TeamGroup;
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
    { name: 'Saraiva', role: 'Responsabilidades', team: 'desenvolvimento', highlight: true },
    { name: 'Diego', role: 'Responsabilidades', team: 'desenvolvimento' },
    { name: 'Daniel', role: 'Responsabilidades', team: 'desenvolvimento' },
    { name: 'Erik', role: 'Responsabilidades', team: 'desenvolvimento' },
    { name: 'Nome da pessoa', role: 'Responsabilidades', team: 'pesquisa', highlight: true },
    { name: 'Nome da pessoa', role: 'Responsabilidades', team: 'pesquisa' },
    { name: 'Nome da pessoa', role: 'Responsabilidades', team: 'pesquisa' },
    { name: 'Nome da pessoa', role: 'Responsabilidades', team: 'pesquisa' },
  ];

  protected readonly developmentTeam: TeamMember[] = this.members.filter(
    (member) => member.team === 'desenvolvimento',
  );

  protected readonly researchTeam: TeamMember[] = this.members.filter(
    (member) => member.team === 'pesquisa',
  );
}