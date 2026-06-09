import { useEffect, useRef, useState } from "react";
import type { ICCProfile, ImageObject, ConvertedPixelDataBySide } from "../types/types";
import type {
  ConvertImageWorkerMessage,
  ConvertImageWorkerRequest,
} from "./conversionWorkerMessages";
import { NO_MONITOR_PROFILE_VALUE } from "../utils/constants";

type Side = "left" | "right";

interface UseConversionWorkerParams {
  loadedImages: ImageObject[];
  availableICCProfiles: ICCProfile[];
  availableMonitorProfiles: ICCProfile[];
  selectedMonitorProfileName: string;
  gamutWarningEnabled: boolean;
}

export const useConversionWorker = ({
  loadedImages,
  availableICCProfiles,
  availableMonitorProfiles,
  selectedMonitorProfileName,
  gamutWarningEnabled,
}: UseConversionWorkerParams) => {
  const [convertedImageLeftUrl, setConvertedImageLeftUrl] = useState<string>("");
  const [convertedImageRightUrl, setConvertedImageRightUrl] =
    useState<string>("");

  const [conversionErrorLeft, setConversionErrorLeft] = useState<string>("");
  const [conversionErrorRight, setConversionErrorRight] = useState<string>("");

  const [isConvertingLeft, setIsConvertingLeft] = useState(false);
  const [isConvertingRight, setIsConvertingRight] = useState(false);

  const requestCounterRef = useRef(0);
  const activeRequestIdLeftRef = useRef(0);
  const activeRequestIdRightRef = useRef(0);
  const requestTargetRef = useRef<Map<number, Side>>(new Map());
  const pixelDataRef = useRef<ConvertedPixelDataBySide>({
    left: null,
    right: null,
  });

  const conversionWorkerRef = useRef<Worker | null>(null);

  function clearSideResult(side: Side) {
    pixelDataRef.current[side] = null;
    if (side === "left") {
      setConvertedImageLeftUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return "";
      });

      setConversionErrorLeft("");
      setIsConvertingLeft(false);
      return;
    }

    setConvertedImageRightUrl((prevUrl) => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return "";
    });

    setConversionErrorRight("");
    setIsConvertingRight(false);
  }

  const triggerConversionForSide = (
    side: Side,
    imageId: string | null,
    cmykProfileName: string,
    monitorProfileName: string = selectedMonitorProfileName,
    nextGamutWarningEnabled: boolean = gamutWarningEnabled,
  ) => {
    const selectedImage = loadedImages.find((img) => img.id === imageId) ?? null;
    const selectedICCProfile =
      availableICCProfiles.find((p) => p.label === cmykProfileName) ?? null;
    const selectedMonitorProfile =
      monitorProfileName === NO_MONITOR_PROFILE_VALUE
        ? null
        : (availableMonitorProfiles.find((p) => p.label === monitorProfileName) ??
            null);

    if (!selectedImage || !selectedICCProfile?.bytes) {
      clearSideResult(side);
      return;
    }

    requestCounterRef.current += 1;
    const requestId = requestCounterRef.current;
    requestTargetRef.current.set(requestId, side);

    if (side === "left") {
      activeRequestIdLeftRef.current = requestId;
      setIsConvertingLeft(true);
      setConversionErrorLeft("");
    } else {
      activeRequestIdRightRef.current = requestId;
      setIsConvertingRight(true);
      setConversionErrorRight("");
    }

    const request: ConvertImageWorkerRequest = {
      type: "convert",
      requestId,
      imageAsset: {
        width: selectedImage.width,
        height: selectedImage.height,
        data: selectedImage.data,
        mapping: selectedImage.mapping,
      },
      cmykProfileBytes: selectedICCProfile.bytes,
      rgbProfileBytes: selectedMonitorProfile?.bytes ?? null,
      options: {
        outputFormat: "png",
        preserveAlpha: false,
        gamutWarningEnabled: nextGamutWarningEnabled,
      },
    };

    conversionWorkerRef.current?.postMessage(request);
  };

  useEffect(() => {
    const worker = new Worker(new URL("./conversion.worker.ts", import.meta.url), {
      type: "module",
    });
    conversionWorkerRef.current = worker;

    worker.onerror = (e) => {
      console.error("Worker uncaught error:", e);
      setConversionErrorLeft(`Worker error: ${e.message}`);
      setConversionErrorRight(`Worker error: ${e.message}`);
      setIsConvertingLeft(false);
      setIsConvertingRight(false);
    };

    const onWorkerMessage = (event: MessageEvent<ConvertImageWorkerMessage>) => {
      const message = event.data;

      const target = requestTargetRef.current.get(message.requestId);
      if (!target) return;

      if (
        target === "left" &&
        message.requestId !== activeRequestIdLeftRef.current
      ) {
        return;
      }

      if (
        target === "right" &&
        message.requestId !== activeRequestIdRightRef.current
      ) {
        return;
      }

      requestTargetRef.current.delete(message.requestId);

      if (message.type === "error") {
        console.error("Worker conversion failed:", message.message);
        if (target === "left") {
          setConversionErrorLeft(message.message);
          setIsConvertingLeft(false);
        } else {
          setConversionErrorRight(message.message);
          setIsConvertingRight(false);
        }
        return;
      }

      pixelDataRef.current[target] = {
        rgb: message.rgb,
        lab: message.lab,
        width: message.width,
        height: message.height,
      };
      const nextUrl = URL.createObjectURL(message.blob);

      if (target === "left") {
        setConversionErrorLeft("");
        setIsConvertingLeft(false);

        setConvertedImageLeftUrl((prevUrl) => {
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          return nextUrl;
        });
      } else {
        setConversionErrorRight("");
        setIsConvertingRight(false);

        setConvertedImageRightUrl((prevUrl) => {
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          return nextUrl;
        });
      }
    };

    worker.addEventListener("message", onWorkerMessage);

    return () => {
      worker.removeEventListener("message", onWorkerMessage);
      worker.terminate();
      conversionWorkerRef.current = null;
      setConvertedImageLeftUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return "";
      });
      setConvertedImageRightUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return "";
      });
    };
  }, []);

  return {
    convertedImageLeftUrl,
    convertedImageRightUrl,
    conversionErrorLeft,
    conversionErrorRight,
    isConvertingLeft,
    isConvertingRight,
    pixelDataRef,
    triggerConversionForSide,
  };
};
