import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';

describe('contrastRatio', () => {
  it('gives 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
  });

  it('gives 21 for white on black', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBe(21);
  });

  it('throws an error that contains a bad first value', () => {
    expect(() => contrastRatio('#12345', '#ffffff')).toThrow(/#12345/);
  });

  it('throws an error that contains a bad second value', () => {
    expect(() => contrastRatio('#000000', 'not-a-colour')).toThrow(
      /not-a-colour/,
    );
  });
});
