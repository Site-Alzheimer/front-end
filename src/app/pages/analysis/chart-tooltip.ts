import { Injectable } from '@angular/core';

export type TooltipRow = [kind: 'v' | 'l', text: string, color?: string];

/** Um único tooltip para todos os gráficos. O texto entra por textContent, nunca como HTML. */
@Injectable({ providedIn: 'root' })
export class ChartTooltip {
  private el: HTMLDivElement | null = null;

  show(pos: { clientX: number; clientY: number }, rows: TooltipRow[]): void {
    const el = (this.el ??= this.create());
    el.replaceChildren(
      ...rows.map(([kind, text, color]) => {
        const span = document.createElement('span');
        span.className = kind;
        if (color) {
          const key = document.createElement('i');
          key.style.borderColor = color;
          span.append(key);
        }
        span.append(document.createTextNode(text));
        return span;
      }),
    );
    el.style.left = `${Math.min(pos.clientX + 14, innerWidth - 250)}px`;
    el.style.top = `${pos.clientY + 16}px`;
    el.classList.add('is-visible');
  }

  hide(): void {
    this.el?.classList.remove('is-visible');
  }

  private create(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'ui-tooltip';
    el.setAttribute('role', 'tooltip');
    document.body.append(el);
    return el;
  }
}
