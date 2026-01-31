import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {FlexLayoutModule} from "@angular/flex-layout";
import { RedactionComponent } from '../../core/components/redaction/redaction.component';

@Component({
    selector: 'app-home',
    imports: [MatButton, FlexLayoutModule, RedactionComponent],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
}
