import { Component, OnInit, OnDestroy, NgZone, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';  // Import FormsModule
import * as signalR from '@microsoft/signalr';
import * as echarts from 'echarts';

interface UploadResponse {
  folderId: string;
  fileName: string;
  fileSize: number;
  message: string;
}

interface SankeyNode {
  name: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

@Component({
  selector: 'app-parsing',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  template: `
  <div class="resume-parser">
    <div class="chart-wrapper">
      <div class="title-section">
        <div *ngIf="selectedCompanyName" class="company-summary">
          <h3>{{ selectedCompanyName }}</h3>
          <p>{{ selectedCompanySummary }}</p>
        </div>
      </div>
      <div #chartContainer style="width: 100%; height: 1200px; background-color: #000000;"></div>
    </div>
    <div *ngIf="parsedResult">
      <h3>Parsed Resume Data</h3>
      <pre>{{ parsedResult | json }}</pre>
    </div>
  </div>
  `,
  styles: [`
  .resume-parser {
    position: relative;
  }

  .chart-wrapper {
    position: relative;
  }

  .title-section {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 2;
  }

  .company-summary {
    margin-top: 10px;
    padding: 15px;
    background-color: rgba(255, 255, 255, 0.95);
    border-radius: 4px;
    max-width: 400px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .company-summary h3 {
    margin: 0 0 10px 0;
    color: #333;
  }

  .company-summary p {
    margin: 0;
    line-height: 1.5;
    color: #666;
  }
  `]
})
export class ParsingComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartContainer', { static: true })
  chartContainer!: ElementRef;
  public parsedResult: any;
  private chart: echarts.ECharts | null = null;
  isProcessing = false;
  private hubConnection!: signalR.HubConnection;
  selectedCompanyName: string = '';
  selectedCompanySummary: string = '';
  companyMap = new Map<number, string>();
  companyDescMap = new Map<number, string>();

  // New search properties

  constructor(private http: HttpClient, private ngZone: NgZone) {
    this.parsedResult = null;
    this.setupSignalRConnection();
  }

  private setupSankeyData() {
    if (!this.parsedResult?.companies || !this.parsedResult?.technology_categories) return;

    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    // Level 1: Companies
    this.parsedResult.companies.forEach((company: any, index: number) => {
      nodes.push({ name: company.name });
      this.companyMap.set(index, company.name);

      const companyExperience = this.parsedResult.experiences?.find(
        (exp: any) => exp.company === company.name
      );

      const description = companyExperience ?
        `${company.name} (${company.startDate} - ${company.endDate})\n${companyExperience.responsibilities || companyExperience.description || ''}` :
        `${company.name} (${company.startDate} - ${company.endDate})`;

      this.companyDescMap.set(index, description);
    });

    // Level 2: Projects under each company
    this.parsedResult.project_technology_links.forEach((companyProjects: any) => {
      companyProjects.projects.forEach((project: any) => {
        const projectName = `${companyProjects.company} - ${project.name}`;
        nodes.push({ name: projectName });

        // Link company to project
        links.push({
          source: companyProjects.company,
          target: projectName,
          value: 1
        });
      });
    });

    // Level 3: Technologies
    const uniqueTechnologies = new Set<string>();
    this.parsedResult.technology_categories.forEach((category: any) => {
      category.technologies.forEach((tech: string) => {
        if (!uniqueTechnologies.has(tech)) {
          uniqueTechnologies.add(tech);
          nodes.push({ name: tech });
        }
      });
    });

    // Link projects to technologies
    this.parsedResult.project_technology_links.forEach((companyProjects: any) => {
      companyProjects.projects.forEach((project: any) => {
        const projectName = `${companyProjects.company} - ${project.name}`;
        project.technologies.forEach((tech: string) => {
          links.push({
            source: projectName,
            target: tech,
            value: 1
          });
        });
      });
    });

    // Level 4: Categories
    this.parsedResult.technology_categories.forEach((category: any) => {
      nodes.push({ name: category.categoryName });

      // Link technologies to categories
      category.technologies.forEach((tech: string) => {
        links.push({
          source: tech,
          target: category.categoryName,
          value: 1
        });
      });
    });

    const option = {
      title: {
        text: 'Technology Stack Flow'
      },
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove'
      },
      series: [
        {
          type: 'sankey',
          data: nodes,
          links: links,
          emphasis: {
            focus: 'adjacency'
          },
          nodeAlign: 'left',
          layoutIterations: 100,
          nodeWidth: 35,
          nodeGap: 25,
          levels: [
            {
              depth: 0,
              itemStyle: {
                color: '#fbb4ae'
              },
              lineStyle: {
                color: 'source',
                opacity: 0.6
              },
              height: 120,
              layoutStrategy: 'vertical',
              select: {
                disabled: false
              }
            },
            {
              depth: 1,
              itemStyle: {
                color: '#b3cde3'
              },
              lineStyle: {
                color: 'source',
                opacity: 0.6
              }
            },
            {
              depth: 2,
              itemStyle: {
                color: '#ccebc5'
              },
              lineStyle: {
                color: 'source',
                opacity: 0.6
              }
            },
            {
              depth: 3,
              itemStyle: { color: '#decbe4' }  // Projects
            }
          ],

          lineStyle: {
            curveness: 0.5
          }
        }
      ]
    };

    if (this.chart) {
      this.chart.setOption(option);
      this.chart.on('click', (params: any) => {
        if (params.dataType === 'node') {

          this.ngZone.run(() => {
            this.selectedCompanyName = this.companyMap.get(params.dataIndex) ?? '';
            this.selectedCompanySummary = this.companyDescMap.get(params.dataIndex) ?? '';
          });
        }
      });
    }
  }


  private getCompanySummary(company: any): string {
    // Find the company's experience in the parsed result
    const experience = this.parsedResult.experiences?.find(
      (exp: any) => exp.company === company.name
    );

    if (experience) {
      return `${company.name} (${company.startDate} - ${company.endDate})
    ${experience.description || experience.responsibilities || ''}`;
    }

    return `${company.name} (${company.startDate} - ${company.endDate})`;
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
      } catch (err) {
        console.error('SignalR Connection Error:', err);
        setTimeout(startConnection, 5000);
      }
    };

    startConnection();
    this.hubConnection.on('ProcessingComplete', (folderId: string, result: string) => {
      this.ngZone.run(() => {
        this.isProcessing = false;
        this.parsedResult = JSON.parse(result);
        this.setupSankeyData();
      });
    });
  }

  ngOnInit() {
    window.addEventListener('resize', () => {
      if (this.chart) {
        this.chart.resize();
      }
    });
  }

  ngAfterViewInit() {
    if (this.chartContainer) {
      this.chart = echarts.init(this.chartContainer.nativeElement);
      if (this.parsedResult) {
        this.setupSankeyData();
      }
    }
  }

  ngOnDestroy() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
    if (this.chart) {
      this.chart.dispose();
    }
  }
}

