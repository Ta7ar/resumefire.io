import { Component, ViewChild, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './core/layout/header/header.component';
import { FooterComponent } from './core/layout/footer/footer.component';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';

import * as pdf from 'pdfjs-dist';
import { SidebarComponent } from './core/components/sidebar/sidebar.component';

pdf.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.mjs';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, HeaderComponent, FooterComponent, MatSidenavModule, SidebarComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    standalone: true
})
export class AppComponent {
    @ViewChild('sidenav') sidenav!: MatSidenav

    openSidenav() {
        this.sidenav.open();
    }

    closeSidenav() {
        this.sidenav.close();
    }
}
