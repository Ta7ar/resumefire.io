import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-footer',
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {

}
