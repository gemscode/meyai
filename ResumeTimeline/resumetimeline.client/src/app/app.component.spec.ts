import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should retrieve projects from the server', () => {
    const mockProjects = [
      { id: 1, date: '2021-10-01', name: "20", summary: 'Mild', technologies: [] },
      { id: 2, date: '2021-10-02', name: "25", summary: 'Warm', technologies: [] }
    ];

    component.ngOnInit();

    const req = httpMock.expectOne('/api/projectstimeline');
    expect(req.request.method).toEqual('GET');
    req.flush(mockProjects);

    expect(component.projects).toEqual(mockProjects);
  });
});
