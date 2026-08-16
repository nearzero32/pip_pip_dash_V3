import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { ProductImageDraft } from '../product-catalog.models';

@Component({
  selector: 'app-product-images-editor',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-images-editor.html',
  styleUrl: './product-images-editor.css',
})
export class ProductImagesEditorComponent {
  readonly images = input.required<ProductImageDraft[]>();
  readonly disabled = input(false);
  readonly changed = output<ProductImageDraft[]>();

  addFiles(fileList: FileList | null) {
    if (!fileList || this.disabled()) return;
    const next = [...this.images()];
    for (const file of Array.from(fileList)) {
      if (next.length >= 10) break;
      next.push({
        key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        assetId: null,
        file,
        previewUrl: URL.createObjectURL(file),
        isPrimary: next.length === 0,
        isNew: true,
      });
    }
    this.ensurePrimary(next);
    this.changed.emit(next);
  }

  remove(key: string) {
    if (this.disabled()) return;
    const next = this.images().filter((image) => image.key !== key);
    this.ensurePrimary(next);
    this.changed.emit(next);
  }

  setPrimary(key: string) {
    if (this.disabled()) return;
    this.changed.emit(
      this.images().map((image) => ({ ...image, isPrimary: image.key === key }))
    );
  }

  move(key: string, delta: -1 | 1) {
    if (this.disabled()) return;
    const next = [...this.images()];
    const index = next.findIndex((image) => image.key === key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    this.changed.emit(next);
  }

  private ensurePrimary(images: ProductImageDraft[]) {
    if (!images.length || images.some((image) => image.isPrimary)) return;
    images[0].isPrimary = true;
  }
}
