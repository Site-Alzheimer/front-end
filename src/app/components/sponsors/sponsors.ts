import { Component } from '@angular/core';

interface Sponsor {
  name: string;
  logo: string;
  alt: string;
}

@Component({
  selector: 'app-sponsors',
  imports: [],
  templateUrl: './sponsors.html',
  styleUrl: './sponsors.css',
})
export class Sponsors {
  protected readonly sponsors: Sponsor[] = [
    { name: 'IFCE', logo: 'assets/images/ifce-logo.png', alt: 'Logo Instituto Federal do Ceará' },
    { name: 'FUNCAP', logo: 'assets/images/funcap-logo.png', alt: 'Logo FUNCAP' },
    { name: 'UnB', logo: 'assets/images/unb-logo.png', alt: 'Logo UnB' },
    { name: 'IF Goianio', logo: 'assets/images/if-goiano-logo.png', alt: 'Logo Instituto Federal Goiano' },
  ];
}