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

  return null;
};

export const inferColorModelFromLabel = (label: string): ColorModel | null => {
  const normalized = label.toUpperCase();
  if (normalized.includes("CMYK")) return "CMYK";

  const hasCmykPermutation = normalized
    .split(/[^A-Z]+/)
    .some(
      (token) =>
        token.length === 4 &&
        ["C", "M", "Y", "K"].every((channel) => token.includes(channel)),
    );

  if (hasCmykPermutation) {
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

    // Treat any 4-channel ICC profile as CMYK-compatible so channel mapping can reorder C/M/Y/K as needed.
    if (getChannelCountFromIccSignature(signature) === 4) return "CMYK";
  }

  return inferColorModelFromLabel(profile.label);
};