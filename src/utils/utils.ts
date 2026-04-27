import type { ImageObject } from "../components/MainPage";

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
  if (normalized.includes("RGB") || normalized.includes("SRGB")) return "RGB";
  return null;
};

export const getProfileColorModel = (profile: ICCProfile): ColorModel | null => {
  if (profile.bytes && profile.bytes.length >= 20) {
    const signature = new TextDecoder("ascii")
      .decode(profile.bytes.slice(16, 20))
      .trim()
      .toUpperCase();

    if (signature === "CMYK") return "CMYK";
    if (signature === "RGB") return "RGB";
  }

  return inferColorModelFromLabel(profile.label);
};