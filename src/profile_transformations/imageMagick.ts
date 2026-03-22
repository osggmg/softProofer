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

  const bytes =
    input instanceof Uint8Array
      ? input
      : new Uint8Array(await input.arrayBuffer());

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
          });
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};
