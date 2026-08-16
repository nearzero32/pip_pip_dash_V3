import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../i18n/translate.pipe';

@Component({
    selector: 'app-date-filter',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe],
    templateUrl: './date-filter.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./date-filter.component.css']
})
export class DateFilterComponent {
    @Input() label: string = '';
    @Input() value: string | null = null;
    @Input() placeholder: string = '';
    @Input() required: boolean = false;

    @Output() valueChange = new EventEmitter<string | null>();
    @Output() onChange = new EventEmitter<Event>();

    onDateChange(event: Event) {
        const input = event.target as HTMLInputElement;
        this.value = input.value;
        this.valueChange.emit(this.value);
        this.onChange.emit(event);
    }

    clearDate() {
        this.value = null;
        this.valueChange.emit(null);
        // Create a synthetic event to trigger change detection in parent if needed
        const event = new Event('change');
        this.onChange.emit(event);
    }
}
