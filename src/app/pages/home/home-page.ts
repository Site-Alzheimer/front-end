import { Component } from '@angular/core';
import { Hero } from '../../components/hero/hero';
import { Disclaimer } from '../../components/disclaimer/disclaimer';
import { About } from '../../components/about/about';
import { Downloads } from '../../components/downloads/downloads';
import { Team } from '../../components/team/team';
import { Sponsors } from '../../components/sponsors/sponsors';

@Component({
  selector: 'app-home-page',
  imports: [Hero, Disclaimer, About, Downloads, Team, Sponsors],
  templateUrl: './home-page.html',
})
export class HomePage {}
