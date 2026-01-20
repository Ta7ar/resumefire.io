import { ComponentFixture, TestBed } from '@angular/core/testing';

import { S3UrlDialogComponent } from './s3-url-dialog.component';

describe('S3UrlDialogComponent', () => {
  let component: S3UrlDialogComponent;
  let fixture: ComponentFixture<S3UrlDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [S3UrlDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(S3UrlDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
