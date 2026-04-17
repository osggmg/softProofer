import { Flex, Heading, Text } from "@chakra-ui/react";
import { Checkbox } from "./../components/ui/checkbox";
import { ICCProfileUploader } from "./ICCProfileUploader";
import { ICCProfileSelector } from "./ICCProfileSelector";
import { useEffect, useMemo, useRef, useState } from "react";
import ImageCompare from "./ImageCompare";
import { ImageUploader } from "./ImageUploader";
import {
  decodeImage,
  type DecodedImage,
} from "../profile_transformations/imageMagick";
import { ImageSelector } from "./ImageSelector";
import type { ICCProfile } from "../types/types";
import type {
  ConvertImageWorkerMessage,
  ConvertImageWorkerRequest,
} from "../profile_transformations/conversionWorkerMessages";
import {
  cardboard_brown_HP_C500_Dark_Paper_Tint,
  eciCMYK_v2_basic_profile,
} from "../default_profiles_and_images/default_profiles/default_cmyk_profiles";
import { readDefaultImages } from "../default_profiles_and_images/default_profiles_and_images_utils";

export interface ImageObject extends DecodedImage {
  id: string;
  label: string;
}

const defaultICCProfiles: ICCProfile[] = [
  { label: "eciCMYK_v2_basic_profile", bytes: eciCMYK_v2_basic_profile },
  {
    label: "cardboard_brown_HP_C500_Dark_Paper_Tint",
    bytes: cardboard_brown_HP_C500_Dark_Paper_Tint,
  },
];

const defaultImages: ImageObject[] = await readDefaultImages();
const NO_MONITOR_PROFILE_VALUE = "No monitor profile (optional)";

const emptyMonitorProfileValue = { label: NO_MONITOR_PROFILE_VALUE }

