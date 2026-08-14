import { Component, EventEmitter, Input, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
    selector: 'app-image-upload',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './image-upload.html',
    styleUrl: './image-upload.css'
})
export class ImageUploadComponent {
    private language = inject(LanguageService);

    @Input() label = '';
    @Input() placeholder = '';
    @Input() set currentImage(value: string | undefined | null) {
        if (value) {
            this.previewUrl.set(value);
        } else {
            this.previewUrl.set(null);
        }
    }
    @Input() maxSizeInMB: number = 5;
    @Input() acceptedTypes: string = 'image/png, image/jpeg, image/jpg, image/webp';
    @Input() error: boolean = false;

    @Output() imageSelected = new EventEmitter<string | null>();

    previewUrl = signal<string | null>(null);
    isDragging = signal<boolean>(false);
    errorMessage = signal<string | null>(null);

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(true);
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.handleFile(input.files[0]);
        }
    }

    handleFile(file: File) {
        this.errorMessage.set(null);

        // Validate type
        if (!file.type.match(/image\/*/)) {
            this.errorMessage.set(this.language.t('common.invalidImage'));
            return;
        }

        // Validate size
        if (file.size > this.maxSizeInMB * 1024 * 1024) {
            this.errorMessage.set(this.language.t('common.imageTooLarge', { size: this.maxSizeInMB }));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            this.previewUrl.set(base64);
            this.imageSelected.emit(base64);
        };
        reader.onerror = () => {
            this.errorMessage.set(this.language.t('common.readError'));
        };
        reader.readAsDataURL(file);
    }

    removeImage(event: Event) {
        event.stopPropagation();
        this.previewUrl.set(null);
        this.imageSelected.emit(null);
        this.errorMessage.set(null);
    }
}
