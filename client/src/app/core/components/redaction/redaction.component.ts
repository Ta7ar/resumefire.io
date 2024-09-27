import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { NgFor, NgIf } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ResumeService } from '../../services/resume.service';
import { BoundingBox } from '../../services/resume.service';
import * as pdf from 'pdfjs-dist';
import * as math from 'mathjs';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  selector: 'app-redaction',
  standalone: true,
  imports: [MatIconModule, MatButton, NgIf, MatCardModule, NgFor],
  templateUrl: './redaction.component.html',
  styleUrl: './redaction.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedactionComponent {
  readonly dialog = inject(MatDialog);
  @ViewChild('resumeView', { static: true }) resumeViewCanvas?: ElementRef<HTMLCanvasElement>;

  svgViewBox?: string;

  resume?: File;
  boundingBoxes: BoundingBox[] | null = null;
  drawnBoundingBoxPoints: number[][][] = [];
  selectedBoundingBoxes: SelectionModel<BoundingBox> = new SelectionModel(true);

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

  private generateCornerCoords(boxes: BoundingBox[]) {
    return boxes.map(([x, y, w, h]) =>

      math.matrix([
        [x, x + w, x, x + w],
        [y, y, y + h, y + h]
      ])
    )
  }

  defineRect(context: CanvasRenderingContext2D, points: number[][]) {
    context.beginPath();

    // top left
    context.moveTo(points[0][0], points[0][1]);

    // top right
    context.lineTo(points[1][0], points[1][1]);

    // bottom right
    context.lineTo(points[3][0], points[3][1]);

    // bottom left
    context.lineTo(points[2][0], points[2][1]);

    // back to top left
    context.lineTo(points[0][0], points[0][1]);
  }

  drawBoundingBox(canvas: HTMLCanvasElement, coords: math.Matrix) {
    coords = math.transpose(coords);
    let points: number[][] = coords.toArray().map(point => point.valueOf() as number[]);
    let context = canvas.getContext('2d');
    if (!context) throw new Error("canvas context is null or undefined");

    // set styles
    context.strokeStyle = "#da3c3f";
    context.lineWidth = 2;

    this.defineRect(context, points);

    context.stroke();
    this.drawnBoundingBoxPoints.push(points);
  }

  drawBoundingBoxes() {
    this.resumeService.getBoundingBoxes(this.resume!).subscribe((res) => {
      this.boundingBoxes = res.boxes;
      let [originalDocHeight, originalDocWidth] = res.dimensions;

      this.svgViewBox = `0 0 ${originalDocWidth} ${originalDocHeight}`;

      // let rectCoords = this.generateCornerCoords(res.boxes);
      // let { width: canvasWidth, height: canvasHeight } = this.resumeViewCanvas?.nativeElement!;

      // let canvasCoords = math.matrix([[canvasWidth!, 0], [0, canvasHeight!]])

      // let [originalDocHeight, originalDocWidth] = res.dimensions;

      // let originalDocCoordsInv = math.inv(math.matrix([[originalDocWidth, 0], [0, originalDocHeight]]))

      // let transformationMatrix = math.multiply(canvasCoords, originalDocCoordsInv)

      // let rectCoordsTransformed = rectCoords.map(rect => math.multiply(transformationMatrix, rect))

      // for (let rectCoord of rectCoordsTransformed) {
      //   this.drawBoundingBox(this.resumeViewCanvas!.nativeElement, rectCoord);
      // }

    })
  }

  onMouseHover(event: MouseEvent) {
    event.preventDefault();

    if (!this.resumeViewCanvas) throw new Error("resume view canvas not defined");
    let context = this.resumeViewCanvas.nativeElement.getContext('2d');
    if (!context) throw new Error("canvas context is null or undefined");

    let offsetX = this.resumeViewCanvas?.nativeElement.offsetLeft;
    let offsetY = this.resumeViewCanvas?.nativeElement.offsetTop;

    // get the mouse position
    let mouseX = event.clientX - offsetX;
    let mouseY = event.clientY - offsetY;

    console.log(mouseX, mouseY);
    console.log(event.clientX, event.clientY);


    for (let points of this.drawnBoundingBoxPoints) {
      this.defineRect(context, points)
      if (context.isPointInPath(mouseX, mouseY)) {
        console.log(event)
      }
    }
  }

}
