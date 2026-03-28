import { LcmsService } from "./lcmsService";
import { lcms } from "./lcmsSingleton";
import {
  TYPE_RGB_8,
  INTENT_RELATIVE_COLORIMETRIC,
  TYPE_CMYK_16,
  TYPE_Lab_DBL,
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
    TYPE_Lab_DBL,
    INTENT_RELATIVE_COLORIMETRIC,
    0,
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
    TYPE_Lab_DBL,
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
  const cmykProfileHandle = lcms.openProfileFromBytes(CMYKProfile);

  if (!cmykProfileHandle) {
    throw new Error("Could not open CMYK profile");
  }

  const transform = createCmykToLabTransform(cmykProfileHandle);

  try {
    return lcms.doTransform(transform, input, input.length / 4) as Float64Array;
  } finally {
    lcms.deleteTransform(transform);
    lcms.closeProfile(cmykProfileHandle);
  }
};

export const LABtoRGB = (input: Float64Array, RGBProfile?: Uint8Array) => {
  let rgbProfileHandle: number | undefined;

  if (RGBProfile) {
    rgbProfileHandle = lcms.openProfileFromBytes(RGBProfile);

    if (!rgbProfileHandle) {
      throw new Error("Could not open RGB profile");
    }
  }

  const transform = createLABToRGBTransform(rgbProfileHandle);

  try {
    return lcms.doTransform(transform, input, input.length / 3) as Uint8Array;
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