import { ChangeDetectionStrategy, Component, inject, Renderer2 } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
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
import { ResumeService } from '../../../services/resume.service';

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
  readonly resumeService = inject<ResumeService>(ResumeService)
  readonly renderer = inject<Renderer2>(Renderer2)

  download() {
    this.resumeService.download(this.data.url).subscribe((blob) => {
      const objectUrl = URL.createObjectURL(blob)
      const a = this.renderer.createElement('a')
      a.href = objectUrl
      a.download = 'resume_fire_redaction.png'
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    })
  }

  redditSubmitUrl() {
    return "https://www.reddit.com/r/resumes/submit/?title=%5BX+YoE%2C+Current+Role%2FUnemployed%2C+Target+Role%2C+Country%5D&type=IMAGE&url=" + this.data.url
  }

}
