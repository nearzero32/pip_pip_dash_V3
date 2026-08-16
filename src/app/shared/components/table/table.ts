import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableColumn, TableRow } from '../../models/table-column.interface';
import { PaginationConfig } from '../../models/pagination.interface';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { LanguageService } from '../../../i18n/language.service';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './table.css'
})
export class TableComponent {
  language = inject(LanguageService);

  @Input() data: TableRow[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() pagination: PaginationConfig | null = null;
  @Input() isLoading: boolean = false;
  @Input() allowDelete: boolean = true;
  @Input() allowEdit: boolean = true;
  @Input() allowView: boolean = false;
  @Input() showActions: boolean = true;
  @Input() rowKey: string = '_id';

  @Output() pageChange = new EventEmitter<number>();
  @Output() onEdit = new EventEmitter<TableRow>();
  @Output() onDelete = new EventEmitter<TableRow>();
  @Output() onView = new EventEmitter<TableRow>();

  resolveValue(row: TableRow, key: string): any {
    if (!row || !key) return undefined;
    return key.split('.').reduce((acc: any, part: string) => acc && acc[part], row);
  }

  getCellValue(row: TableRow, column: TableColumn): any {
    const value = this.resolveValue(row, column.key);

    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (column.valueMap && column.valueMap[value]) {
      return column.valueMap[value];
    }
    return value;
  }

  getBadgeClass(row: TableRow, column: TableColumn): string {
    if (!column.badgeClassMap) return '';
    const val = this.resolveValue(row, column.key);
    return column.badgeClassMap[val] || 'badge-default';
  }

  getRowNumber(index: number): number {
    if (!this.pagination) return index + 1;
    const { total, page, limit } = this.pagination;
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
}
