/// <reference lib="webworker" />

import {
  convertImageAssetWithProfile,
} from "./conversionService";
import type {
  ConvertImageWorkerMessage,
  ConvertImageWorkerRequest,
} from "./conversionWorkerMessages";

self.onmessage = async (event: MessageEvent<ConvertImageWorkerRequest>) => {
  const message = event.data;

  if (message.type !== "convert") {
    return;
  }

  try {
    const result = await convertImageAssetWithProfile(
      message.imageAsset,
      message.profileBytes,
      message.options,
    );

    const response: ConvertImageWorkerMessage = {
      type: "result",
      requestId: message.requestId,
      blob: result.blob,
      mimeType: result.mimeType,
      width: result.width,
      height: result.height,
    };

    self.postMessage(response);
  } catch (error) {
    const response: ConvertImageWorkerMessage = {
      type: "error",
      requestId: message.requestId,
      message: error instanceof Error ? error.message : "Conversion failed",
    };

    self.postMessage(response);
  }
};
