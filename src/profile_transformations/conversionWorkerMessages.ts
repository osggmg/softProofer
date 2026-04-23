import type {
  ConversionImageAsset,
  ConvertImageOptions,
} from "./conversionService";

export interface ConvertImageWorkerRequest {
  type: "convert";
  requestId: number;
  imageAsset: ConversionImageAsset;
  cmykProfileBytes: Uint8Array;
  rgbProfileBytes: Uint8Array | null;
  options?: ConvertImageOptions;
}

export interface ConvertImageWorkerSuccess {
  type: "result";
  requestId: number;
  blob: Blob;
  rgb: Uint8Array;
  lab: Uint16Array;
  mimeType: string;
  width: number;
  height: number;
}

export interface ConvertImageWorkerError {
  type: "error";
  requestId: number;
  message: string;
}

export type ConvertImageWorkerMessage =
  | ConvertImageWorkerSuccess
  | ConvertImageWorkerError;
