import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  ViewChild,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButton } from '@angular/material/button';

import { MatDialog } from '@angular/material/dialog';
import { ResumeService } from '../../services/resume.service';
import { BoundingBox } from '../../services/resume.service';
import * as pdf from 'pdfjs-dist';
import { SelectionModel } from '@angular/cdk/collections';
import { LoaderComponent } from '../loader/loader.component';
import { UrlDialogComponent } from './url-dialog/url-dialog.component';
import { ObjectUrlStorageService } from '../../services/object-url-storage.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-redaction',
  imports: [
    MatIconModule,
    MatButton,
    MatCardModule,
    LoaderComponent,
    UrlDialogComponent,
  ],
  templateUrl: './redaction.component.html',
  styleUrl: './redaction.component.css',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedactionComponent {
  readonly dialog = inject(MatDialog);
  @ViewChild('resumeView', { static: true })
  resumeViewCanvas?: ElementRef<HTMLCanvasElement>;

  svgViewBox?: string;

  resume?: File;
  boundingBoxes: BoundingBox[] | null = null;
  selectedBoundingBoxes: SelectionModel<BoundingBox> = new SelectionModel(true);

  pageCountExceedLimit = signal<boolean>(false);
  loadingBoundingBoxes = signal<boolean>(false);
  loadingRedactedPdf = signal<boolean>(false);
  private resumeService = inject(ResumeService);
  private objectUrlStorageService = inject(ObjectUrlStorageService);

  onResumeSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) throw Error('No resume selected');
    this.resume = file;
    this.boundingBoxes = null;
    this.displayResume(this.resumeViewCanvas!.nativeElement, this.resume);
    this.selectedBoundingBoxes.clear();
  }

  displayResume(canvas: HTMLCanvasElement, resume: File) {
    let context = canvas.getContext('2d');
    if (!context) throw new Error('canvas context is null or undefined');

    let fileReader = new FileReader();
    var self = this;
    fileReader.onload = function () {
      let typedarray = new Uint8Array(fileReader.result as ArrayBuffer);
      let pdfjsLoadingTask = pdf.getDocument(typedarray);
      pdfjsLoadingTask.promise.then((pdf) => {
        if (pdf.numPages > 1){
          self.pageCountExceedLimit.set(true)
        } else {
          self.pageCountExceedLimit.set(false)
        }
        pdf.getPage(1).then(function (page) {
          // canvas.style.height = "360px";
          canvas.style.width = '100%';
          var scale = 3.5;
          var viewport = page.getViewport({ scale });
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          page.render({ canvasContext: context, viewport: viewport });
        });
      });
    };
    fileReader.readAsArrayBuffer(resume);
  }

  drawBoundingBoxes() {
    // marks component as dirty
    this.loadingBoundingBoxes.set(true);
    this.resumeService.getBoundingBoxes(this.resume!)
      .pipe(finalize(() => {
        this.loadingBoundingBoxes.set(false);
      }))
      .subscribe(
        (res) => {
          let parsed_page_info = res;
          // drawing only the bounding boxes on the first page for now
          // TODO: support multiple pages/pagination in the future

          // this line does not trigger change detection
          this.boundingBoxes = parsed_page_info.boxes;
          let [originalDocHeight, originalDocWidth] = parsed_page_info.dimensions;

          this.svgViewBox = `0 0 ${originalDocWidth} ${originalDocHeight}`;
        }
      )
  }

  submitSelectedBoundingBoxes() {
    if (this.resume === undefined) {
      throw new Error('Resume not selected');
    }
    this.loadingRedactedPdf.set(true);
    this.resumeService
      .postBoundingBoxes(this.resume, this.selectedBoundingBoxes.selected)
      .pipe(finalize(() => {
        this.selectedBoundingBoxes.clear();
        this.loadingRedactedPdf.set(false);
      }))
      .subscribe(
        (res) => {
          const imageUrl = res.headers.get('Location');
          if (imageUrl == null) {
            throw new Error("Redaction response missing 'Location' header");
          }
          this.objectUrlStorageService.saveObjectUrl(imageUrl)
          this.openShareableUrlDialog(imageUrl);
        }
      )
  }

  openShareableUrlDialog(url: string) {
    const dialogRef = this.dialog.open(UrlDialogComponent, {
      data: {
        url,
      },
      disableClose: true,
      autoFocus: true,
      minHeight: 'fit-content',
      minWidth: '560px',
      enterAnimationDuration: '300ms',
      exitAnimationDuration: '300ms'
      // height: "100%",
      // maxHeight: "100% !important"
    });
  }
}
