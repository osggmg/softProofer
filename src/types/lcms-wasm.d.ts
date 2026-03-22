declare module "lcms-wasm" {
  export type ProfileHandle = number;
  export type TransformHandle = number;

  export interface ProofingTransformOptions {
    inputProfile: ProfileHandle;
    outputProfile: ProfileHandle;
    proofingProfile: ProfileHandle;
    intent: number;
    proofingIntent: number;
    flags?: number;
  }

  export interface Lcms {
    cmsCreate_sRGBProfile(): number;
    cmsCreateLab4Profile(): number;

    cmsCreateTransform(
      inputProfile: number,
      inputFormat: number,
      outputProfile: number,
      outputFormat: number,
      intent: number,
      flags: number,
    ): number;

    cmsCreateProofingTransform(
      inputProfile: number,
      inputFormat: number,
      outputProfile: number,
      outputFormat: number,
      proofingProfile: number,
      intent: number,
      proofingIntent: number,
      flags: number,
    ): number;

    cmsOpenProfileFromMem(bytes: Uint8Array, size: number): number;
    cmsCloseProfile(profile: number): void;

    cmsFormatterForColorspaceOfProfile(
      profile: number,
      bytesPerSample: number,
      isFloat: number,
    ): number;

    cmsGetColorSpace(profile: number): number;

    cmsDoTransform(
      transform: number,
      input: Uint8Array | Uint16Array | Float32Array | Float64Array,
      pixels: number,
    ): Uint8Array | Uint16Array | Float32Array | Float64Array;

    cmsDeleteTransform(transform: number): void;
  }

  export interface InstantiateOptions {
    locateFile?: (name: string) => string;
  }

  export default function instantiate(
    options?: InstantiateOptions,
  ): Promise<Lcms>;

  export const TYPE_RGB_8: number;
  export const TYPE_RGBA_8: number;
  export const TYPE_RGB_16: number;

  export const TYPE_CMYK_8: number;
  export const TYPE_CMYK_16: number;

  export const TYPE_Lab_8: number;
  export const TYPE_Lab_16: number;
  export const TYPE_Lab_DBL: number;

  export const TYPE_GRAY_8: number;
  export const TYPE_GRAY_16: number;

  export const INTENT_PERCEPTUAL: number;
  export const INTENT_RELATIVE_COLORIMETRIC: number;
  export const INTENT_SATURATION: number;
  export const INTENT_ABSOLUTE_COLORIMETRIC: number;

  const lcms: Lcms;
  export default lcms;
}