export const MainPage = () => {

  const [selectedICCProfileNameLeft, setSelectedICCProfileNameLeft] =
    useState<string>("");
  const [selectedICCProfileNameRight, setSelectedICCProfileNameRight] =
    useState<string>("");

  const [selectedMonitorProfileName, setSelectedMonitorProfileName] =
    useState<string>(NO_MONITOR_PROFILE_VALUE);


  const [availableICCProfiles, setAvailableICCProfiles] =
    useState(defaultICCProfiles);
  const [availableMonitorProfiles, setAvailableMonitorProfiles] = useState<ICCProfile[]>([]);


  const [selectedImageIdLeft, setSelectedImageIdLeft] =
    useState<string | null>(null);
  const [selectedImageIdRight, setSelectedImageIdRight] =
    useState<string | null>(null);

  const [loadedImages, setLoadedImages] =
    useState<ImageObject[]>(defaultImages);

  const [convertedImageLeftUrl, setConvertedImageLeftUrl] = useState<string>("");
  const [convertedImageRightUrl, setConvertedImageRightUrl] = useState<string>("");

  const [conversionErrorLeft, setConversionErrorLeft] = useState<string>("");
  const [conversionErrorRight, setConversionErrorRight] = useState<string>("");

  const [isConvertingLeft, setIsConvertingLeft] = useState(false);
  const [isConvertingRight, setIsConvertingRight] = useState(false);

  const requestCounterRef = useRef(0);
  const activeRequestIdLeftRef = useRef(0);
  const activeRequestIdRightRef = useRef(0);
  const requestTargetRef = useRef<Map<number, "left" | "right">>(new Map());

  const [gamutWarningEnabled, setGamutWarningEnabled] = useState(false);

  // Create the worker once and subscribe to its messages in a single effect.
  // Keeping both in one effect guarantees the worker exists before the listener
  // is attached, and is not terminated mid-cleanup by React Strict Mode.
  const conversionWorkerRef = useRef<Worker | null>(null);

  const loadedMonitorProfiles = useMemo(
    () => [emptyMonitorProfileValue, ...availableMonitorProfiles],
    [availableMonitorProfiles],
  );

  const addImages = async (imgs: File[]) => {
    const loadedImgs = await Promise.all(
      imgs.map(async (f) => {
        const decoded = await decodeImage(f);

        return {
          id: crypto.randomUUID(),
          label: f.name,
          ...decoded,
        };
      }),
    );

    setLoadedImages((prev) => {
      const seen = new Set(prev.map((x) => x.id));
      return [...prev, ...loadedImgs.filter((x) => !seen.has(x.id))];
    });
  };

  useEffect(() => {
    const worker = new Worker(
      new URL(
        "../profile_transformations/conversion.worker.ts",
        import.meta.url,
      ),
      { type: "module" },
    );
    conversionWorkerRef.current = worker;

    worker.onerror = (e) => {
      console.error("Worker uncaught error:", e);
      setConversionErrorLeft(`Worker error: ${e.message}`);
      setConversionErrorRight(`Worker error: ${e.message}`);
      setIsConvertingLeft(false);
      setIsConvertingRight(false);
    };

    const onWorkerMessage = (
      event: MessageEvent<ConvertImageWorkerMessage>,
    ) => {
      const message = event.data;
      console.log(
        "[worker reply] requestId:",
        message.requestId,
        "type:",
        message.type,
      );

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

      console.log("[worker success] lab length:", message.lab.length); //here we have the lab (reference lab values to use later)
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
    };
  }, []);

  const clearSideResult = (side: "left" | "right") => {
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
  };

  const triggerConversionForSide = (
    side: "left" | "right",
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
        :
          (availableMonitorProfiles.find((p) => p.label === monitorProfileName) ??
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

  return (
    <>
      <Flex paddingLeft="10" direction="column" gap={16}>
        <Heading mt={5} mb={5}>
          GMG SOFTPROOFER
        </Heading>
        <Flex gap="10" direction="column" width="1200">
          <Flex gap="16" direction="row" wrap="wrap">
            <ICCProfileSelector
              selectedICCProfileName={selectedICCProfileNameLeft}
              handleChange={(value) => {
                setSelectedICCProfileNameLeft(value);
                triggerConversionForSide("left", selectedImageIdLeft, value);
              }}
              availableICCProfiles={availableICCProfiles}
              label="Profile 1"
              placeholder="Select profile for image 1"
            />
            <ICCProfileSelector
              selectedICCProfileName={selectedICCProfileNameRight}
              handleChange={(value) => {
                setSelectedICCProfileNameRight(value);
                triggerConversionForSide("right", selectedImageIdRight, value);
              }}
              availableICCProfiles={availableICCProfiles}
              label="Profile 2"
              placeholder="Select profile for image 2"
            />
            <ICCProfileUploader
              label="CMYK profiles"
              buttonLabel="Upload CMYK profile"
              handleFileChange={async (newProfiles: File[]) => {
                const newItems = await Promise.all(
                  newProfiles.map(async (f) => {
                    const buffer = await f.arrayBuffer();
                    return {
                      label: f.name,
                      bytes: new Uint8Array(buffer),
                    };
                  }),
                );

                setAvailableICCProfiles((prev) => {
                  const seen = new Set(prev.map((x) => x.label));
                  return [...prev, ...newItems.filter((x) => !seen.has(x.label))];
                });
              }}
            />
          </Flex>
          <Flex gap="16" direction="row" wrap="wrap">
            <ICCProfileSelector
              selectedICCProfileName={selectedMonitorProfileName}
              handleChange={(value) => {
                setSelectedMonitorProfileName(value);
                triggerConversionForSide(
                  "left",
                  selectedImageIdLeft,
                  selectedICCProfileNameLeft,
                  value,
                );
                triggerConversionForSide(
                  "right",
                  selectedImageIdRight,
                  selectedICCProfileNameRight,
                  value,
                );
              }}
              availableICCProfiles={loadedMonitorProfiles}
              label="Monitor profile (optional)"
              placeholder="No monitor profile"
            />
            <ICCProfileUploader
              label="Monitor profiles"
              buttonLabel="Upload monitor profile"
              handleFileChange={async (newProfiles: File[]) => {
                const newItems = await Promise.all(
                  newProfiles.map(async (f) => {
                    const buffer = await f.arrayBuffer();
                    return {
                      label: f.name,
                      bytes: new Uint8Array(buffer),
                    };
                  }),
                );

                setAvailableMonitorProfiles((prev) => {
                  const seen = new Set(prev.map((x) => x.label));
                  return [...prev, ...newItems.filter((x) => !seen.has(x.label))];
                });
              }}
            />
          </Flex>
        </Flex>
        <div>
          {convertedImageLeftUrl && convertedImageRightUrl ? (
            <ImageCompare
              selectedImageLeftUrl={convertedImageLeftUrl}
              selectedImageRightUrl={convertedImageRightUrl}
            />
          ) : (
            <Text color="gray.500" mt="2">
              Select two images and profiles to preview the transformed comparison
            </Text>
          )}
          {isConvertingLeft || isConvertingRight ? (
            <Text mt="2" color="gray.400">
              Converting image, please wait...
            </Text>
          ) : null}
          {conversionErrorLeft ? (
            <Text mt="2" color="red.500">
              Left conversion failed: {conversionErrorLeft}
            </Text>
          ) : null}
          {conversionErrorRight ? (
            <Text mt="2" color="red.500">
              Right conversion failed: {conversionErrorRight}
            </Text>
          ) : null}
        </div>
        <ImageUploader handleFileChange={addImages}></ImageUploader>
        <Flex direction="row" gap={16} wrap="wrap">
          <ImageSelector
            selectedImageId={selectedImageIdLeft || ""}
            handleChange={(selectedImageId: string) => {
              setSelectedImageIdLeft(selectedImageId);
              triggerConversionForSide(
                "left",
                selectedImageId,
                selectedICCProfileNameLeft,
              );
            }}
            availableImages={loadedImages.map((img) => ({
              id: img.id,
              label: img.label,
            }))}
            label="Image 1"
            placeholder="Select image for profile 1"
          />
          <ImageSelector
            selectedImageId={selectedImageIdRight || ""}
            handleChange={(selectedImageId: string) => {
              setSelectedImageIdRight(selectedImageId);
              triggerConversionForSide(
                "right",
                selectedImageId,
                selectedICCProfileNameRight,
              );
            }}
            availableImages={loadedImages.map((img) => ({
              id: img.id,
              label: img.label,
            }))}
            label="Image 2"
            placeholder="Select image for profile 2"
          />
        </Flex>
        <Checkbox
          checked={gamutWarningEnabled}
          onCheckedChange={(details) => {
            const nextGamutWarningEnabled = details.checked === true;
            setGamutWarningEnabled(nextGamutWarningEnabled);
            triggerConversionForSide(
              "left",
              selectedImageIdLeft,
              selectedICCProfileNameLeft,
              selectedMonitorProfileName,
              nextGamutWarningEnabled,
            );
            triggerConversionForSide(
              "right",
              selectedImageIdRight,
              selectedICCProfileNameRight,
              selectedMonitorProfileName,
              nextGamutWarningEnabled,
            );
          }}
        >
          Enable gamut warning
        </Checkbox>
      </Flex>
    </>
  );
};