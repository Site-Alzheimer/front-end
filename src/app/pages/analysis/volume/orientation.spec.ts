import { axcodes, canonicalLayout, ioOrientation } from './orientation';

describe('orientação (mesmas regras do nibabel)', () => {
  it('reconhece RAS e IPL', () => {
    expect(
      axcodes(
        ioOrientation([
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ]),
      ),
    ).toBe('RAS');
    // qform dos exames ADNI de teste: eixo 0 → inferior, 1 → posterior, 2 → esquerda
    expect(
      axcodes(
        ioOrientation([
          [0, 0, -1.2],
          [0, -1.02, 0],
          [-1.02, 0, 0],
        ]),
      ),
    ).toBe('IPL');
  });

  it('escolhe o eixo dominante em afins levemente oblíquos', () => {
    expect(
      axcodes(
        ioOrientation([
          [0.99, 0.1, 0],
          [-0.1, 0.99, 0.02],
          [0, -0.02, 1],
        ]),
      ),
    ).toBe('RAS');
  });

  it('mapeia um volume IPL para RAS como o as_closest_canonical', () => {
    const dims = [4, 5, 3]; // I, P, L
    const layout = canonicalLayout(
      dims,
      [1, 1, 1.2],
      ioOrientation([
        [0, 0, -1],
        [0, -1, 0],
        [-1, 0, 0],
      ]),
    );
    expect(layout.dims).toEqual([3, 5, 4]);
    expect(layout.spacing).toEqual([1.2, 1, 1]);
    const idx = (x: number, y: number, z: number) =>
      layout.base + x * layout.coef[0] + y * layout.coef[1] + z * layout.coef[2];
    const original = (i: number, j: number, k: number) => i + 4 * (j + 5 * k);
    // x canônico = n-1-k, y = n-1-j, z = n-1-i
    expect(idx(0, 0, 0)).toBe(original(3, 4, 2));
    expect(idx(2, 4, 3)).toBe(original(0, 0, 0));
    expect(idx(1, 2, 3)).toBe(original(0, 2, 1));
  });
});
