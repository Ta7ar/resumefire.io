import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScribbleLoaderComponent } from './scribble-loader.component';

describe('ScribbleLoaderComponent', () => {
  let component: ScribbleLoaderComponent;
  let fixture: ComponentFixture<ScribbleLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScribbleLoaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScribbleLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
