import { ErrorHandler, inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class GlobalErrorAlertService implements ErrorHandler {
  private errorSnackbar = inject(MatSnackBar);

  handleError(error: any): void {
    console.error(error)
    this.errorSnackbar.open(
      error.message,
      'Close',
      {
        duration: 5 * 1000,
      },
    );
  }
}
