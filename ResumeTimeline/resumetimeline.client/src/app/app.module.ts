import { HttpClientModule } from '@angular/common/http';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { UploadComponent } from './components/upload/upload.component';
import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { CacheControlService } from "./services/cache.control.service";
import { ParsingComponent } from './components/parsing/parsing.component';
import { MatchingComponent } from './components/matching/matching.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CookieService } from 'ngx-cookie-service';

const routes: Routes = [
  { path: 'parsing', component: ParsingComponent },
  { path: 'matching', component: MatchingComponent },
  { path: '', redirectTo: '/parsing', pathMatch: 'full' }
];

@NgModule({
  declarations: [
    AppComponent,
    ParsingComponent,
    MatchingComponent,
    UploadComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    MatTabsModule,
    MatDialogModule,
    MatButtonModule,
    RouterModule.forRoot(routes)
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    CookieService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CacheControlService,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
