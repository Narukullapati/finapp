import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  template: `
    @if (open()) {
      <div class="backdrop" (click)="close.emit()">
        <div class="modal" role="dialog" [attr.aria-label]="title()" (click)="$event.stopPropagation()">
          <div class="head">
            <h2>{{ title() }}</h2>
            <button type="button" class="x" aria-label="Close" (click)="close.emit()">×</button>
          </div>
          <div class="body"><ng-content /></div>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop { position: fixed; inset: 0; background: rgb(23 43 77 / .45);
      backdrop-filter: blur(2px); display: grid; place-items: center; z-index: 100;
      padding: 16px; overflow-y: auto; }
    .modal { background: #fff; border-radius: 16px; width: min(720px, 100%);
      max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgb(23 43 77 / .3);
      animation: pop .15s ease-out; }
    @keyframes pop { from { transform: scale(.96) translateY(8px); opacity: 0; } }
    .head { display: flex; justify-content: space-between; align-items: center;
      padding: 18px 22px 0; position: sticky; top: 0; background: #fff; }
    .head h2 { margin: 0; }
    .x { background: none; border: 0; font-size: 1.6rem; line-height: 1; color: #6b778c;
      cursor: pointer; padding: 4px 8px; }
    .x:hover { color: #172b4d; background: none; transform: none; }
    .body { padding: 14px 22px 22px; }
  `,
})
export class Modal {
  open = input(false);
  title = input('');
  close = output<void>();

  @HostListener('document:keydown.escape')
  onEsc() { if (this.open()) this.close.emit(); }
}
