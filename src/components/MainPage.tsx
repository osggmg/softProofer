import { Box, Flex, Heading, Text } from "@chakra-ui/react";
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
import styled from "styled-components";

export interface ImageObject extends DecodedImage {
  id: string;
  label: string;
}

interface ConvertedPixelData {
  rgb: Uint8Array;
  lab: Uint16Array;
  width: number;
  height: number;
}

interface ConvertedPixelDataBySide {
  left: ConvertedPixelData | null;
  right: ConvertedPixelData | null;
}

interface PipetteValue {
  x: number;
  y: number;
  rgb: [number, number, number];
  lab: [number, number, number];
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

const emptyMonitorProfileValue = { label: NO_MONITOR_PROFILE_VALUE };
type ColorModel = "CMYK" | "RGB";

const inferColorModelFromLabel = (label: string): ColorModel | null => {
  const normalized = label.toUpperCase();
  if (normalized.includes("CMYK")) return "CMYK";
  if (normalized.includes("RGB") || normalized.includes("SRGB")) return "RGB";
  return null;
};

const getImageColorModel = (image: ImageObject | null): ColorModel | null => {
  if (!image) return null;

  const normalizedColorSpace = image.colorSpace.toUpperCase();
  if (normalizedColorSpace.includes("CMYK")) return "CMYK";
  if (normalizedColorSpace.includes("RGB")) return "RGB";

  const mapping = image.mapping?.toUpperCase();
  if (mapping?.startsWith("CMYK")) return "CMYK";
  if (mapping?.startsWith("RGB")) return "RGB";

  return null;
};

const getProfileColorModel = (profile: ICCProfile): ColorModel | null => {
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

export const MainPage = () => {
  const [selectedICCProfileNameLeft, setSelectedICCProfileNameLeft] =
    useState<string>("");
  const [selectedICCProfileNameRight, setSelectedICCProfileNameRight] =
    useState<string>("");

  const [selectedMonitorProfileName, setSelectedMonitorProfileName] =
    useState<string>(NO_MONITOR_PROFILE_VALUE);

  const [availableICCProfiles, setAvailableICCProfiles] =
    useState(defaultICCProfiles);
  const [availableMonitorProfiles, setAvailableMonitorProfiles] = useState<
    ICCProfile[]
  >([]);

  const [selectedImageIdLeft, setSelectedImageIdLeft] = useState<string | null>(
    null,
  );
  const [selectedImageIdRight, setSelectedImageIdRight] = useState<
    string | null
  >(null);

  const [loadedImages, setLoadedImages] =
    useState<ImageObject[]>(defaultImages);

  const [convertedImageLeftUrl, setConvertedImageLeftUrl] =
    useState<string>("");
  const [convertedImageRightUrl, setConvertedImageRightUrl] =
    useState<string>("");


  const [conversionErrorLeft, setConversionErrorLeft] = useState<string>("");
  const [conversionErrorRight, setConversionErrorRight] = useState<string>("");

  const [isConvertingLeft, setIsConvertingLeft] = useState(false);
  const [isConvertingRight, setIsConvertingRight] = useState(false);

  const requestCounterRef = useRef(0);
  const activeRequestIdLeftRef = useRef(0);
  const activeRequestIdRightRef = useRef(0);
  const requestTargetRef = useRef<Map<number, "left" | "right">>(new Map());

  const [gamutWarningEnabled, setGamutWarningEnabled] = useState(false);
  const [pipetteValue, setPipetteValue] = useState<PipetteValue | null>(null);

  // Create the worker once and subscribe to its messages in a single effect.
  // Keeping both in one effect guarantees the worker exists before the listener
  // is attached, and is not terminated mid-cleanup by React Strict Mode.
  const conversionWorkerRef = useRef<Worker | null>(null);

  const loadedMonitorProfiles = useMemo(
    () => [emptyMonitorProfileValue, ...availableMonitorProfiles],
    [availableMonitorProfiles],
  );

  const selectedImageLeft = useMemo(
    () => loadedImages.find((img) => img.id === selectedImageIdLeft) ?? null,
    [loadedImages, selectedImageIdLeft],
  );

  const selectedImageRight = useMemo(
    () => loadedImages.find((img) => img.id === selectedImageIdRight) ?? null,
    [loadedImages, selectedImageIdRight],
  );

  const selectedImageColorModelLeft = useMemo(
    () => getImageColorModel(selectedImageLeft),
    [selectedImageLeft],
  );

  const selectedImageColorModelRight = useMemo(
    () => getImageColorModel(selectedImageRight),
    [selectedImageRight],
  );

  const availableICCProfilesLeft = useMemo(
    () =>
      availableICCProfiles.filter(
        (profile) =>
          getProfileColorModel(profile) === selectedImageColorModelLeft,
      ),
    [availableICCProfiles, selectedImageColorModelLeft],
  );

  const availableICCProfilesRight = useMemo(
    () =>
      availableICCProfiles.filter(
        (profile) =>
          getProfileColorModel(profile) === selectedImageColorModelRight,
      ),
    [availableICCProfiles, selectedImageColorModelRight],
  );

  const activeSelectedICCProfileNameLeft = useMemo(
    () =>
      availableICCProfilesLeft.some(
        (profile) => profile.label === selectedICCProfileNameLeft,
      )
        ? selectedICCProfileNameLeft
        : "",
    [availableICCProfilesLeft, selectedICCProfileNameLeft],
  );

  const activeSelectedICCProfileNameRight = useMemo(
    () =>
      availableICCProfilesRight.some(
        (profile) => profile.label === selectedICCProfileNameRight,
      )
        ? selectedICCProfileNameRight
        : "",
    [availableICCProfilesRight, selectedICCProfileNameRight],
  );

  const areBothImagesSelected = Boolean(
    selectedImageIdLeft && selectedImageIdRight,
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

  function clearSideResult(side: "left" | "right") {
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

  const triggerConversionForSide = (
    side: "left" | "right",
    imageId: string | null,
    cmykProfileName: string,
    monitorProfileName: string = selectedMonitorProfileName,
    nextGamutWarningEnabled: boolean = gamutWarningEnabled,
  ) => {
    const selectedImage =
      loadedImages.find((img) => img.id === imageId) ?? null;
    const selectedICCProfile =
      availableICCProfiles.find((p) => p.label === cmykProfileName) ?? null;
    const selectedMonitorProfile =
      monitorProfileName === NO_MONITOR_PROFILE_VALUE
        ? null
        : (availableMonitorProfiles.find(
            (p) => p.label === monitorProfileName,
          ) ?? null);

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
      <Flex paddingLeft="10" direction="column" gap={4}>
        <Heading mt={5} mb={5}>
          GMG SOFTPROOFER
        </Heading>
        <Flex flexDirection={"row"} gap={16}>
          <Section>
            <ImageUploader handleFileChange={addImages}></ImageUploader>
            <Flex direction="row" gap={4} wrap="wrap">
              <ImageSelector
                selectedImageId={selectedImageIdLeft || ""}
                handleChange={(selectedImageId: string) => {
                  setSelectedImageIdLeft(selectedImageId);
                  triggerConversionForSide(
                    "left",
                    selectedImageId,
                    activeSelectedICCProfileNameLeft,
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
                    activeSelectedICCProfileNameRight,
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
            <Flex direction="column" width="1200">
              {areBothImagesSelected ? (
                <>
                  <Flex paddingTop={5}>
                    <ICCProfileUploader
                      buttonLabel="Upload profile"
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
                  <Flex
                    gap="4"
                    direction="row"
                    aria-label="profile uploader and selector"
                  >
                    <ICCProfileSelector
                      selectedICCProfileName={activeSelectedICCProfileNameLeft}
                      handleChange={(value) => {
                        setSelectedICCProfileNameLeft(value);
                        triggerConversionForSide(
                          "left",
                          selectedImageIdLeft,
                          value,
                        );
                      }}
                      availableICCProfiles={availableICCProfilesLeft}
                      label="Profile 1"
                      placeholder="Select profile for image 1"
                    />
                    <ICCProfileSelector
                      selectedICCProfileName={activeSelectedICCProfileNameRight}
                      handleChange={(value) => {
                        setSelectedICCProfileNameRight(value);
                        triggerConversionForSide(
                          "right",
                          selectedImageIdRight,
                          value,
                        );
                      }}
                      availableICCProfiles={availableICCProfilesRight}
                      label="Profile 2"
                      placeholder="Select profile for image 2"
                    />
                  </Flex>
                </>
              ) : null}
              <Flex gap="4" direction="row" paddingTop={10}>
                <ICCProfileSelector //monitor profile
                  selectedICCProfileName={selectedMonitorProfileName}
                  handleChange={(value) => {
                    setSelectedMonitorProfileName(value);
                    triggerConversionForSide(
                      "left",
                      selectedImageIdLeft,
                      activeSelectedICCProfileNameLeft,
                      value,
                    );
                    triggerConversionForSide(
                      "right",
                      selectedImageIdRight,
                      activeSelectedICCProfileNameRight,
                      value,
                    );
                  }}
                  availableICCProfiles={loadedMonitorProfiles}
                  label="Monitor profile (optional)"
                  placeholder="No monitor profile"
                />

                <Flex paddingTop={4.5}>
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

                      setAvailableMonitorProfiles((prev) => {
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
              <Box
                mt={6}
                p={3}
              >
                <Flex gap={6}>
                  <Flex direction="column" gap={2} minW="120px">
                    <Flex align="center" gap={2} alignItems={"flex-end"}>
                      <PipetteLabel>L*:</PipetteLabel>
                      <PipetteValueBox>
                        {pipetteValue ? pipetteValue.lab[0].toFixed(2) : ""}
                      </PipetteValueBox>
                    </Flex>
                    <Flex align="center" gap={2} alignItems={"flex-end"}>
                      <PipetteLabel>a*:</PipetteLabel>
                      <PipetteValueBox>
                        {pipetteValue ? pipetteValue.lab[1].toFixed(2) : ""}
                      </PipetteValueBox>
                    </Flex>
                    <Flex align="center" gap={2} alignItems={"flex-end"}>
                      <PipetteLabel>b*:</PipetteLabel>
                      <PipetteValueBox>
                        {pipetteValue ? pipetteValue.lab[2].toFixed(2) : ""}
                      </PipetteValueBox>
                    </Flex>
                  </Flex>

                  <Flex direction="column" gap={2} minW="120px">
                    <Flex align="center" gap={2} alignItems={"flex-end"}>
                      <PipetteLabel>R:</PipetteLabel>
                      <PipetteValueBox>
                        {pipetteValue ? String(pipetteValue.rgb[0]) : ""}
                      </PipetteValueBox>
                    </Flex>
                    <Flex align="center" gap={2} alignItems={"flex-end"}>
                      <PipetteLabel>G:</PipetteLabel>
                      <PipetteValueBox>
                        {pipetteValue ? String(pipetteValue.rgb[1]) : ""}
                      </PipetteValueBox>
                    </Flex>
                    <Flex align="center" gap={2} alignItems={"flex-end"}>
                      <PipetteLabel>B:</PipetteLabel>
                      <PipetteValueBox>
                        {pipetteValue ? String(pipetteValue.rgb[2]) : ""}
                      </PipetteValueBox>
                    </Flex>
                  </Flex>
                </Flex>
                
              </Box>
            </Flex>
          </Section>
          <Section $width={"1230px"} $marginRight="50px">
            <div style={{ alignSelf: "center" }}>
              {convertedImageLeftUrl && convertedImageRightUrl ? (
                <Flex direction="column" alignItems="center">
                  <ImageCompare
                    selectedImageLeftUrl={convertedImageLeftUrl}
                    selectedImageRightUrl={convertedImageRightUrl}
                    onPipetteChange={setPipetteValue}
                  />
                  <Checkbox
              
                    paddingTop={5}
                    checked={gamutWarningEnabled}
                    onCheckedChange={(details) => {
                      const nextGamutWarningEnabled = details.checked === true;
                      setGamutWarningEnabled(nextGamutWarningEnabled);
                      triggerConversionForSide(
                        "left",
                        selectedImageIdLeft,
                        activeSelectedICCProfileNameLeft,
                        selectedMonitorProfileName,
                        nextGamutWarningEnabled,
                      );
                      triggerConversionForSide(
                        "right",
                        selectedImageIdRight,
                        activeSelectedICCProfileNameRight,
                        selectedMonitorProfileName,
                        nextGamutWarningEnabled,
                      );
                    }}
                  >
                    Enable gamut warning
                  </Checkbox>
                </Flex>
              ) : (
                <Text color="gray.500" mt="2">
                  Select two images and profiles to preview the transformed
                  comparison
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
          </Section>
        </Flex>
      </Flex>
    </>
  );
};

const Section = styled.div<{
  $width?: string;
  $height?: string;
  $marginRight?: string;
}>`
  display: inline-flex;
  width: ${({ $width }) => $width ?? "auto"};
  height: ${({ $height }) => $height ?? "auto"};
  padding: 40px;
  margin-right: ${({ $marginRight }) => $marginRight ?? "0px"};
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  background-color: #f2f2f2;
  border: 1px solid red;
  border-radius: 10px;
`;

const PipetteValueBox = styled.div`
  min-width: 56px;
  height: 24px;
  padding: 2px 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #eceff2;
  border: 1px solid #d0d7de;
  border-radius: 7px;
  font-size: 13px;
  color: #4b5563;
`;

const PipetteLabel = styled(Text)`
  width: 28px;
  text-align: left;
  font-weight: 600;
`;
