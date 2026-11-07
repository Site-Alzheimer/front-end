import { Component } from '@angular/core';
import { Icon } from '../../shared/icon/icon';

interface TeamMember {
  name: string;
  role?: string;
  icon?: string;
  linkedin?: string;
  lattes?: string;
}

interface TeamGroup {
  title: string;
  members: TeamMember[];
}

@Component({
  selector: 'app-team',
  imports: [Icon],
  templateUrl: './team.html',
  styleUrl: './team.css',
})
export class Team {
  // Duas colunas: Infraestrutura fica embaixo de Construção do Site. Falta o papel do Daniel
  protected readonly columns: TeamGroup[][] = [
    [
      {
        title: 'Construção do Site',
        members: [
          {
            name: 'Diego da Silva Ribeiro',
            role: 'Interface, API e implantação do site',
            linkedin: 'https://www.linkedin.com/in/diegoribeiroo/',
          },
          {
            name: 'Daniel Fernandes Noronha',
            linkedin: 'https://www.linkedin.com/in/daniel-fernandes-noronha/',
          },
        ],
      },
      {
        title: 'Infraestrutura',
        members: [
          {
            name: 'IFCE · Campus Limoeiro do Norte',
            role: 'Servidor que hospeda o site',
            icon: 'server',
          },
        ],
      },
    ],
    [
      {
        title: 'Pesquisa',
        members: [
          {
            name: 'Raimundo Guimarães Saraiva Junior',
            lattes: 'http://lattes.cnpq.br/8188933195724181',
          },
          {
            name: 'Tony Alexandre Medeiros da Silva',
            lattes: 'http://lattes.cnpq.br/6641598094313753',
          },
          {
            name: 'Ana Gláucia Sombra Saraiva',
            lattes: 'http://lattes.cnpq.br/3971331746026369',
          },
          {
            name: 'Aldemir Girão da Silva Junior',
            lattes: 'http://lattes.cnpq.br/5360315236460509',
          },
          {
            name: 'Francisco Herik Saldanha Rodrigues',
            lattes: 'http://lattes.cnpq.br/8638055741341892',
          },
          {
            name: 'Francisco Assis de Oliveira Nascimento',
            lattes: 'http://lattes.cnpq.br/3269842674142738',
          },
        ],
      },
    ],
  ];
}
