import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CMYKtoLAB,
  LABtoRGB,
  RGBtoLAB,
  ProfileInputToLAB,
  doRGBSoftProof,
} from './profileTransformations';
import { lcmsReady } from './lcmsSingleton';
import { labToIcc16Bit } from '../utils/utils';

const readProfile = (profilePath: string) =>
  new Uint8Array(readFileSync(resolve(process.cwd(), profilePath)));

const CMYK_PROFILE = readProfile('public/sampleProfiles/CMYK/eciCMYK_v2_basic_profile.icc');

describe('profileTransformations conversions', () => {
  test('round-trips an sRGB neutral grey through RGB -> Lab -> RGB', async () => {
    await lcmsReady;
    const inputRgb = new Uint8Array([128, 128, 128]);

    const lab = RGBtoLAB(inputRgb, null);
    const rgb = LABtoRGB(lab, undefined);

    expect(rgb).toBeInstanceOf(Uint8Array);
    expect(rgb).toHaveLength(3);
    expect(Array.from(rgb)).toEqual(Array.from(inputRgb));
  });

  test('converts encoded neutral Lab grey to grey RGB', async () => {
    await lcmsReady;
    const inputLAB = labToIcc16Bit(50, 0, 0);

    const rgb = LABtoRGB(inputLAB, undefined);

    expect(rgb).toBeInstanceOf(Uint8Array);
    expect(rgb).toHaveLength(3);
    expect(Array.from(rgb)).toEqual([118, 119, 120]);
  });

  test('converts neutral sRGB grey to Lab with RGBtoLAB', async () => {
    await lcmsReady;
    const inputRgb = new Uint8Array([128, 128, 128]);

    const lab = RGBtoLAB(inputRgb, null);

    expect(lab).toBeInstanceOf(Uint16Array);
    expect(lab).toHaveLength(3);
    // Lab(53.6, 0.5, 0.5) - neutral mid-grey. to get these values run the helper func 
    //labToIcc16Bit(). it does not give exacly perfect results due to rounding
    //and we want to keep the output check exact. 
    expect(Array.from(lab)).toEqual([35117, 32896, 32896]);
  });

  test('converts CMYK profile input white to Lab using ProfileInputToLAB', async () => {
    await lcmsReady;
    const cmykInput = new Uint16Array([0, 0, 0, 0]);

    const lab = ProfileInputToLAB(cmykInput, CMYK_PROFILE, 4);

    expect(lab).toBeInstanceOf(Uint16Array);
    expect(lab).toHaveLength(3);
    // Lab(96.5, 1.5, -2.6) - paper white (no ink)
    expect(Array.from(lab)).toEqual([63257, 33159, 32110]);
  });

  test('maps CMYK cyan to Lab using CMYKtoLAB', async () => {
    await lcmsReady;
    const cmykInput = new Uint16Array([65535, 0, 0, 0]);

    const lab = CMYKtoLAB(cmykInput, CMYK_PROFILE);

    expect(lab).toBeInstanceOf(Uint16Array);
    expect(lab).toHaveLength(3);
    // Lab(51.1, -39.5, -55.0) - cyan ink
    expect(Array.from(lab)).toEqual([33449, 22669, 18639]);
  });


  test('soft proofs sRGB input through a sample CMYK printer profile', async () => {
    await lcmsReady;
    const inputRgb = new Uint8Array([32, 128, 224]);

    const output = doRGBSoftProof(CMYK_PROFILE, inputRgb, 1, 1);

    expect(output).toBeInstanceOf(Uint8Array);
    expect(output).toHaveLength(3);
    expect(Array.from(output)).toEqual([0, 116, 195]);
  });
});
