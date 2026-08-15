import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { ApiErrorBody } from '../../../interfaces/auth.interface';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './sign-in.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sign-in.css',
})
export class SignInComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  language = inject(LanguageService);

  submitting = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(12)]],
  });

  async submit() {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      await this.router.navigate(['/home']);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiErrorBody; status?: number } };
      const code = axiosErr.response?.data?.error?.code;
      if (code === 'INVALID_CREDENTIALS') {
        this.errorMessage.set(this.language.t('auth.invalidCredentials'));
      } else if (code === 'RATE_LIMITED' || axiosErr.response?.status === 429) {
        this.errorMessage.set(this.language.t('auth.rateLimited'));
      } else if (axiosErr.response?.status === 422) {
        this.errorMessage.set(this.language.t('auth.invalidForm'));
      } else {
        this.errorMessage.set(
          axiosErr.response?.data?.error?.message || this.language.t('common.unexpectedError')
        );
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
