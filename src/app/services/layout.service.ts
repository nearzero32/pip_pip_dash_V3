import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  isMobile = signal(typeof window !== 'undefined' && window.innerWidth <= 1024);
  isSidebarPinned = signal(true);
  isSidebarHovered = signal(false);
  isSidebarOpen = signal(false);

  constructor() {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 1024px)');
    this.isMobile.set(media.matches);
    media.addEventListener('change', (event) => this.isMobile.set(event.matches));
  }

  isSidebarExpanded = () => (this.isSidebarPinned() || this.isSidebarHovered()) && !this.isMobile();

  isSidebarCollapsed = () => !this.isSidebarExpanded();

  togglePin() {
    this.isSidebarPinned.update((value) => !value);
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
