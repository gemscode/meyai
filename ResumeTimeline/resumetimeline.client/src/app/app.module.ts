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
import { BuilderComponent } from './components/builder/builder.component';
import { CompanyDialogComponent } from './components/builder/dialog/company.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CookieService } from 'ngx-cookie-service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';

const routes: Routes = [
  { path: 'parsing', component: ParsingComponent },
  { path: 'matching', component: MatchingComponent },
  { path: 'builder', component: BuilderComponent },
  { path: '', redirectTo: '/parsing', pathMatch: 'full' }
];

@NgModule({
  declarations: [
    AppComponent,
    ParsingComponent,
    MatchingComponent,
    UploadComponent,
    BuilderComponent,
    CompanyDialogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    MatTabsModule,
    MatDialogModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatOptionModule,
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
