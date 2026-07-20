import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Hero } from './components/hero/hero';
import { Disclaimer } from './components/disclaimer/disclaimer';
import { About } from './components/about/about';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Hero, Disclaimer, About],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
