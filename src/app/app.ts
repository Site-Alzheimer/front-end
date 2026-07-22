import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Hero } from './components/hero/hero';
import { Disclaimer } from './components/disclaimer/disclaimer';
import { About } from './components/about/about';
import { Inference } from './components/inference/inference';
import { Downloads } from './components/downloads/downloads';
import { Footer } from './components/footer/footer';
import { Sponsors } from './components/sponsors/sponsors';
import { Team } from './components/team/team';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Navbar,
    Hero,
    Disclaimer,
    About,
    Inference,
    Downloads,
    Team,
    Sponsors,
    Footer,
  ],

  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
