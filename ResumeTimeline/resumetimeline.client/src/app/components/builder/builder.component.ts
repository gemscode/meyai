import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { CompanyDialogComponent } from './dialog/company.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule } from '@angular/forms';

interface Company {
  id: number;
  name: string;
  fromDate?: string;
  toDate?: string;
  isCurrent?: boolean;
}

@Component({
  selector: 'app-builder',
  templateUrl: './builder.component.html',
  styleUrls: ['./builder.component.css'],
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatIconModule,
    MatFormFieldModule,
    MatOptionModule,
    MatSelectModule,
    ReactiveFormsModule
  ]
})
export class BuilderComponent implements OnInit {
  companies: Company[] = [];
  experienceForm: FormGroup;
  refinedExperience: any = null;
  isProcessing = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private dialog: MatDialog
  ) {
    this.experienceForm = this.fb.group({
      companyId: [null, Validators.required],
      title: [''],
      description: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.http.get<Company[]>('http://localhost:7246/api/companies').subscribe({
      next: (companies) => {
        this.companies = companies;
      },
      error: (error) => {
        console.error('Error loading companies:', error);
      }
    });
  }

  openCompanyDialog(): void {
    const dialogRef = this.dialog.open(CompanyDialogComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.http.post<Company>('http://localhost:7246/api/companies', result).subscribe({
          next: (newCompany) => {
            this.companies.push(newCompany);
            this.experienceForm.patchValue({ companyId: newCompany.id });
          },
          error: (error) => {
            console.error('Error creating company:', error);
          }
        });
      }
    });
  }

  produceRefinedExperience(): void {
    if (this.experienceForm.invalid) {
      return;
    }

    this.isProcessing = true;
    const formData = this.experienceForm.value;

    // Find company details
    const company = this.companies.find(c => c.id === formData.companyId);

    const requestData = {
      company: company?.name,
      title: formData.title,
      description: formData.description
    };

    this.http.post<any>('http://localhost:7246/api/experiences/refine', requestData).subscribe({
      next: (response) => {
        this.refinedExperience = response;
        this.isProcessing = false;
      },
      error: (error) => {
        console.error('Error refining experience:', error);
        this.isProcessing = false;
      }
    });
  }

  saveExperience(): void {
    if (!this.refinedExperience) {
      return;
    }

    const formData = this.experienceForm.value;
    const company = this.companies.find(c => c.id === formData.companyId);

    const experienceData = {
      companyId: formData.companyId,
      title: formData.title,
      originalDescription: formData.description,
      refinedDescription: this.refinedExperience.description
    };

    this.http.post<any>('http://localhost:7246/api/experiences', experienceData).subscribe({
      next: (response) => {
        // Reset form and refined experience
        this.experienceForm.reset();
        this.refinedExperience = null;
      },
      error: (error) => {
        console.error('Error saving experience:', error);
      }
    });
  }

  getCompanyName(): string {
    const companyId = this.experienceForm.get('companyId')?.value;
    if (!companyId) return '';

    const company = this.companies.find(c => c.id === companyId);
    return company?.name || '';
  }


  furtherRefine(): void {
    if (!this.refinedExperience) {
      return;
    }

    const formData = this.experienceForm.value;

    const requestData = {
      company: this.companies.find(c => c.id === formData.companyId)?.name,
      title: formData.title,
      description: this.refinedExperience.description,
      furtherInstructions: "Make it more concise and professional"
    };

    this.isProcessing = true;
    this.http.post<any>('http://localhost:7246/api/experiences/refine', requestData).subscribe({
      next: (response) => {
        this.refinedExperience = response;
        this.isProcessing = false;
      },
      error: (error) => {
        console.error('Error refining experience:', error);
        this.isProcessing = false;
      }
    });
  }

  clearRefinement(): void {
    this.refinedExperience = null;
  }
}
