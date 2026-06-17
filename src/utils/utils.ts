import type { ICCProfile, ImageObject } from "../types/types";

export type ColorModel = "CMYK" | "RGB";
export const readFileFromPublic = async (path: string): Promise<Uint8Array> => {
  const response = await fetch(path);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

export const flatRgbToStrings = (buf: ArrayLike<number>) => {
  const colorPatchesCount = 21;
  const out: string[] = [];
  for (let i = 0; i < colorPatchesCount; i++) {
    const r = buf[i * 3 + 0];
    const g = buf[i * 3 + 1];
    const b = buf[i * 3 + 2];
    out.push(`rgb(${r}, ${g}, ${b})`);
  }
  return out;
}

export const getImageColorModel = (image: ImageObject | null): ColorModel | null => {
  if (!image) return null;

  const normalizedColorSpace = image.colorSpace.toUpperCase();
  if (normalizedColorSpace.includes("CMYK")) return "CMYK";
  if (normalizedColorSpace.includes("RGB")) return "RGB";

  const mapping = image.mapping?.toUpperCase();
  if (mapping?.startsWith("CMYK")) return "CMYK";
  if (mapping?.startsWith("RGB")) return "RGB";

  // For decoded multichannel images (often reported with unknown colorspace/mapping),
  // treat 4-7 channels as CMYK-compatible so CMYK/multichannel profiles can be selected.
  if (image.channelCount >= 4 && image.channelCount <= 7) return "CMYK";

  return null;
};

export const inferColorModelFromLabel = (label: string): ColorModel | null => {
  const normalized = label.toUpperCase();
  if (normalized.includes("CMYK")) return "CMYK";

  const isCMYKLike = normalized
    .split(/[^A-Z]+/)
    .some(
      (token) =>
        token.length === 4 &&
        ["C", "M", "Y", "K"].every((channel) => token.includes(channel)),
    );

  if (isCMYKLike) {
    return "CMYK";
  }

  if (normalized.includes("RGB") || normalized.includes("SRGB")) return "RGB";
  return null;
};

const getChannelCountFromIccSignature = (signature: string): number | null => {
  if (signature === "RGB") return 3;
  if (signature === "CMYK") return 4;

  const genericColorSpaceMatch = signature.match(/^([1-9A-F])CLR$/);
  if (genericColorSpaceMatch) {
    return parseInt(genericColorSpaceMatch[1], 16);
  }

  const multiChannelMatch = signature.match(/^MCH([1-9A-F])$/);
  if (multiChannelMatch) {
    return parseInt(multiChannelMatch[1], 16);
  }

  return null;
};

export const getProfileColorModel = (profile: ICCProfile): ColorModel | null => {
  if (profile.bytes && profile.bytes.length >= 20) {
    const signature = new TextDecoder("ascii")
      .decode(profile.bytes.slice(16, 20))
      .trim()
      .toUpperCase();

    if (signature === "RGB") return "RGB";

    // Treat 4-7 channel ICC profiles as CMYK-compatible for CMYK source images.
    const channelCount = getChannelCountFromIccSignature(signature);
    if (channelCount !== null && channelCount >= 4 && channelCount <= 7) {
      return "CMYK";
    }
  }

  return inferColorModelFromLabel(profile.label);
};

export const labToIcc16Bit = (l: number, a: number, b: number): Uint16Array => {
  const L_16bit = Math.round((l / 100) * 65535);
  const a_16bit = Math.round(32768 + a * 256);
  const b_16bit = Math.round(32768 + b * 256);
  return new Uint16Array([L_16bit, a_16bit, b_16bit]);
};
