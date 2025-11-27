import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-scribble-loader',
  standalone: true,
  imports: [],
  templateUrl: './scribble-loader.component.html',
  styleUrl: './scribble-loader.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScribbleLoaderComponent {

}
