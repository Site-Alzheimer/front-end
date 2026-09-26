// Junta os ícones de src/assets/svg/*.svg num único sprite.svg de <symbol>s.
// Uso: node scripts/svg-sprite.mjs
// No template: <svg><use href="assets/svg/sprite.svg#nome-do-arquivo"></use></svg>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../src/assets/svg/', import.meta.url));
const saida = 'sprite.svg';

const simbolos = readdirSync(dir)
  .filter((f) => f.endsWith('.svg') && f !== saida)
  .sort()
  .map((arquivo) => {
    const svg = readFileSync(join(dir, arquivo), 'utf8');
    const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 24 24';
    const corpo = svg
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')
      // retângulo transparente que a Tabler usa só para delimitar a área
      .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/g, '')
      .replace(/\s*\n\s*/g, '');
    const id = arquivo.replace(/\.svg$/, '');
    return (
      `<symbol id="${id}" viewBox="${viewBox}" fill="none" stroke="currentColor" ` +
      `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${corpo}</symbol>`
    );
  });

writeFileSync(
  join(dir, saida),
  `<svg xmlns="http://www.w3.org/2000/svg">\n${simbolos.join('\n')}\n</svg>\n`,
);
console.log(`${simbolos.length} ícones -> src/assets/svg/${saida}`);
