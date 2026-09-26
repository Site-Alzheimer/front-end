import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    // XHR (padrão) em vez de fetch: é o que informa o progresso do upload
    provideHttpClient(),
    // a navbar fixa tem 72px; a rolagem para âncoras do router ignora o scroll-padding do CSS
    provideAppInitializer(() => inject(ViewportScroller).setOffset([0, 72])),
  ],
};
