import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { MatToolbar } from "@angular/material/toolbar"
import { MatButton } from '@angular/material/button';
import { NgOptimizedImage } from '@angular/common';

@Component({
    selector: 'app-header',
    imports: [RouterLink, RouterLinkActive, MatToolbar, MatButton, NgOptimizedImage],
    templateUrl: './header.component.html',
    styleUrl: './header.component.css',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {

}
