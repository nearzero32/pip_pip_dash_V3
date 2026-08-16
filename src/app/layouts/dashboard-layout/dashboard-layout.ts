import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayoutComponent {
  public layoutService = inject(LayoutService);
  public language = inject(LanguageService);
  public auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  titleKey = signal(this.readTitleKey());
  menuOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.titleKey.set(this.readTitleKey()));
  }

  private readTitleKey(): string {
    let child = this.route.firstChild;
    while (child?.firstChild) {
      child = child.firstChild;
    }
    return child?.snapshot?.data?.['titleKey'] || 'home';
  }
}
