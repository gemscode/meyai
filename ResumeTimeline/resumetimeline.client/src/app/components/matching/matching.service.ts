import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface MatchResult {
  match_percentage: number;
  top_matches: { criterion: string; percentage: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class MatchingService {
  private apiUrl = 'http://localhost:7246/api/matching/match';

  constructor(private http: HttpClient) { }

  postMatchingRequest(jobDescription: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { jobDescription });
  }
}
