import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParsingComponent } from './components/parsing/parsing.component';
import { MatchingComponent } from './components/matching/matching.component';
import { UploadComponent } from './components/upload/upload.component';
import { SearchComponent } from './components/search/search.component';
import { Router, RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CookieService } from 'ngx-cookie-service';

interface Project {
  id: number;
  date: string;
  name: string;
  summary: string;
  technologies: any[];
}

interface SearchResult {
  paragraph_id: number;
  text: string;
  tags: string[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  //standalone: true,
  styleUrls: ['./app.component.css'],
  imports: [CommonModule, ParsingComponent, MatchingComponent, UploadComponent, SearchComponent, RouterModule, MatTabsModule, MatDialogModule]
})
export class AppComponent implements OnInit {
  public projects: Project[] = [];
  selectedFile: File | null = null;
  isProcessing = false;
  selectedTabIndex = 0;
  userId: string = '';
  resumeFileName: string = '';
  showUploadDialog = false;
  showSearchResults = false;
  searchResults: any[] = [];

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private dialog: MatDialog,
    private cookieService: CookieService
  ) { }

  ngOnInit() {
    this.initializeUser();
    this.getProjects();
    const currentUrl = this.router.url;
    if (currentUrl.includes('matching')) {
      this.selectedTabIndex = 1;
    } else {
      this.selectedTabIndex = 0;
    }
  }

  initializeUser() {
    // Check if user ID exists in cookie
    this.userId = this.cookieService.get('resume_user_id');

    if (!this.userId) {
      // Create new user ID and store in cookie
      this.http.post<any>('http://localhost:7246/api/authentication/initialize', {})
        .subscribe({
          next: (response) => {
            this.userId = response.userId;
            this.cookieService.set('resume_user_id', this.userId, 365); // Store for 1 year
            console.log('New user initialized:', this.userId);
          },
          error: (error) => {
            console.error('Failed to initialize user:', error);
          }
        });
    } else {
      // Get current resume file name if user exists
      this.http.get<any>(`http://localhost:7246/api/authentication/user-info/${this.userId}`)
        .subscribe({
          next: (response) => {
            this.resumeFileName = response.resumeFileName || '';
          },
          error: (error) => {
            console.error('Failed to get user info:', error);
          }
        });
    }
  }

  openUploadDialog() {
    this.showUploadDialog = true;
  }

  closeUploadDialog() {
    this.showUploadDialog = false;
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadResume() {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('resume', this.selectedFile);
    formData.append('userId', this.userId);
    this.isProcessing = true;

    this.http.post<any>('http://localhost:7246/api/projecttimeline/upload-resume', formData)
      .subscribe({
        next: (response) => {
          console.log('Upload successful:', response);
          this.isProcessing = false;
          this.resumeFileName = this.selectedFile?.name || '';
          this.getProjects(); // Refresh projects after upload
          this.closeUploadDialog();
        },
        error: (error) => {
          console.error('Upload failed:', error);
          this.isProcessing = false;
        }
      });
  }

  getProjects() {
    this.http.get<Project[]>('http://localhost:7246/api/projecttimeline').subscribe({
      next: (result) => {
        this.projects = result;
        this.cdr.detectChanges();
        console.log('Projects received:', result);
      },
      error: (error) => {
        console.error('Error fetching projects:', error);
      }
    });
  }

  onTabChange(event: any) {
    // Navigate to the appropriate route when tab changes
    const tabIndex = event.index;
    if (tabIndex === 0) {
      this.router.navigate(['parsing']);
    } else if (tabIndex === 1) {
      this.router.navigate(['matching']);
    }
  }

  onSearchResultsReceived(results: SearchResult[]) {
    this.searchResults = results;
    this.showSearchResults = results.length > 0;
  }

  closeSearchResults() {
    this.showSearchResults = false;
  }

  title = 'resumetimeline.client';
}
