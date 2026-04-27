import { lcmsReady } from "./lcmsSingleton";
import { CMYKtoLAB, LABtoRGB, RGBtoLAB } from "./profileTransformations";

export type ConversionOutputFormat = "png";

export interface ConvertImageOptions {
  outputFormat?: ConversionOutputFormat;
  preserveAlpha?: boolean;
  gamutWarningEnabled?: boolean;
  gamutWarningColor?: [number, number, number];
}

export interface ConvertedImageResult {
  blob: Blob;
  rgb: Uint8Array;
  lab: Uint16Array;
  mimeType: string;
  width: number;
  height: number;
}

export interface ConversionImageAsset {
  width: number;
  height: number;
  data: Uint8Array;
  mapping: string | null;
}

const LAB_L_SCALE = 100.0 / 65535.0;
const LAB_AB_SCALE = 255.0 / 65535.0;

const TOLERANCE_DELTA = 0.5;

const deltaE76Squared = (
  l1: number,
  a1: number,
  b1: number,
  l2: number,
  a2: number,
  b2: number,
): number => {
  const dL = l1 - l2;
  const da = a1 - a2;
  const db = b1 - b2;

  return dL * dL + da * da + db * db;
};

const deltaE2000 = (
  l1: number,
  a1: number,
  b1: number,
  l2: number,
  a2: number,
  b2: number,
): number => {
  const deg2rad = Math.PI / 180;
  const rad2deg = 180 / Math.PI;

  const c1 = Math.sqrt(a1 * a1 + b1 * b1);
  const c2 = Math.sqrt(a2 * a2 + b2 * b2);
  const cBar = (c1 + c2) / 2;

  const cBar7 = cBar ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 25 ** 7)));

  const a1Prime = (1 + g) * a1;
  const a2Prime = (1 + g) * a2;
  const c1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const c2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);

  const h1Prime =
    c1Prime === 0 ? 0 : (Math.atan2(b1, a1Prime) * rad2deg + 360) % 360;
  const h2Prime =
    c2Prime === 0 ? 0 : (Math.atan2(b2, a2Prime) * rad2deg + 360) % 360;

  const deltaLPrime = l2 - l1;
  const deltaCPrime = c2Prime - c1Prime;

  let deltaHPrime = 0;
  if (c1Prime !== 0 && c2Prime !== 0) {
    const hueDiff = h2Prime - h1Prime;
    if (Math.abs(hueDiff) <= 180) {
      deltaHPrime = hueDiff;
    } else if (hueDiff > 180) {
      deltaHPrime = hueDiff - 360;
    } else {
      deltaHPrime = hueDiff + 360;
    }
  }

  const deltaBigHPrime =
    2 * Math.sqrt(c1Prime * c2Prime) * Math.sin((deltaHPrime / 2) * deg2rad);

  const lBarPrime = (l1 + l2) / 2;
  const cBarPrime = (c1Prime + c2Prime) / 2;

  let hBarPrime = h1Prime + h2Prime;
  if (c1Prime !== 0 && c2Prime !== 0) {
    if (Math.abs(h1Prime - h2Prime) > 180) {
      hBarPrime =
        h1Prime + h2Prime < 360
          ? (h1Prime + h2Prime + 360) / 2
          : (h1Prime + h2Prime - 360) / 2;
    } else {
      hBarPrime = (h1Prime + h2Prime) / 2;
    }
  }

  const t =
    1 -
    0.17 * Math.cos((hBarPrime - 30) * deg2rad) +
    0.24 * Math.cos(2 * hBarPrime * deg2rad) +
    0.32 * Math.cos((3 * hBarPrime + 6) * deg2rad) -
    0.2 * Math.cos((4 * hBarPrime - 63) * deg2rad);

  const hueOffset = (hBarPrime - 275) / 25;
  const deltaTheta = 30 * Math.exp(-(hueOffset * hueOffset));
  const cBarPrime7 = cBarPrime ** 7;
  const rC = 2 * Math.sqrt(cBarPrime7 / (cBarPrime7 + 25 ** 7));
  const sL =
    1 +
    (0.015 * (lBarPrime - 50) * (lBarPrime - 50)) /
      Math.sqrt(20 + (lBarPrime - 50) * (lBarPrime - 50));
  const sC = 1 + 0.045 * cBarPrime;
  const sH = 1 + 0.015 * cBarPrime * t;
  const rT = -Math.sin(2 * deltaTheta * deg2rad) * rC;

  const lightnessTerm = deltaLPrime / sL;
  const chromaTerm = deltaCPrime / sC;
  const hueTerm = deltaBigHPrime / sH;

  return Math.sqrt(
    lightnessTerm * lightnessTerm +
      chromaTerm * chromaTerm +
      hueTerm * hueTerm +
      rT * chromaTerm * hueTerm,
  );
};

// Returns a per-pixel mask: 0 = in gamut, 255 = out of gamut.
// Lab16 encoding (LCMS): L = val*(100/65535), a/b = val*(255/65535)-128
function createGamutCheckMask(
  rgbInput: Uint8Array,
  labInput: Uint16Array,
  delta: number,
  rgbProfileBytes: Uint8Array | null,
): Uint8Array {
  const USE_DE2000 = true;
  const newLAB = RGBtoLAB(rgbInput, rgbProfileBytes);

  const pixelCount = labInput.length / 3;
  const mask = new Uint8Array(pixelCount);
  const deltaSq = delta * delta;

  for (let i = 0; i < pixelCount; i++) {
    const base = i * 3;

    const l1 = labInput[base] * LAB_L_SCALE;
    const a1 = labInput[base + 1] * LAB_AB_SCALE - 128.0;
    const b1 = labInput[base + 2] * LAB_AB_SCALE - 128.0;

    const l2 = newLAB[base] * LAB_L_SCALE;
    const a2 = newLAB[base + 1] * LAB_AB_SCALE - 128.0;
    const b2 = newLAB[base + 2] * LAB_AB_SCALE - 128.0;

    const difference = USE_DE2000
      ? deltaE2000(l1, a1, b1, l2, a2, b2)
      : deltaE76Squared(l1, a1, b1, l2, a2, b2);

    if (USE_DE2000 ? difference > delta : difference > deltaSq) {
      mask[i] = 255;
    }
  }

  return mask;
}

