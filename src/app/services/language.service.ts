import { Injectable, computed, signal } from '@angular/core';
import { Lang, translations } from '../i18n/translations';

const STORAGE_KEY = 'pip_lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly lang = signal<Lang>(this.readStoredLang());
  readonly dir = computed(() => (this.lang() === 'ar' ? 'rtl' : 'ltr'));

  constructor() {
    this.applyToDocument(this.lang());
  }

  t(key: string, params?: Record<string, string | number>): string {
    const dict = translations[this.lang()];
    let value = dict[key] ?? translations.en[key] ?? key;
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        value = value.replace(`{${paramKey}}`, String(paramValue));
      }
    }
    return value;
  }

  setLang(lang: Lang) {
    this.lang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    this.applyToDocument(lang);
  }

  toggle() {
    this.setLang(this.lang() === 'en' ? 'ar' : 'en');
  }

  private readStoredLang(): Lang {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'ar' || stored === 'en' ? stored : 'en';
  }

  private applyToDocument(lang: Lang) {
    if (typeof document === 'undefined') return;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.body.classList.toggle('lang-ar', lang === 'ar');
    document.body.classList.toggle('lang-en', lang === 'en');
  }
}
