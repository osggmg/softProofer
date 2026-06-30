import { Flex, Heading, Text } from "@chakra-ui/react";
import { Checkbox } from "./../components/ui/checkbox";
import { ICCProfileUploader } from "./ICCProfileUploader";
import { ICCProfileSelector } from "./ICCProfileSelector";
import { useState } from "react";
import ImageCompare from "./ImageCompare";
import { ImageUploader } from "./ImageUploader";
import { decodeImage } from "../profile_transformations/imageMagick";
import { ImageSelector } from "./ImageSelector";
import type {
  ICCProfile,
  ImageObject,
  PipetteValue,
} from "../types/types";
import { readDefaultImages } from "../default_profiles_and_images/default_profiles_and_images_utils";
import styled from "styled-components";
import Logo from "./ui/Logo";
import {
  NO_MONITOR_PROFILE_VALUE,
} from "../utils/constants";
import { useMainPageDerived } from "./useMainPageDerived";
import { defaultICCProfiles } from '../default_profiles_and_images/default_profiles/default_cmyk_profiles';
import { defaultRGBICCProfiles } from '../default_profiles_and_images/default_profiles/default_rgb_profiles';
import { PipetteContainer } from './PipetteContainer';
import { useConversionWorker } from "../profile_transformations/useConversionWorker.ts";

const defaultAllICCProfiles = [...defaultICCProfiles, ...defaultRGBICCProfiles];

const defaultImages: ImageObject[] = await readDefaultImages();

export const MainPage = () => {

  const [selectedICCProfileNameLeft, setSelectedICCProfileNameLeft] =
    useState<string>("");
  const [selectedICCProfileNameRight, setSelectedICCProfileNameRight] =
    useState<string>("");

  const [selectedMonitorProfileName, setSelectedMonitorProfileName] =
    useState<string>(NO_MONITOR_PROFILE_VALUE);

  const [availableICCProfiles, setAvailableICCProfiles] =
    useState(defaultAllICCProfiles);
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

  const [gamutWarningEnabled, setGamutWarningEnabled] = useState(false);
  const [invert7cNonCmykChannels, setInvert7cNonCmykChannels] = useState(true);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [pipetteValue, setPipetteValue] = useState<PipetteValue | null>(null);

  //this is a hook that wraps useMemo around all used state stuff
  const {
    availableICCProfilesLeft,
    availableICCProfilesRight,
    loadedMonitorProfiles,
    activeSelectedICCProfileNameLeft,
    activeSelectedICCProfileNameRight,
  } = useMainPageDerived({
    loadedImages,
    selectedImageIdLeft,
    selectedImageIdRight,
    availableICCProfiles,
    availableMonitorProfiles,
    selectedICCProfileNameLeft,
    selectedICCProfileNameRight,
  });

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

  const {
    convertedImageLeftUrl,
    convertedImageRightUrl,
    conversionErrorLeft,
    conversionErrorRight,
    isConvertingLeft,
    isConvertingRight,
    pixelDataRef,
    triggerConversionForSide,
  } = useConversionWorker({
    loadedImages,
    availableICCProfiles,
    availableMonitorProfiles,
    selectedMonitorProfileName,
    gamutWarningEnabled,
    invert7cNonCmykChannels,
  });

  return (
    <>
      <Flex paddingLeft="10" direction="column" gap={4}>
        <Heading mt={5} mb={5}>
          <Logo height={42} width={110} />
        </Heading>
        <Flex flexDirection={"row"} gap={16}>
          <Section>
            <ImageUploader handleFileChange={addImages}/>
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
              <PipetteContainer pipetteValue={pipetteValue}/>
            </Flex>
          </Section>
          <Section $width={"1230px"} $marginRight="50px">
            <Flex flexDirection="column" alignSelf="center" alignItems="center">
              {convertedImageLeftUrl && convertedImageRightUrl ? (
                <Flex direction="column" alignItems="center">
                  <ImageCompare
                    selectedImageLeftUrl={convertedImageLeftUrl}
                    selectedImageRightUrl={convertedImageRightUrl}
                    showHeatmap={heatmapEnabled}
                    pixelDataRef={pixelDataRef}
                    onPipetteChange={setPipetteValue}
                  />
                  <Flex gap={6} paddingTop={5}>
                    <Checkbox
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
                    <Checkbox
                      checked={invert7cNonCmykChannels}
                      onCheckedChange={(details) => {
                        const nextInvert7cNonCmykChannels =
                          details.checked === true;
                        setInvert7cNonCmykChannels(nextInvert7cNonCmykChannels);
                        triggerConversionForSide(
                          "left",
                          selectedImageIdLeft,
                          activeSelectedICCProfileNameLeft,
                          selectedMonitorProfileName,
                          gamutWarningEnabled,
                          nextInvert7cNonCmykChannels,
                        );
                        triggerConversionForSide(
                          "right",
                          selectedImageIdRight,
                          activeSelectedICCProfileNameRight,
                          selectedMonitorProfileName,
                          gamutWarningEnabled,
                          nextInvert7cNonCmykChannels,
                        );
                      }}
                    >
                      Invert non-CMYK channels (7C)
                    </Checkbox>
                    <Checkbox
                      checked={heatmapEnabled}
                      onCheckedChange={(details) => {
                        setHeatmapEnabled(details.checked === true);
                      }}
                    >
                      Show Lab difference heatmap
                    </Checkbox>
                  </Flex>
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
            </Flex>
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
  border-radius: 10px;
`;