const composeRgba = (
  rgb: Uint8Array,
  alpha: Uint8Array | null,
  pixelCount: number,
  preserveAlpha: boolean,
): Uint8Array => {
  const rgba = new Uint8Array(pixelCount * 4);

  for (let i = 0, j = 0, k = 0; i < rgb.length; i += 3, j += 4, k += 1) {
    rgba[j] = rgb[i];
    rgba[j + 1] = rgb[i + 1];
    rgba[j + 2] = rgb[i + 2];
    rgba[j + 3] = preserveAlpha && alpha ? alpha[k] : 255;
  }

  return rgba;
};

const encodeRgbaToPngBlob = async (
  rgba: Uint8Array,
  width: number,
  height: number,
): Promise<Blob> => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not get 2D context in conversion worker");
  }

  const clamped = new Uint8ClampedArray(rgba.byteLength);
  clamped.set(rgba);

  const imageData = new ImageData(clamped, width, height);
  context.putImageData(imageData, 0, 0);

  return canvas.convertToBlob({ type: "image/png" });
};

function u8to16(src: Uint8Array): Uint16Array {
  const dst = new Uint16Array(src.length);
  for (let i = 0; i < src.length; i++) {
    dst[i] = src[i] * 257; // same as (v << 8) | v
  }
  return dst;
}

const extractCmyk8 = (image: ConversionImageAsset): Uint8Array => {
  const pixelCount = image.width * image.height;

  if (image.mapping === "CMYK") {
    const expectedLength = pixelCount * 4;
    if (image.data.length !== expectedLength) {
      throw new Error(
        `Invalid CMYK buffer length: expected ${expectedLength}, got ${image.data.length}`,
      );
    }
    return image.data;
  }

  if (image.mapping === "CMYKA") {
    const expectedLength = pixelCount * 5;
    if (image.data.length !== expectedLength) {
      throw new Error(
        `Invalid CMYKA buffer length: expected ${expectedLength}, got ${image.data.length}`,
      );
    }

    const cmyk = new Uint8Array(pixelCount * 4);
    for (let i = 0, j = 0; i < image.data.length; i += 5, j += 4) {
      cmyk[j] = image.data[i];
      cmyk[j + 1] = image.data[i + 1];
      cmyk[j + 2] = image.data[i + 2];
      cmyk[j + 3] = image.data[i + 3];
    }

    return cmyk;
  }

  throw new Error(
    `CMYK conversion requires CMYK/CMYKA mapping, got ${image.mapping ?? "null"}`,
  );
};

export const convertImageAssetWithProfile = async (
  imageAsset: ConversionImageAsset,
  cmykProfileBytes: Uint8Array,
  rgbProfileBytes: Uint8Array | null,
  options: ConvertImageOptions = {},
): Promise<ConvertedImageResult> => {
  await lcmsReady;

  const outputFormat = options.outputFormat ?? "png";
  const preserveAlpha = options.preserveAlpha ?? true;
  const gamutWarningEnabled = options.gamutWarningEnabled ?? false;

  if (outputFormat !== "png") {
    throw new Error(`Unsupported output format: ${outputFormat}`);
  }

  const cmyk8 = extractCmyk8(imageAsset); //not sure if we need this ok. later perform channel mapping here
  let lab: Uint16Array;

  try {
    //later depending on what we have we perform channel mapping or use other functions e.g. rgbtolab etc
    lab = CMYKtoLAB(u8to16(cmyk8), cmykProfileBytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `CMYK to Lab failed (mapping=${imageAsset.mapping ?? "null"}, pixels=${imageAsset.width * imageAsset.height}, cmykBytes=${cmyk8.length}): ${message}`,
    );
  }

  let rgb: Uint8Array;

  try {
    rgb = rgbProfileBytes ? LABtoRGB(lab, rgbProfileBytes) : LABtoRGB(lab);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Lab to RGB failed (labValues=${lab.length}, pixels=${imageAsset.width * imageAsset.height}): ${message}`,
    );
  }

  const mask = createGamutCheckMask(rgb, lab, TOLERANCE_DELTA, rgbProfileBytes);
  console.log(mask)

  if (gamutWarningEnabled) {
    const [wr, wg, wb] = options.gamutWarningColor ?? [255, 0, 255];
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] !== 0) {
        rgb[i * 3]     = wr;
        rgb[i * 3 + 1] = wg;
        rgb[i * 3 + 2] = wb;
      }
    }
  }

  //we need alpha (opacity channel) to encode into png. usually we dont need alpha in such a workflow, but later we can add support for that
  const rgba = composeRgba(
    rgb,
    null,
    imageAsset.width * imageAsset.height,
    preserveAlpha,
  );

  const blob = await encodeRgbaToPngBlob(
    rgba,
    imageAsset.width,
    imageAsset.height,
  );
  
  return {
    blob,
    rgb,
    lab,
    mimeType: "image/png",
    width: imageAsset.width,
    height: imageAsset.height,
  };
};
