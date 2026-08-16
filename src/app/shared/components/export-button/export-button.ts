import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../i18n/translate.pipe';

@Component({
  selector: 'app-export-button',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  styleUrl: './export-button.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button class="filter-btn" (click)="onClick()" [disabled]="isLoading">
      @if (isLoading) {
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
  @Input() isLoading: boolean = false;
  @Input() label: string = '';
  @Output() action = new EventEmitter<void>();

  onClick() {
    this.action.emit();
  }
}
