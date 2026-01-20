import { animate, state, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'

@Component({
    selector: 'app-loader',
    imports: [],
    templateUrl: './loader.component.html',
    styleUrl: './loader.component.css',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent {

}
