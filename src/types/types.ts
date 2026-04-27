import type { DecodedImage } from "../profile_transformations/imageMagick";


export type ICCProfile = {
  label: string;
  bytes?: Uint8Array;
};

export type RGBTriplet = [number, number, number];

export interface ImageObject extends DecodedImage {
  id: string;
  label: string;
}

export interface ConvertedPixelData {
  rgb: Uint8Array;
  lab: Uint16Array;
  width: number;
  height: number;
}

export interface ConvertedPixelDataBySide {
  left: ConvertedPixelData | null;
  right: ConvertedPixelData | null;
}

export interface PipetteValue {
  x: number;
  y: number;
  rgb: [number, number, number];
  lab: [number, number, number];
}