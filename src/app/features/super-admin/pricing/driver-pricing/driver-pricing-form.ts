import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { DriverPricing, DriverPricingStage } from '../pricing.models';

export interface DriverPricingFormValue {
  pricingBase: number;
  roundingUnit: number;
  pricingStages: DriverPricingStage[];
}

@Component({
  selector: 'app-driver-pricing-form',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './driver-pricing-form.html',
  styleUrl: './driver-pricing-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverPricingFormComponent implements OnInit {
  @Input() initialData: DriverPricing | null = null;
  @Input() isSubmitting = false;

  @Output() closeForm = new EventEmitter<void>();
  @Output() saveForm = new EventEmitter<DriverPricingFormValue>();

  readonly pricingBase = signal<number | null>(null);
  readonly roundingUnit = signal<number | null>(null);
  readonly stages = signal<DriverPricingStage[]>([]);
  readonly openHelp = signal<string | null>(null);
  readonly submitted = signal(false);

  ngOnInit() {
    this.pricingBase.set(this.initialData?.pricingBase ?? null);
    this.roundingUnit.set(this.initialData?.roundingUnit ?? null);
    this.stages.set(
      this.initialData?.pricingStages.length
        ? this.initialData.pricingStages.map((stage) => ({ ...stage }))
        : [{ afterSeconds: 0, increasePercentage: 0 }],
    );
  }

  toggleHelp(field: string) {
    this.openHelp.update((current) => (current === field ? null : field));
  }

  updateStage(index: number, key: keyof DriverPricingStage, value: number | string | null) {
    const numberValue = Number(value);
    this.stages.update((stages) =>
      stages.map((stage, stageIndex) =>
        stageIndex === index ? { ...stage, [key]: numberValue } : stage,
      ),
    );
  }

  addStage() {
    this.stages.update((stages) => [
      ...stages,
      {
        afterSeconds: (stages.at(-1)?.afterSeconds ?? 0) + 60,
        increasePercentage: stages.at(-1)?.increasePercentage ?? 0,
      },
    ]);
  }

  removeStage(index: number) {
    if (this.stages().length === 1) return;
    this.stages.update((stages) => stages.filter((_, stageIndex) => stageIndex !== index));
  }

  isValid() {
    const base = this.pricingBase();
    const rounding = this.roundingUnit();
    const stages = this.stages();
    if (!Number.isSafeInteger(base) || Number(base) <= 0) return false;
    if (!Number.isSafeInteger(rounding) || Number(rounding) <= 0) return false;
    if (!stages.length) return false;
    return stages.every(
      (stage, index) =>
        Number.isSafeInteger(stage.afterSeconds) &&
        stage.afterSeconds >= 0 &&
        Number.isSafeInteger(stage.increasePercentage) &&
        stage.increasePercentage >= 0 &&
        (index === 0 || stage.afterSeconds > stages[index - 1]!.afterSeconds),
    );
  }

  submit() {
    this.submitted.set(true);
    if (!this.isValid()) return;
    this.saveForm.emit({
      pricingBase: Number(this.pricingBase()),
      roundingUnit: Number(this.roundingUnit()),
      pricingStages: this.stages().map((stage) => ({ ...stage })),
    });
  }

  close() {
    if (!this.isSubmitting) this.closeForm.emit();
  }
}
