import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, NgZone, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import * as echarts from 'echarts';
import { MatchingService } from './matching.service';
import * as signalR from '@microsoft/signalr';

interface MatchResult {
  match_percentage: number;
  top_matches: { criterion: string; percentage: number }[];
}

@Component({
  selector: 'app-matching',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="matching-component">
      <h2>Resume/Job Description Matching</h2>
      <div class="input-section">
        <label for="jobDescription">Job Description:</label>
        <textarea id="jobDescription" [(ngModel)]="jobDescription" rows="10" cols="50"></textarea>
        <button (click)="submitMatching()">Submit</button>
      </div>

      <div *ngIf="matchResult" class="results-section">
        <div #histogramChart style="width:100%; height:400px;"></div>
        <div class="matches-explanation">
          <h3>Top Matches Explanation</h3>
          <div *ngFor="let match of matchResult.top_matches">
            <p>{{match.criterion}}: {{match.percentage}}%</p>
          </div>
        </div>
      </div>
      <div *ngIf="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .matching-component {
      padding: 20px;
      font-family: Arial, sans-serif;
    }

    .matching-component h2 {
      color: #333;
    }

    .matching-component .input-section {
      margin-bottom: 20px;
    }

    .matching-component .input-section label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }

    .matching-component .input-section textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 10px;
    }

    .matching-component .input-section button {
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .matching-component .input-section button:hover {
      background-color: #0056b3;
    }

    .matching-component .results-section {
      margin-top: 20px;
    }

    .matching-component .matches-explanation {
      margin-top: 20px;
      padding: 15px;
      background-color: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 4px;
    }

    .matching-component .matches-explanation h3 {
      margin-bottom: 10px;
      color: #333;
    }

    .matching-component .matches-explanation p {
      margin: 5px 0;
      color: #666;
    }

    .matching-component .error-message {
      color: red;
      margin-top: 10px;
    }
  `]
})
export class MatchingComponent implements OnInit, AfterViewInit, OnDestroy {
  jobDescription: string = '';
  matchResult: MatchResult | null = null;
  errorMessage: string | null = null;
  @ViewChild('histogramChart', { static: false }) histogramChart: ElementRef | undefined;
  private chart: any;
  private hubConnection!: signalR.HubConnection;

  constructor(private matchingService: MatchingService, private ngZone: NgZone) {
    this.setupSignalRConnection();
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    if (this.histogramChart) {
      this.chart = echarts.init(this.histogramChart.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.hubConnection) {
      this.hubConnection.off("MatchingComplete");
      this.hubConnection.stop();
    }
  }

  submitMatching() {
    this.matchingService.postMatchingRequest(this.jobDescription).subscribe({
      next: () => console.log('Matching request submitted successfully'),
      error: (error) => {
        console.error('Error submitting matching request:', error);
        this.errorMessage = 'Failed to submit matching request: ' + error.message;
      }
    });
  }
  
  private setupSignalRConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:7246/notificationHub', { 
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .configureLogging(signalR.LogLevel.Debug)
      .withAutomaticReconnect()
      .build();

    const startConnection = async () => {
      try {
        await this.hubConnection.start();
        console.log('SignalR Connected');
        this.hubConnection.on('MatchingComplete', (result: MatchResult) => {
          this.ngZone.run(() => {
            this.matchResult = result;
            this.errorMessage = null;
            this.updateChart(result);
          });
        });

      } catch (err) {
        console.error('SignalR Connection Error:', err);
        setTimeout(startConnection, 5000);
      }
    };

    startConnection();
  }

  updateChart(result: MatchResult) {
    const chartDom = this.histogramChart?.nativeElement;
    if (!chartDom) {
      console.error('Chart container not found');
      return;
    }

    const chart = echarts.init(chartDom);

    const option = {
      xAxis: {
        type: 'category',
        data: result.top_matches.map(match => match.criterion),
        axisLabel: {
          interval: 0,
          rotate: 45,
          inside: false,
          align: 'right',
          verticalAlign: 'middle',
          fontSize: 12,
          color: '#333'
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [{
        data: result.top_matches.map(match => match.percentage),
        type: 'bar',
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%'
        },
        itemStyle: {
          color: '#5470c6'
        }
      }],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function (params: any) {
          const match = result.top_matches[params[0].dataIndex];
          return `${match.criterion}: ${match.percentage}%`;
        }
      }
    };

    option && chart.setOption(option);
  }
}
