import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { MatToolbar } from "@angular/material/toolbar"
import { MatButton } from '@angular/material/button';
import { NgOptimizedImage } from '@angular/common';
import { ObjectUrlStorageService } from '../../services/object-url-storage.service';
import {MatBadgeModule} from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-header',
    imports: [RouterLink, RouterLinkActive, MatToolbar, MatButton, NgOptimizedImage, MatBadgeModule, MatIconModule],
    templateUrl: './header.component.html',
    styleUrl: './header.component.css',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
    objectUrlStorageService = inject(ObjectUrlStorageService)
    dashboardClick = output();
    openSidenav(){

        this.dashboardClick.emit();
    }
}
