import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {FlexLayoutModule} from "@angular/flex-layout";
import { RedactionComponent } from '../../core/components/redaction/redaction.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatButton, MatIcon, FlexLayoutModule, RedactionComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
}
