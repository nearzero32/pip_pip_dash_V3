import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './placeholder.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './placeholder.css',
})
export class PlaceholderComponent {
  private route = inject(ActivatedRoute);

  titleKey = toSignal(
    this.route.data.pipe(map((data) => (data['titleKey'] as string) || 'dashboard')),
    { initialValue: 'dashboard' }
  );
}
