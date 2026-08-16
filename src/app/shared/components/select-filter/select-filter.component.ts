import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SelectOption {
    label: string;
    value: any;
}

@Component({
    selector: 'app-select-filter',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './select-filter.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./select-filter.component.css']
})
export class SelectFilterComponent {
    @Input() label: string = '';
    @Input() value: any = null;
    @Input() options: SelectOption[] | any[] = [];
    @Input() placeholder: string = '';
    @Input() required: boolean = false;

    // Property name to use for label if options are objects
    @Input() optionLabel: string = 'label';
    // Property name to use for value if options are objects
    @Input() optionValue: string = 'value';

    @Output() valueChange = new EventEmitter<any>();
    @Output() onChange = new EventEmitter<Event>();

    onSelectChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        // We might need to handle type conversion here depending on requirements,
        // but for now simple string/number value from select is propagated.
        // Ideally we would look up the selected option to get the original value type if complex.
        this.value = select.value;
        this.valueChange.emit(this.value);
        this.onChange.emit(event);
    }

    isObj(val: any): boolean {
        return typeof val === 'object' && val !== null;
    }
}
