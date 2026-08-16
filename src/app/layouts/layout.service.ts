import { Injectable, computed, effect, signal } from '@angular/core';

const PIN_STORAGE_KEY = 'pip_sidebar_pinned';
const MOBILE_QUERY = '(max-width: 1024px)';

function readPinnedPreference(): boolean {
  if (typeof window === 'undefined') return true;
  const value = window.localStorage.getItem(PIN_STORAGE_KEY);
  if (value === 'false') return false;
  if (value === 'true') return true;
  return true;
}

function writePinnedPreference(pinned: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PIN_STORAGE_KEY, String(pinned));
}

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  readonly isMobile = signal(false);
  readonly isSidebarPinned = signal(true);
  readonly isSidebarHovered = signal(false);
  readonly isSidebarOpen = signal(false);

  readonly isSidebarExpanded = computed(
    () => !this.isMobile() && (this.isSidebarPinned() || this.isSidebarHovered())
  );

  readonly isSidebarCollapsed = computed(() => !this.isSidebarExpanded());

  readonly isMobileDrawerOpen = computed(() => this.isMobile() && this.isSidebarOpen());

  constructor() {
    if (typeof window === 'undefined') return;

    this.isSidebarPinned.set(readPinnedPreference());

    const media = window.matchMedia(MOBILE_QUERY);
    this.isMobile.set(media.matches);
    media.addEventListener('change', (event) => {
      this.isMobile.set(event.matches);
      this.isSidebarHovered.set(false);
      if (event.matches) {
        this.isSidebarOpen.set(false);
      }
    });

    effect(() => {
      const lock = this.isMobile() && this.isSidebarOpen();
      document.body.classList.toggle('nav-drawer-open', lock);
    });
  }

  togglePin() {
    this.isSidebarPinned.update((value) => !value);
    this.isSidebarHovered.set(false);
    if (!this.isMobile()) {
      writePinnedPreference(this.isSidebarPinned());
    }
  }

  setHover(state: boolean) {
    if (!this.isSidebarPinned() && !this.isMobile()) {
      this.isSidebarHovered.set(state);
    }
  }

  toggleSidebar() {
    if (this.isMobile()) {
      this.isSidebarOpen.update((value) => !value);
    } else {
      this.togglePin();
    }
  }

  closeMobileSidebar() {
    if (this.isMobile()) {
      this.isSidebarOpen.set(false);
    }
  }
}
