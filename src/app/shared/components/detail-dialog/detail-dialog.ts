import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../i18n/translate.pipe';

export interface DetailItem { label: string; value: string | number | null | undefined; url?: string; }
export interface DetailSection { title: string; items: readonly DetailItem[]; }
export interface DetailDialogAction { id: string; label: string; disabled?: boolean; tone?: 'primary' | 'neutral'; }

@Component({ selector: 'app-detail-dialog', standalone: true, imports: [CommonModule, TranslatePipe], templateUrl: './detail-dialog.html', styleUrl: './detail-dialog.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class DetailDialogComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() imageUrl: string | null = null;
  @Input() sections: readonly DetailSection[] = [];
  @Input() actions: readonly DetailDialogAction[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() action = new EventEmitter<string>();
}
