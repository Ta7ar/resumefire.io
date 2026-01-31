import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input';
import { ClipboardModule } from '@angular/cdk/clipboard'
import { ObjectUrlStorageService } from '../../../services/object-url-storage.service';

export interface UrlDialogData {
  url: string
}

@Component({
  selector: 'app-url-dialog',
  imports: [MatDialogActions, MatDialogContent, MatDialogClose, MatDialogTitle, MatButtonModule, MatInputModule, MatIconModule, ClipboardModule],
  templateUrl: './url-dialog.component.html',
  styleUrl: './url-dialog.component.css',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class UrlDialogComponent {
  readonly dialogRef = inject(MatDialogRef<UrlDialogComponent>);
  readonly data = inject<UrlDialogData>(MAT_DIALOG_DATA);
  readonly objectUrlService = inject(ObjectUrlStorageService)

  download() {
    this.objectUrlService.downloadObject(this.data.url);
  }

  redditSubmitUrl() {
    return "https://www.reddit.com/r/resumes/submit/?title=%5BX+YoE%2C+Current+Role%2FUnemployed%2C+Target+Role%2C+Country%5D&type=IMAGE&url=" + this.data.url
  }

}
