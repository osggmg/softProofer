import type {
  ConversionImageAsset,
  ConvertImageOptions,
} from "./conversionService";

export interface ConvertImageWorkerRequest {
  type: "convert";
  requestId: number;
  imageAsset: ConversionImageAsset;
  profileBytes: Uint8Array;
  options?: ConvertImageOptions;
}

export interface ConvertImageWorkerSuccess {
  type: "result";
  requestId: number;
  blob: Blob;
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
