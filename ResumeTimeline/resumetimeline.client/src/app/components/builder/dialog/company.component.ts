import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dialog-company',
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
  ]
})
export class CompanyDialogComponent {
  companyForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CompanyDialogComponent>
  ) {
    this.companyForm = this.fb.group({
      name: ['', Validators.required],
      fromDate: [''],
      toDate: [''],
      isCurrent: [false]
    });

    // Disable toDate when isCurrent is true
    this.companyForm.get('isCurrent')?.valueChanges.subscribe(isCurrent => {
      const toDateControl = this.companyForm.get('toDate');
      if (isCurrent) {
        toDateControl?.disable();
        toDateControl?.setValue(null);
      } else {
        toDateControl?.enable();
      }
    });
  }

  onSubmit(): void {
    if (this.companyForm.valid) {
      this.dialogRef.close(this.companyForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
