import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../i18n/language.service';

export interface PageStatItem {
  label: string;
  value: string | number;
  tone?: 'total' | 'success' | 'warning' | 'danger';
}

@Component({
  selector: 'app-page-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-stats.html',
  styleUrl: './page-stats.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageStatsComponent {
  @Input() data: readonly any[] = [];
  @Input() total: number | null = null;
  @Input() statusKey = 'status';
  @Input() items: readonly PageStatItem[] | null = null;

  constructor(private readonly language: LanguageService) {}

  displayItems(): readonly PageStatItem[] {
    if (this.items) return this.items;
    const statuses = this.data.map((row) => String(row[this.statusKey] ?? '').toUpperCase());
    return [
      { label: this.language.t('stats.total'), value: this.total ?? this.data.length, tone: 'total' },
      { label: this.language.t('status.ACTIVE'), value: statuses.filter((status) => status === 'ACTIVE').length, tone: 'success' },
      { label: this.language.t('stats.nonActive'), value: statuses.filter((status) => status && status !== 'ACTIVE' && status !== 'ARCHIVED').length, tone: 'warning' },
      { label: this.language.t('status.ARCHIVED'), value: statuses.filter((status) => status === 'ARCHIVED').length, tone: 'danger' },
    ];
  }
}
