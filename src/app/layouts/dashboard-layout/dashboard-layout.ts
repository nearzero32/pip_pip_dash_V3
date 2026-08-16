import { Component, HostListener, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';
import { LayoutService } from '../layout.service';
import { LanguageService } from '../../i18n/language.service';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TranslatePipe],
  templateUrl: './dashboard-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayoutComponent {
  readonly layoutService = inject(LayoutService);
  readonly language = inject(LanguageService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly titleKey = signal(this.readTitleKey());
  readonly menuOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.titleKey.set(this.readTitleKey());
        this.menuOpen.set(false);
        this.layoutService.closeMobileSidebar();
      });
  }

  toggleProfileMenu() {
    this.menuOpen.update((open) => !open);
  }

  closeProfileMenu() {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      return;
    }
    this.layoutService.closeMobileSidebar();
  }

  private readTitleKey(): string {
    let child = this.route.firstChild;
    while (child?.firstChild) {
      child = child.firstChild;
    }
    return child?.snapshot?.data?.['titleKey'] || 'home';
  }
}
