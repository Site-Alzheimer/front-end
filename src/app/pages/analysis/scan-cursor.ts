import { Injectable, signal } from '@angular/core';

/**
 * Fatia coronal em foco, compartilhada entre visualizador, gráficos e miniaturas.
 * Fica fora dos signals de propósito: arrastar ou animar muda o valor a 60 quadros/s e
 * cada ouvinte redesenha direto no canvas/SVG, sem detecção de mudanças.
 */
@Injectable()
export class ScanCursor {
  private j = 0;
  private readonly listeners = new Set<(j: number) => void>();
  /** Posição do lote da CNN2 em destaque (hover); evento discreto, então pode ser signal. */
  readonly highlighted = signal<number | null>(null);

  get value(): number {
    return this.j;
  }

  set(j: number): void {
    const v = Math.round(j);
    if (v === this.j) return;
    this.j = v;
    for (const l of this.listeners) l(v);
  }

  /** Chama `fn` agora e a cada mudança; devolve a função que cancela. */
  listen(fn: (j: number) => void): () => void {
    this.listeners.add(fn);
    fn(this.j);
    return () => this.listeners.delete(fn);
  }
}
