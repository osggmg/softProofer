import { lcmsReady } from "./lcmsSingleton";
import { doRGBSoftProof } from "./profileTransformations";

export type ConversionOutputFormat = "png";

export interface ConvertImageOptions {
  outputFormat?: ConversionOutputFormat;
  preserveAlpha?: boolean;
}

export interface ConvertedImageResult {
  blob: Blob;
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

const extractRgbAndAlpha = (image: ConversionImageAsset): RgbExtractionResult => {
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
      const [r, g, b] = cmykToRgb(data[i], data[i + 1], data[i + 2], data[i + 3]);
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
      const [r, g, b] = cmykToRgb(data[i], data[i + 1], data[i + 2], data[i + 3]);
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

export const convertImageAssetWithProfile = async (
  imageAsset: ConversionImageAsset,
  profileBytes: Uint8Array,
  options: ConvertImageOptions = {},
): Promise<ConvertedImageResult> => {
  await lcmsReady;

  const outputFormat = options.outputFormat ?? "png";
  const preserveAlpha = options.preserveAlpha ?? true;

  if (outputFormat !== "png") {
    throw new Error(`Unsupported output format: ${outputFormat}`);
  }

  const { rgb, alpha } = extractRgbAndAlpha(imageAsset);
  const convertedRgb = doRGBSoftProof(
    profileBytes,
    rgb,
    imageAsset.width,
    imageAsset.height,
  );

  const pixelCount = imageAsset.width * imageAsset.height;
  const rgba = composeRgba(convertedRgb, alpha, pixelCount, preserveAlpha);
  const blob = await encodeRgbaToPngBlob(rgba, imageAsset.width, imageAsset.height);

  return {
    blob,
    mimeType: "image/png",
    width: imageAsset.width,
    height: imageAsset.height,
  };
};
