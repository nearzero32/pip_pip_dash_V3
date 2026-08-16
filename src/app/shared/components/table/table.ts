import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableColumn } from '../../models/table-column.interface';
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
export class TableComponent<T extends object = object> {
  language = inject(LanguageService);

  @Input() data: T[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() pagination: PaginationConfig | null = null;
  @Input() isLoading: boolean = false;
  @Input() allowDelete: boolean = true;
  @Input() allowEdit: boolean = true;
  @Input() allowView: boolean = false;
  @Input() showActions: boolean = true;
  @Input() rowKey: string = '_id';

  @Output() pageChange = new EventEmitter<number>();
  @Output() onEdit = new EventEmitter<T>();
  @Output() onDelete = new EventEmitter<T>();
  @Output() onView = new EventEmitter<T>();

  /**
   * Resolve a dot-notated key path against a row object.
   * Uses `unknown` + runtime narrowing to avoid broad `any` in the public API.
   * The internal cast is intentional: we are doing dynamic string-key traversal
   * on objects whose shape is not statically known at the column-config level.
   */
  resolveValue(row: T, key: string): unknown {
    if (!row || !key) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return key.split('.').reduce((acc: any, part: string) => (acc != null ? acc[part] : undefined), row);
  }

  getCellValue(row: T, column: TableColumn): unknown {
    const value = this.resolveValue(row, column.key);

    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (column.valueMap) {
      const key = String(value);
      if (column.valueMap[key]) {
        return column.valueMap[key];
      }
    }
    return value;
  }

  getBadgeClass(row: T, column: TableColumn): string {
    if (!column.badgeClassMap) return '';
    const val = String(this.resolveValue(row, column.key) ?? '');
    return column.badgeClassMap[val] || 'badge-default';
  }

  imageSrc(row: T, column: TableColumn): string | null {
    const value = this.resolveValue(row, column.key);
    return typeof value === 'string' && value.trim() ? value : null;
  }

  getRowNumber(index: number): number {
    if (!this.pagination) return index + 1;
    const { total, page, limit } = this.pagination;
    const n = total - ((page - 1) * limit) - index;
    return Number.isFinite(n) ? n : index + 1;
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
