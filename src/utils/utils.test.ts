import { describe, expect, it } from 'vitest';
import { getImageColorModel, inferColorModelFromLabel } from './utils';

describe('inferColorModelFromLabel', () => {
  it('detects RGB labels', () => {
    expect(inferColorModelFromLabel('sRGB_v4 profile')).toBe('RGB');
  });

  it('detects CMYK labels', () => {
    expect(inferColorModelFromLabel('ISO Coated CMYK')).toBe('CMYK');
    expect(inferColorModelFromLabel('Printer KCMY preset')).toBe('CMYK');
  });

  it('returns null when no known model exists', () => {
    expect(inferColorModelFromLabel('Grayscale profile')).toBeNull();
  });
});

describe('getImageColorModel', () => {
  it('returns CMYK for 4 channel decoded image', () => {
    const image = {
      colorSpace: 'Unknown',
      channelCount: 4,
      mapping: null,
    };

    expect(getImageColorModel(image as never)).toBe('CMYK');
  });

  it('returns null when model cannot be inferred', () => {
    const image = {
      colorSpace: 'Unknown',
      channelCount: 2,
      mapping: null,
    };

    expect(getImageColorModel(image as never)).toBeNull();
  });
});
