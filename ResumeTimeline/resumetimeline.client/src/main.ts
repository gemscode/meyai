import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideRouter([]), provideAnimationsAsync('noop'), provideAnimationsAsync('noop'), provideAnimationsAsync() // Add your routes here if needed
  ]
})
  .catch(err => console.error(err));

