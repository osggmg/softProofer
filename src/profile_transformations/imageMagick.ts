import {
  ImageMagick,
  initializeImageMagick,
  ColorSpace,
  type PixelChannel,
} from "@imagemagick/magick-wasm";
import wasmUrl from "@imagemagick/magick-wasm/magick.wasm?url";

let magickInitialized = false;

export const initImageMagick = async () => {
  if (magickInitialized) return;
  const wasmBytes = await fetch(wasmUrl).then((r) => r.arrayBuffer());
  await initializeImageMagick(new Uint8Array(wasmBytes));

  magickInitialized = true;
};

export type DecodedImage = {
  width: number;
  height: number;
  channelCount: number;
  colorSpace: string;
  channels: ReadonlyArray<PixelChannel>;
  data: Uint8Array;
  mapping: string | null;
  blob: Blob;
};

const getColorSpaceName = (colorSpace: number): string => {
  if (colorSpace === ColorSpace.RGB) return "RGB";
  if (colorSpace === ColorSpace.sRGB) return "sRGB";
  if (colorSpace === ColorSpace.CMYK) return "CMYK";
  if (colorSpace === ColorSpace.Gray) return "GRAY";
  if (colorSpace === ColorSpace.Lab) return "Lab";
  return `ColorSpace(${colorSpace})`;
};

const getPreferredMapping = (
  colorSpace: number,
  channelCount: number,
): string | null => {
  if (
    (colorSpace === ColorSpace.RGB || colorSpace === ColorSpace.sRGB) &&
    channelCount === 3
  ) {
    return "RGB";
  }

  if (
    (colorSpace === ColorSpace.RGB || colorSpace === ColorSpace.sRGB) &&
    channelCount === 4
  ) {
    return "RGBA";
  }

  if (colorSpace === ColorSpace.CMYK && channelCount === 4) {
    return "CMYK";
  }

  if (colorSpace === ColorSpace.CMYK && channelCount === 5) {
    return "CMYKA";
  }

  if (colorSpace === ColorSpace.Gray && channelCount === 1) {
    return "I";
  }

  return null;
};

export const decodeImage = async (
  input: File | Uint8Array,
): Promise<DecodedImage> => {
  await initImageMagick();

  const mimeType =
    input instanceof File && input.type
      ? input.type
      : "application/octet-stream";

  const bytes =
    input instanceof Uint8Array
      ? input
      : new Uint8Array(await input.arrayBuffer());

  const blobBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(blobBuffer).set(bytes);
  const sourceBlob = new Blob([blobBuffer], { type: mimeType });

  return new Promise((resolve, reject) => {
    try {
      ImageMagick.read(bytes, (image) => {
        const width = image.width;
        const height = image.height;
        const channelCount = image.channelCount;
        const channels = image.channels;
        const colorSpace = image.colorSpace;

        image.getPixels((pixels) => {
          const preferredMapping = getPreferredMapping(
            colorSpace,
            channelCount,
          );

          let data: Uint8Array | null = null;

          if (preferredMapping) {
            data = pixels.toByteArray(0, 0, width, height, preferredMapping);
          }

          if (!data) {
            // raw channel data in the image's current internal channel order
            data = pixels.getArea(0, 0, width, height);
          }

          if (!data) {
            reject(new Error("Failed to decode image pixel data."));
            return;
          }

          resolve({
            width,
            height,
            channelCount,
            colorSpace: getColorSpaceName(colorSpace),
            channels,
            data,
            mapping: preferredMapping,
            blob: sourceBlob,
          });
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};

const toRgbaBytes = (image: DecodedImage): Uint8Array => {
  const { data, mapping, width, height } = image;
  const pixelCount = width * height;

  if (mapping === "RGBA") {
    return data;
  }

  const rgba = new Uint8Array(pixelCount * 4);

  if (mapping === "RGB") {
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      rgba[j] = data[i];
      rgba[j + 1] = data[i + 1];
      rgba[j + 2] = data[i + 2];
      rgba[j + 3] = 255;
    }
    return rgba;
  }

  if (mapping === "I") {
    for (let i = 0, j = 0; i < data.length; i += 1, j += 4) {
      const gray = data[i];
      rgba[j] = gray;
      rgba[j + 1] = gray;
      rgba[j + 2] = gray;
      rgba[j + 3] = 255;
    }
    return rgba;
  }

  if (mapping === "CMYK") {
    for (let i = 0, j = 0; i < data.length; i += 4, j += 4) {
      const c = data[i] / 255;
      const m = data[i + 1] / 255;
      const y = data[i + 2] / 255;
      const k = data[i + 3] / 255;

      rgba[j] = Math.round(255 * (1 - c) * (1 - k));
      rgba[j + 1] = Math.round(255 * (1 - m) * (1 - k));
      rgba[j + 2] = Math.round(255 * (1 - y) * (1 - k));
      rgba[j + 3] = 255;
    }
    return rgba;
  }

  if (mapping === "CMYKA") {
    for (let i = 0, j = 0; i < data.length; i += 5, j += 4) {
      const c = data[i] / 255;
      const m = data[i + 1] / 255;
      const y = data[i + 2] / 255;
      const k = data[i + 3] / 255;
      const a = data[i + 4];

      rgba[j] = Math.round(255 * (1 - c) * (1 - k));
      rgba[j + 1] = Math.round(255 * (1 - m) * (1 - k));
      rgba[j + 2] = Math.round(255 * (1 - y) * (1 - k));
      rgba[j + 3] = a;
    }
    return rgba;
  }

  throw new Error(`Unsupported pixel mapping for preview: ${mapping ?? "null"}`);
};

export const createPreviewObjectUrl = async (
  decoded: DecodedImage,
): Promise<string> => {
  const rgba = toRgbaBytes(decoded);
  const clamped = new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  const canvas = new OffscreenCanvas(decoded.width, decoded.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context for preview");
  ctx.putImageData(new ImageData(clamped, decoded.width, decoded.height), 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return URL.createObjectURL(blob);
};
