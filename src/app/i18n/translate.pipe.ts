import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private language = inject(LanguageService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.language.t(key, params);
  }
}
