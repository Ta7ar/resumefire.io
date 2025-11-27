import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { NgFor, NgIf } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ResumeService } from '../../services/resume.service';
import { BoundingBox } from '../../services/resume.service';
import * as pdf from 'pdfjs-dist';
import { SelectionModel } from '@angular/cdk/collections';
import { LoaderComponent } from '../loader/loader.component';
import { BaseException } from 'pdfjs-dist/types/src/shared/util';

@Component({
  selector: 'app-redaction',
  standalone: true,
  imports: [MatIconModule, MatButton, NgIf, MatCardModule, NgFor, LoaderComponent],
  templateUrl: './redaction.component.html',
  styleUrl: './redaction.component.css',
})
export class RedactionComponent {
  readonly dialog = inject(MatDialog);
  @ViewChild('resumeView', { static: true }) resumeViewCanvas?: ElementRef<HTMLCanvasElement>;

  svgViewBox?: string;

  resume?: File;
  boundingBoxes: BoundingBox[] | null = null;
  selectedBoundingBoxes: SelectionModel<BoundingBox> = new SelectionModel(true);
  loadingBoundingBoxes: boolean = false;

  constructor(
    public resumeService: ResumeService
  ) { }

  onResumeSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) throw Error('No resume selected')
    // this.resumeService.resume = file;
    this.resume = file;
    this.boundingBoxes = null;
    this.displayResume(this.resumeViewCanvas!.nativeElement, this.resume);
    this.selectedBoundingBoxes.clear();
  }

  displayResume(canvas: HTMLCanvasElement, resume: File) {
    let context = canvas.getContext('2d');
    if (!context) throw new Error("canvas context is null or undefined");

    let fileReader = new FileReader();
    fileReader.onload = function () {
      let typedarray = new Uint8Array(fileReader.result as ArrayBuffer);
      let pdfjsLoadingTask = pdf.getDocument(typedarray);

      pdfjsLoadingTask.promise.then(function (pdf) {
        pdf.getPage(1).then(function (page) {
          // canvas.style.height = "360px";
          canvas.style.width = "100%";
          var scale = 3.5;
          var viewport = page.getViewport({ scale });
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          page.render({ canvasContext: context, viewport: viewport });
        });
      });
    }
    fileReader.readAsArrayBuffer(resume);
  }


  drawBoundingBoxes() {
    this.loadingBoundingBoxes = true
    this.resumeService.getBoundingBoxes(this.resume!).subscribe((res) => {
      let parsed_page_info = res

      // drawing only the bounding boxes on the first page for now
      // TODO: support multiple pages/pagination in the future
      this.boundingBoxes = parsed_page_info.boxes;
      let [originalDocHeight, originalDocWidth] = parsed_page_info.dimensions;

      this.svgViewBox = `0 0 ${originalDocWidth} ${originalDocHeight}`;
    }).add(() => this.loadingBoundingBoxes = false)
  }

  submitSelectedBoundingBoxes(){
    if (this.resume === undefined){
      throw new Error("Resume not selected")
    }
    this.resumeService.postBoundingBoxes(this.resume, this.selectedBoundingBoxes.selected).subscribe((res) => {
      console.log(res)
    })
  }

}
