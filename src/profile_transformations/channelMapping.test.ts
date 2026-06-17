import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  getClrtColorantOrder,
  getCmykSlotMapFromClrt,
  getIccInputChannelCount,
  mapCmykToProfileColorantOrder,
} from './channelMapping';

const profileBytes = (relativePath: string) =>
  new Uint8Array(readFileSync(resolve(process.cwd(), relativePath)));

const cmykBasic = profileBytes('public/sampleProfiles/CMYK/eciCMYK_v2_basic_profile.icc');
const cmykCardboard = profileBytes('public/sampleProfiles/CMYK/Cardboard_brown_HP-C500_Dark_Paper_Tint.icc');
const cmykSevenChannel = profileBytes('public/sampleProfiles/CMYK/EpsonSC9000_7C-Inkjet_Multichannel.icc');
const cmykFourClr = profileBytes('public/sampleProfiles/CMYK/Fogra39_Spectral_KCMY.icc');
const rgbSrgb = profileBytes('public/sampleProfiles/RGB/sRGB_v4.icc');

describe('channelMapping', () => {
  it('parses channel count from sample profile signatures', () => {
    expect(getIccInputChannelCount(cmykBasic)).toBe(4);
    expect(getIccInputChannelCount(cmykCardboard)).toBe(4);
    expect(getIccInputChannelCount(cmykFourClr)).toBe(4);
    expect(getIccInputChannelCount(cmykSevenChannel)).toBe(7);
    expect(getIccInputChannelCount(rgbSrgb)).toBeNull();
  });

  it('reads clrt-derived order/slots when sample profile provides them', () => {
    const order = getClrtColorantOrder(cmykFourClr);
    const slots = getCmykSlotMapFromClrt(cmykFourClr);

    if (order) {
      expect(order).toHaveLength(4);
      expect(new Set(order)).toEqual(new Set(['C', 'M', 'Y', 'K']));
    }

    if (slots) {
      expect(slots).toHaveLength(4);
      expect(new Set(slots)).toHaveProperty('size', 4);
      slots.forEach((slot) => {
        expect(slot).toBeGreaterThanOrEqual(0);
      });
    }

    expect(Boolean(order) || Boolean(slots)).toBe(true);
  });

  it('keeps original data for 4-channel sample profile when clrt is absent', () => {
    const input = new Uint16Array([100, 200, 300, 400, 101, 201, 301, 401]);
    const mapped = mapCmykToProfileColorantOrder(input, cmykBasic);

    expect(mapped.profileChannelsPerPixel).toBe(4);
    expect(Array.from(mapped.mappedInput)).toEqual(Array.from(input));
  });

  it('maps 7-channel sample profile using clrt slots when available', () => {
    const input = new Uint16Array([111, 222, 333, 444]);
    const slots = getCmykSlotMapFromClrt(cmykSevenChannel);

    if (!slots) {
      expect(() => mapCmykToProfileColorantOrder(input, cmykSevenChannel)).toThrow(
        'Profile has 7 channels but clrt does not provide a full C/M/Y/K mapping.',
      );
      return;
    }

    const mapped = mapCmykToProfileColorantOrder(input, cmykSevenChannel);
    expect(mapped.profileChannelsPerPixel).toBe(7);
    expect(mapped.mappedInput).toHaveLength(7);

    expect(mapped.mappedInput[slots[0]]).toBe(111);
    expect(mapped.mappedInput[slots[1]]).toBe(222);
    expect(mapped.mappedInput[slots[2]]).toBe(333);
    expect(mapped.mappedInput[slots[3]]).toBe(444);
  });
});
