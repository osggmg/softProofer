import { Flex, Heading, Text } from "@chakra-ui/react";
import { Checkbox } from "./../components/ui/checkbox";
import { ICCProfileUploader } from "./ICCProfileUploader";
import { ICCProfileSelector } from "./ICCProfileSelector";
import { useEffect, useRef, useState } from "react";
import ImageCompare from "./ImageCompare";
import { ImageUploader } from "./ImageUploader";
import {
  decodeImage,
  createPreviewObjectUrl,
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

export const MainPage = () => {
  const [availableICCProfiles, setAvailableICCProfiles] =
    useState(defaultICCProfiles);
  const [selectedICCProfileName, setSelectedICCProfileName] =
    useState<string>("");

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const [loadedImages, setLoadedImages] =
    useState<ImageObject[]>(defaultImages);

  const [convertedImageUrl, setConvertedImageUrl] = useState<string>("");
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string>("");
  const [conversionError, setConversionError] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);
  const requestCounterRef = useRef(0);
  const activeRequestIdRef = useRef(0);

  const [gamutWarningEnabled, setGamutWarningEnabled] = useState(false);

  // Create the worker once and subscribe to its messages in a single effect.
  // Keeping both in one effect guarantees the worker exists before the listener
  // is attached, and is not terminated mid-cleanup by React Strict Mode.
  const conversionWorkerRef = useRef<Worker | null>(null);

  const selectedICCProfile = availableICCProfiles.find(
    (p) => p.label === selectedICCProfileName,
  );

  const selectedImage =
    loadedImages.find((img) => img.id === selectedImageId) ?? null;

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
      setConversionError(`Worker error: ${e.message}`);
      setIsConverting(false);
    };

    const onWorkerMessage = (
      event: MessageEvent<ConvertImageWorkerMessage>,
    ) => {
      const message = event.data;
      console.log(
        "[worker reply] requestId:",
        message.requestId,
        "active:",
        activeRequestIdRef.current,
        "type:",
        message.type,
      );
      if (message.requestId !== activeRequestIdRef.current) return;

      if (message.type === "error") {
        console.error("Worker conversion failed:", message.message);
        setConversionError(message.message);
        setIsConverting(false);
        return;
      }

      setConversionError("");
      setIsConverting(false);
      console.log("[worker success] lab length:", message.lab.length); //here we have the lab (reference lab values to use later)
      const nextUrl = URL.createObjectURL(message.blob);
      setConvertedImageUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return nextUrl;
      });
    };

    worker.addEventListener("message", onWorkerMessage);

    return () => {
      worker.removeEventListener("message", onWorkerMessage);
      worker.terminate();
      conversionWorkerRef.current = null;
    };
  }, []);

  // Generate a browser-displayable PNG preview URL for the source image.
  // Needed because source files (e.g. TIFF) cannot be rendered natively by browsers.
  useEffect(() => {
    if (!selectedImage) return;
    let cancelled = false;
    createPreviewObjectUrl(selectedImage).then((url) => {
      if (!cancelled) setSourcePreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedImage]);

  useEffect(() => {
    if (!selectedImage || !selectedICCProfile?.bytes) return;

    requestCounterRef.current += 1;
    const requestId = requestCounterRef.current;
    activeRequestIdRef.current = requestId;

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
      rgbProfileBytes: null, //add monitor profile here if exists
      options: { outputFormat: "png", preserveAlpha: false, gamutWarningEnabled }, //preserveAlpha is not usually needed. i will leave it in case we do
    };

    conversionWorkerRef.current?.postMessage(request);
    setTimeout(() => {
      setIsConverting(true);
      setConversionError("");
    }, 0);
  }, [selectedImage, selectedICCProfile, gamutWarningEnabled]);

  return (
    <>
      <Flex paddingLeft="10" direction="column" gap={16}>
        <Heading mt={5} mb={5}>
          GMG SOFTPROOFER
        </Heading>
        <Flex gap="16" direction="row" width="1000">
          {/* <ColorSwatch selectedProfile={selectedICCProfile?.bytes} /> this will be only in rgb mode or idk*/}
          <Flex direction={"row"} gap={16}>
            <ICCProfileSelector
              selectedICCProfileName={selectedICCProfileName}
              handleChange={setSelectedICCProfileName}
              availableICCProfiles={availableICCProfiles}
            />
            <ICCProfileUploader
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
                  return [
                    ...prev,
                    ...newItems.filter((x) => !seen.has(x.label)),
                  ];
                });
              }}
            />
          </Flex>
        </Flex>
        <div>
          {selectedImage && sourcePreviewUrl ? (
            <ImageCompare
              selectedImageLeftUrl={sourcePreviewUrl}
              selectedImageRightUrl={convertedImageUrl || sourcePreviewUrl}
            />
          ) : (
            <Text color="gray.500" mt="2">
              Select an image to preview
            </Text>
          )}
          {isConverting ? (
            <Text mt="2" color="gray.400">
              Converting image, please wait...
            </Text>
          ) : null}
          {conversionError ? (
            <Text mt="2" color="red.500">
              Conversion failed: {conversionError}
            </Text>
          ) : null}
        </div>
        <ImageUploader handleFileChange={addImages}></ImageUploader>
        <ImageSelector
          selectedImageId={selectedImageId || ""}
          handleChange={(selectedImageId: string) => {
            setSelectedImageId(selectedImageId);
          }}
          availableImages={loadedImages.map((img) => ({
            id: img.id,
            label: img.label,
          }))}
        />
        <Checkbox checked={gamutWarningEnabled} onCheckedChange={(details) => setGamutWarningEnabled(details.checked === true)}>
          Enable gamut warning
        </Checkbox>
      </Flex>
    </>
  );
};

// later make two separate main pages, for cmyk and rgb

// const sRGB_Red = await readFileFromPublic("/sampleProfiles/sRGB_Red 1.icc");
// const sRGB = await readFileFromPublic("/sampleProfiles/sRGB_v4.icc");

// const defaultICCProfiles: ICCProfile[] = [
//   { label: "No profile", value: "No profile" },
//   { label: "sRGB", value: "sRGB", bytes: sRGB },
//   { label: "sRGB_Red", value: "sRGB_Red", bytes: sRGB_Red },
// ];

// const defaultImages: any[] = [
//   { name: "cat1", url: "/samplePictures/cat1.jpg" },
//   { name: "cat2", url: "/samplePictures/cat2.jpg" },
// ];
