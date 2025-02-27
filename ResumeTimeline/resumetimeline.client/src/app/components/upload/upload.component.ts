import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css'],
  imports: [CommonModule],
  standalone: true
})
export class UploadComponent {
  @Input() userId: string = '';
  @Output() fileSelected = new EventEmitter<File>();

  selectedFile: File | null = null;
  isProcessing = false;
  uploadMessage: string = '';

  constructor(private http: HttpClient) { }

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedFile = target.files[0];
      this.fileSelected.emit(this.selectedFile);
    }
  }

  uploadResume() {
    if (!this.selectedFile || !this.userId) return;

    const formData = new FormData();
    formData.append('resume', this.selectedFile);
    formData.append('userId', this.userId);
    this.isProcessing = true;

    this.http.post<any>('http://localhost:7246/api/projecttimeline/upload-resume', formData)
      .subscribe({
        next: (response) => {
          console.log('Upload successful:', response);
          this.isProcessing = false;
          this.uploadMessage = response.message;
        },
        error: (error) => {
          console.error('Upload failed:', error);
          this.isProcessing = false;
          this.uploadMessage = 'Upload failed: ' + error.message;
        }
      });
  }
}
