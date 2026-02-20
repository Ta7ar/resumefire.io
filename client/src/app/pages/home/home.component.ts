import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {FlexLayoutModule} from "@angular/flex-layout";
import { RedactionComponent } from '../../core/components/redaction/redaction.component';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-home',
    imports: [MatButton, FlexLayoutModule, RedactionComponent, MatListModule, MatIconModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
}
