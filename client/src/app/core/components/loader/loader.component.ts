import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.css',
  // animations: [
  //   trigger(
  //     "fade", [
  //       state("void", style({opacity: 0})),
  //       transition('void <=> *', animate('500ms ease-in-out'))
  //     ]
  //   )
  // ]
})
export class LoaderComponent {

}
