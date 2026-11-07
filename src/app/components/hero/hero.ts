import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  // Quem pede menos movimento no sistema vê a imagem parada do vídeo
  protected readonly autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
