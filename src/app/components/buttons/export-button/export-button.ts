import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../i18n/translate.pipe';

@Component({
  selector: 'app-export-button',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  styles: [`
    .filter-btn {
      background: #F3F4F6;
      color: #6B7280;
      padding: 0.875rem 1.5rem;
      border-radius: 16px;
      border: 2px solid #E5E7EB;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      position: relative;
      overflow: hidden;
    }

    .filter-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
      transition: left 0.5s;
    }

    .filter-btn:hover::before {
      left: 100%;
    }

    .filter-btn:not(:disabled):hover {
      background: #E5E7EB;
      color: #374151;
      border-color: #D1D5DB;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .filter-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .spinner-sm {
        width: 16px;
        height: 16px;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spin 0.75s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    /* Mobile Responsiveness */
    @media (max-width: 1024px) {
      .filter-btn {
        width: 100%;
        justify-content: center;
      }
    }
  `],
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
