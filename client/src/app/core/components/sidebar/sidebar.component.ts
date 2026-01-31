import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider'
import { MatListModule } from '@angular/material/list'
import { ObjectUrlStorageService } from '../../services/object-url-storage.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-sidebar',
  imports: [MatSidenavModule, MatDividerModule, MatListModule, MatButtonModule, MatIconModule, ClipboardModule, MatCardModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class SidebarComponent {
  objectUrlStorageService = inject(ObjectUrlStorageService)
  clickClose = output()
  closeSidenav() {
    this.clickClose.emit();
  }

  calcDaysTillExpire(expiry: Date): number {
    return Math.ceil((expiry.getTime() - new Date().getTime()) / (86400000))
  }

}
