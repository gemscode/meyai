import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SearchResult {
  paragraph_id: number;
  text: string;
  tags: string[];
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-container">
      <input type="text" 
             [(ngModel)]="searchKeyword" 
             placeholder="Enter search keyword" 
             (keyup.enter)="search()" />
      <button (click)="search()">Search</button>
    </div>
  `,
  styles: [`
    .search-container {
      display: flex;
      align-items: center;
    }

    .search-container input[type="text"] {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-right: 10px;
      width: 200px;
    }

    .search-container button {
      padding: 8px 15px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .search-container button:hover {
      background-color: #0056b3;
    }
  `]
})
export class SearchComponent implements OnInit {
  searchKeyword: string = '';
  @Output() searchResultsChange = new EventEmitter<SearchResult[]>();

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
  }

  search() {
    if (this.searchKeyword) {
      this.http.get<SearchResult[]>('http://localhost:7246/api/ProjectTimeline/search', {
        params: { keyword: this.searchKeyword }
      }).subscribe(results => {
        this.searchResultsChange.emit(results);
      });
    } else {
      this.searchResultsChange.emit([]);
    }
  }
}
