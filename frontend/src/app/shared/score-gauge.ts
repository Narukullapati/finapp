import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-score-gauge',
  template: `
    <div class="gauge">
      <svg viewBox="0 0 200 112">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e4e9f0" stroke-width="16" stroke-linecap="round"/>
        <path [attr.d]="arc()" fill="none" [attr.stroke]="color()" stroke-width="16" stroke-linecap="round"/>
        <text x="100" y="78" text-anchor="middle" class="score">{{ score }}</text>
        <text x="100" y="98" text-anchor="middle" class="band">{{ band() }}</text>
      </svg>
      <p class="caption">{{ caption }}</p>
    </div>
  `,
  styles: `
    .gauge { text-align: center; }
    svg { width: 220px; max-width: 100%; }
    .score { font-size: 34px; font-weight: 800; fill: #172b4d; }
    .band { font-size: 12px; font-weight: 700; fill: #6b778c; text-transform: uppercase; letter-spacing: .08em; }
    .caption { margin: 2px 0 0; font-size: .85rem; color: #6b778c; }
  `,
})
export class ScoreGauge {
  @Input() score = 0;               // 0–100
  @Input() caption = 'FinHealth score';

  band() {
    if (this.score >= 80) return 'Excellent';
    if (this.score >= 60) return 'Good';
    if (this.score >= 40) return 'Fair';
    return 'Needs work';
  }

  color() {
    if (this.score >= 80) return '#30a46c';
    if (this.score >= 60) return '#7bc96f';
    if (this.score >= 40) return '#e9a13b';
    return '#de3b40';
  }

  arc() {
    const f = Math.min(Math.max(this.score, 0), 100) / 100;
    const angle = Math.PI * (1 - f);
    const x = 100 + 80 * Math.cos(angle);
    const y = 100 - 80 * Math.sin(angle);
    return `M 20 100 A 80 80 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
}
