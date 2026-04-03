import { LcmsService } from "./lcmsService";
import { lcms } from "./lcmsSingleton";
import {
  TYPE_RGB_8,
  INTENT_RELATIVE_COLORIMETRIC,
  TYPE_CMYK_16,
  TYPE_Lab_16,
  INTENT_ABSOLUTE_COLORIMETRIC,
} from "lcms-wasm";

import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat
} from "@imagemagick/magick-wasm";

let hSRGB: number | null = null;

function getSRGB() {
  if (hSRGB === null) hSRGB = lcms.createSRGBProfile();
  return hSRGB;
}

let hLAB: number | null = null;

const TRANSFORM_CHUNK_PIXELS = 262144;

function getLAB() {
  if (hLAB === null) hLAB = lcms.createLab4Profile();
  return hLAB;
}

export const doRGBSoftProof = (
  printerProfile: Uint8Array,
  inputRgb: Uint8Array,
  width: number,
  height: number,
) => {
  const hPrinterProfile = lcms.openProfileFromBytes(printerProfile);

  const transform = lcms.createProofingTransform({
    inputProfile: getSRGB(),
    outputProfile: getSRGB(),
    proofingProfile: hPrinterProfile,
    intent: 0,
    proofingIntent: 1,
    flags: LcmsService.FLAGS.SOFTPROOFING,
  });

  try {
    return lcms.doTransform(transform, inputRgb, width * height) as Uint8Array;
  } finally {
    lcms.deleteTransform(transform);
    lcms.closeProfile(hPrinterProfile);
  }
};

const createCmykToLabTransform = (cmykProfileHandle: number) => {
  const labProfile = getLAB();

  const transform = lcms.createTransform(
    cmykProfileHandle,
    TYPE_CMYK_16,
    labProfile,
    TYPE_Lab_16,
    INTENT_ABSOLUTE_COLORIMETRIC,
    0x0100,
  );

  if (!transform) {
    throw new Error("Could not create CMYK -> Lab transform");
  }

  return transform;
};

const createLABToRGBTransform = (rgbProfileHandle?: number) => {
  const rgbProfile = rgbProfileHandle ?? getSRGB();
  const labProfile = getLAB();

  const transform = lcms.createTransform(
    labProfile,
    TYPE_Lab_16,
    rgbProfile,
    TYPE_RGB_8,
    INTENT_RELATIVE_COLORIMETRIC,
    0,
  );

  if (!transform) {
    throw new Error("Could not create Lab -> RGB transform");
  }

  return transform;
};

export const CMYKtoLAB = (input: Uint16Array, CMYKProfile: Uint8Array) => {
  if (input.length % 4 !== 0) {
    throw new Error(
      `Invalid CMYK input length ${input.length}. Expected 4 channels per pixel.`,
    );
  }

  const cmykProfileHandle = lcms.openProfileFromBytes(CMYKProfile);

  if (!cmykProfileHandle) {
    throw new Error("Could not open CMYK profile");
  }

  const transform = createCmykToLabTransform(cmykProfileHandle);
  const pixelCount = input.length / 4;

  try {
    const output = new Uint16Array(pixelCount * 3);

    for (
      let pixelOffset = 0;
      pixelOffset < pixelCount;
      pixelOffset += TRANSFORM_CHUNK_PIXELS
    ) {
      const chunkPixels = Math.min(
        TRANSFORM_CHUNK_PIXELS,
        pixelCount - pixelOffset,
      );
      const inputStart = pixelOffset * 4;
      const inputEnd = inputStart + chunkPixels * 4;
      const chunkInput = input.subarray(inputStart, inputEnd);

      const chunkOutput = lcms.doTransform(
        transform,
        chunkInput,
        chunkPixels,
      ) as Uint16Array;

      if (chunkOutput.length !== chunkPixels * 3) {
        throw new Error(
          `CMYK to Lab output length mismatch. Expected ${chunkPixels * 3}, got ${chunkOutput.length}.`,
        );
      }

      output.set(chunkOutput, pixelOffset * 3);
    }

    return output;
  } finally {
    lcms.deleteTransform(transform);
    lcms.closeProfile(cmykProfileHandle);
  }
};

export const LABtoRGB = (input: Uint16Array, RGBProfileBytes?: Uint8Array) => {
  if (input.length % 3 !== 0) {
    throw new Error(
      `Invalid Lab input length ${input.length}. Expected 3 channels per pixel.`,
    );
  }

  let rgbProfileHandle: number | undefined;

  if (RGBProfileBytes) {
    rgbProfileHandle = lcms.openProfileFromBytes(RGBProfileBytes);

    if (!rgbProfileHandle) {
      throw new Error("Could not open RGB profile");
    }
  }

  const transform = createLABToRGBTransform(rgbProfileHandle);
  const pixelCount = input.length / 3;

  try {
    const output = new Uint8Array(pixelCount * 3);

    for (
      let pixelOffset = 0;
      pixelOffset < pixelCount;
      pixelOffset += TRANSFORM_CHUNK_PIXELS
    ) {
      const chunkPixels = Math.min(
        TRANSFORM_CHUNK_PIXELS,
        pixelCount - pixelOffset,
      );
      const inputStart = pixelOffset * 3;
      const inputEnd = inputStart + chunkPixels * 3;
      const chunkInput = input.subarray(inputStart, inputEnd);

      const chunkOutput = lcms.doTransform(
        transform,
        chunkInput,
        chunkPixels,
      ) as Uint8Array;

      if (chunkOutput.length !== chunkPixels * 3) {
        throw new Error(
          `Lab to RGB output length mismatch. Expected ${chunkPixels * 3}, got ${chunkOutput.length}.`,
        );
      }

      output.set(chunkOutput, pixelOffset * 3);
    }

    return output;
  } finally {
    lcms.deleteTransform(transform);
    if (rgbProfileHandle) {
      lcms.closeProfile(rgbProfileHandle);
    }
  }
};

async function decodeToRGBA16(file: File) {
  const wasmUrl = new URL(
    "../../../node_modules/@imagemagick/magick-wasm/dist/magick.wasm",
    import.meta.url,
  ).href;
  const wasmBytes = await fetch(wasmUrl).then(r => r.arrayBuffer());
  await initializeImageMagick(new Uint8Array(wasmBytes));

  const bytes = new Uint8Array(await file.arrayBuffer());

  return new Promise((resolve) => {
    ImageMagick.read(bytes, (image) => {
      const width = image.width;
      const height = image.height;

      const pixels = new Uint16Array(width * height * 4);

      image.getPixels(
        pixels
      );

      resolve({ width, height, pixels });
    });
  });
}