import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LayoutService } from '../../../layouts/layout.service';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NAV_ITEMS, NavItem } from './nav.config';

function pathFromUrl(url: string): string {
  const path = url.split('?')[0].split('#')[0];
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

function groupContainsPath(item: NavItem, path: string): boolean {
  return Boolean(item.children?.some((child) => child.route === path));
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './sidebar.css',
})
export class SidebarComponent {
  readonly layoutService = inject(LayoutService);
  private readonly auth = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);

  private readonly currentPath = signal(pathFromUrl(this.router.url));
  readonly expandedGroups = signal<ReadonlySet<string>>(new Set());

  readonly menuItems = computed(() => {
    const superAdmin = this.auth.isSuperAdmin();
    return NAV_ITEMS.filter((item) => {
      const audience = item.audience ?? 'city';
      if (audience === 'all') return true;
      if (audience === 'super') return superAdmin;
      return !superAdmin;
    });
  });

  constructor() {
    this.expandGroupForPath(this.currentPath());

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event) => {
        const path = pathFromUrl(event.urlAfterRedirects);
        this.currentPath.set(path);
        this.expandGroupForPath(path);
      });
  }

  isGroupOpen(item: NavItem): boolean {
    return this.expandedGroups().has(item.id);
  }

  isGroupActive(item: NavItem): boolean {
    return groupContainsPath(item, this.currentPath());
  }

  submenuId(item: NavItem): string {
    return `sidebar-submenu-${item.id}`;
  }

  getIcon(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  toggle() {
    this.layoutService.togglePin();
  }

  onMouseEnter() {
    this.layoutService.setHover(true);
  }

  onMouseLeave() {
    this.layoutService.setHover(false);
  }

  toggleGroup(item: NavItem) {
    this.expandedGroups.update((current) => {
      const next = new Set(current);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }

  private expandGroupForPath(path: string) {
    const match = this.menuItems().find((item) => groupContainsPath(item, path));
    if (!match) return;
    this.expandedGroups.update((current) => {
      if (current.has(match.id)) return current;
      const next = new Set(current);
      next.add(match.id);
      return next;
    });
  }
}
