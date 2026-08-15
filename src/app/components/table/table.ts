import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableColumn } from '../../interfaces/table-column.interface';
import { PaginationConfig } from '../../interfaces/pagination.interface';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './table.html',
  styleUrl: './table.css'
})
export class TableComponent {
  language = inject(LanguageService);

  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() pagination: PaginationConfig | null = null;
  @Input() isLoading: boolean = false;
  @Input() showRestore: boolean = false;
  @Input() allowDelete: boolean = true;
  @Input() allowEdit: boolean = true;
  @Input() showActions: boolean = true;
  @Input() allowPrint: boolean = false;
  @Input() printingId: string | null = null;
  @Input() allowPayments: boolean = false;
  @Input() allowView: boolean = false;
  @Input() contentUrl: string = '';

  @Output() pageChange = new EventEmitter<number>();
  @Output() onEdit = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();
  @Output() onRestore = new EventEmitter<any>();
  @Output() onPrint = new EventEmitter<any>();
  @Output() onPayments = new EventEmitter<any>();
  @Output() onView = new EventEmitter<any>();

  getCellValue(row: any, column: TableColumn): any {
    // Support nested keys (e.g., 'user.name')
    const value = column.key.split('.').reduce((acc, part) => acc && acc[part], row);

    if (value === null || value === undefined || value === '') {
      if (column.type === 'image') return null;
      return column.type === 'currency' ? 0 : '-';
    }
    if (column.valueMap && column.valueMap[value]) {
      return column.valueMap[value];
    }
    // For image columns, construct full URL if contentUrl is provided
    if (column.type === 'image' && this.contentUrl && value) {
      // If value is already a full URL (starts with http/https), return as is
      if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
        return value;
      }
      // Otherwise, construct full URL by concatenating contentUrl + value
      return this.contentUrl + value;
    }
    return value;
  }

  getBadgeClass(row: any, column: TableColumn): string {
    if (!column.badgeClassMap) return '';
    const val = row[column.key];
    return column.badgeClassMap[val] || 'badge-default';
  }

  getRowNumber(index: number): number {
    if (!this.pagination) return index + 1;
    const { total, page, limit } = this.pagination;
    // (page - 1) * limit calculates how many items are before the current page
    // index is the position on current page (0-based)
    // total - offset - index gives the countdown number
    return total - ((page - 1) * limit) - index;
  }

  get pages(): (number | string)[] {
    if (!this.pagination) return [];
    const total = this.pagination.pages;
    const current = this.pagination.page;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    pages.push(1);

    if (current > 4) {
      pages.push('...');
    }

    let start = Math.max(2, current - 2);
    let end = Math.min(total - 1, current + 2);

    if (current <= 4) {
      end = 5;
    } else if (current >= total - 3) {
      start = total - 4;
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 3) {
      pages.push('...');
    }

    pages.push(total);
    return pages;
  }

  viewImage(url: string) {
    if (url) {
      const win = window.open();
      if (win) {
        win.document.write(`<img src="${url}" style="max-width: 100%; height: auto;">`);
      }
    }
  }
}
