import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { ApiService } from '../../../core/http/api.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { downloadBlob } from '../../../core/utils/download';
import { LanguageService } from '../../../i18n/language.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-export-button',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  styleUrl: './export-button.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button class="filter-btn" type="button" (click)="onClick()" [disabled]="disabled || isLoading || downloading()">
      @if (isLoading || downloading()) {
        <div class="spinner-sm"></div>
        <span>{{ 'common.exporting' | t }}</span>
      } @else {
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        <span>{{ label || ('common.exportExcel' | t) }}</span>
      }
    </button>
  `
})
export class ExportButtonComponent {
  private readonly api = inject(ApiService).client;
  private readonly language = inject(LanguageService);
  private readonly notify = inject(NotificationService);
  @Input() isLoading: boolean = false;
  @Input() label: string = '';
  @Input() endpoint = '';
  @Input() filename = 'export.xlsx';
  @Input() params: Record<string, unknown> = {};
  @Input() disabled = false;
  @Output() action = new EventEmitter<void>();
  readonly downloading = signal(false);

  async onClick() {
    if (this.endpoint) {
      this.downloading.set(true);
      try {
        const params = Object.fromEntries(
          Object.entries(this.params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
        );
        const response = await this.api.get<Blob>(this.endpoint, { params, responseType: 'blob' });
        downloadBlob(response.data, this.filename);
      } catch (error) {
        this.notify.error(apiErrorMessage(error, this.language.t('common.unexpectedError')));
      } finally {
        this.downloading.set(false);
      }
      return;
    }
    this.action.emit();
  }
}
