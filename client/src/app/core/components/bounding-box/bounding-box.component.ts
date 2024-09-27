import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-bounding-box',
  standalone: true,
  imports: [],
  templateUrl: './bounding-box.component.html',
  styleUrl: './bounding-box.component.css'
})
export class BoundingBoxComponent {

  @Input({ required: true }) height!: number;
  @Input({ required: true }) width!: number;
  @Input({ required: true }) x!: number;
  @Input({ required: true }) y!: number;
  @Input({ required: true }) id!: string;

}
