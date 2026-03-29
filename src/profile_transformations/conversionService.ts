import { lcmsReady } from "./lcmsSingleton";
import { CMYKtoLAB, doRGBSoftProof, LABtoRGB } from "./profileTransformations";

export type ConversionOutputFormat = "png";

export interface ConvertImageOptions {
  outputFormat?: ConversionOutputFormat;
  preserveAlpha?: boolean;
}

export interface ConvertedImageResult {
  blob: Blob;
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

interface RgbExtractionResult {
  rgb: Uint8Array;
  alpha: Uint8Array | null;
}

const cmykToRgb = (
  c: number,
  m: number,
  y: number,
  k: number,
): [number, number, number] => {
  return [
    Math.round(255 * (1 - c / 255) * (1 - k / 255)),
    Math.round(255 * (1 - m / 255) * (1 - k / 255)),
    Math.round(255 * (1 - y / 255) * (1 - k / 255)),
  ];
};

const extractRgbAndAlpha = (
  image: ConversionImageAsset,
): RgbExtractionResult => {
  const { data, mapping, width, height } = image;
  const pixelCount = width * height;

  if (mapping === "RGB") {
    return { rgb: data, alpha: null };
  }

  if (mapping === "RGBA") {
    const rgb = new Uint8Array(pixelCount * 3);
    const alpha = new Uint8Array(pixelCount);

    for (let i = 0, j = 0, k = 0; i < data.length; i += 4, j += 3, k += 1) {
      rgb[j] = data[i];
      rgb[j + 1] = data[i + 1];
      rgb[j + 2] = data[i + 2];
      alpha[k] = data[i + 3];
    }

    return { rgb, alpha };
  }

  if (mapping === "I") {
    const rgb = new Uint8Array(pixelCount * 3);

    for (let i = 0, j = 0; i < data.length; i += 1, j += 3) {
      const v = data[i];
      rgb[j] = v;
      rgb[j + 1] = v;
      rgb[j + 2] = v;
    }

    return { rgb, alpha: null };
  }

  if (mapping === "CMYK") {
    const rgb = new Uint8Array(pixelCount * 3);

    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
      const [r, g, b] = cmykToRgb(
        data[i],
        data[i + 1],
        data[i + 2],
        data[i + 3],
      );
      rgb[j] = r;
      rgb[j + 1] = g;
      rgb[j + 2] = b;
    }

    return { rgb, alpha: null };
  }

  if (mapping === "CMYKA") {
    const rgb = new Uint8Array(pixelCount * 3);
    const alpha = new Uint8Array(pixelCount);

    for (let i = 0, j = 0, k = 0; i < data.length; i += 5, j += 3, k += 1) {
      const [r, g, b] = cmykToRgb(
        data[i],
        data[i + 1],
        data[i + 2],
        data[i + 3],
      );
      rgb[j] = r;
      rgb[j + 1] = g;
      rgb[j + 2] = b;
      alpha[k] = data[i + 4];
    }

    return { rgb, alpha };
  }

  throw new Error(`Unsupported mapping for conversion: ${mapping ?? "null"}`);
};

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

  if (outputFormat !== "png") {
    throw new Error(`Unsupported output format: ${outputFormat}`);
  }

  //here take cmyk image and profile and convert to lab, store the lab, then convert to rgb with monitor profile
  const cmyk8 = extractCmyk8(imageAsset);
  let lab: Uint16Array;

  try {
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
    lab,
    mimeType: "image/png",
    width: imageAsset.width,
    height: imageAsset.height,
  };
};
