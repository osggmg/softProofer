import { Flex, Heading } from "@chakra-ui/react";
import { ICCProfileUploader } from "./ICCProfileUploader";
import { ICCProfileSelector } from "./ICCProfileSelector";
import { useState } from "react";
import ImageCompare from "./ImageCompare";
import { ImageUploader } from "./ImageUploader";
import {
  decodeImage,
  type DecodedImage,
} from "../profile_transformations/imageMagick";
import { ImageSelector } from "./ImageSelector";
import type { ICCProfile } from "../types/types";
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

  const [selectedImageLeftUrl, setSelectedImageLeftUrl] = useState<string>("");
  const [selectedImageRightUrl, setSelectedImageRightUrl] =
    useState<string>("");

  const [loadedImages, setLoadedImages] =
    useState<ImageObject[]>(defaultImages);

  const [loadedImagesUrls, setLoadedImagesUrls] = useState<string[]>([]);

  const selectedICCProfile = availableICCProfiles.find(
    (p) => p.label === selectedICCProfileName,
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
          <ImageCompare
            selectedImageLeft={selectedImageLeftUrl}
            selectedImageRight={selectedImageRightUrl}
          />
        </div>
        <ImageUploader handleFileChange={addImages}></ImageUploader>
        <ImageSelector
          selectedImage={selectedImageLeftUrl}
          handleChange={(selectedImage) => {
            const url = URL.createObjectURL(selectedImage);
            setSelectedImageLeftUrl(url);
            setLoadedImagesUrls((prev) => [...prev, url]);
          }}
          availableImages={loadedImages}
          isRightSelector={false}
        ></ImageSelector>
        <ImageSelector
          selectedImage={selectedImageRightUrl}
          handleChange={(selectedImage) => {
            const url = URL.createObjectURL(selectedImage);
            console.log(url);
            setLoadedImagesUrls((prev) => [...prev, url]);
          }}
          availableImages={loadedImages}
          isRightSelector={true}
        ></ImageSelector>
        <Flex></Flex>
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
