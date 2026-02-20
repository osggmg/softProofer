import { Button, Flex, Heading } from "@chakra-ui/react";
import { ColorSwatch } from "./ColorSwatch";
import { ICCProfileUploader } from "./ICCProfileUploader";
import { ICCProfileSelector } from "./ICCProfileSelector";
import { useState } from "react";
import type { ICCProfile, RGBTriplet } from "../types/types";
import { doSoftProof } from "../profile_transformations/profileTransformations";
import { readFileFromPublic } from "../utils/utils";
import { lcms } from "../profile_transformations/lcmsSingleton";


const sRGB_Red = await readFileFromPublic("/sampleProfiles/sRGB_Red 1.icc")
const hSRGB = lcms.createSRGBProfile();

const defaultICCProfiles: ICCProfile[] = [
  { label: "sRGB", value: "sRGB", handle: hSRGB},
  { label: "sRGB_Red", value: "sRGB_Red", bytes: sRGB_Red },
];

 
const testImageInRGB = "";
const testInputInRGB: RGBTriplet = [95, 23, 11] 

export const MainPage = () => {
  const [availableICCProfiles, setAvailableICCProfiles] =
    useState(defaultICCProfiles);
  const [selectedICCProfileLabel, setSelectedICCProfileName] = useState<string>("");



  const handleConvertBtnClick = () => {
    if (!selectedICCProfileLabel) return;
    if (selectedICCProfileLabel.value === "sRGB") return;

    const convertedTriplet = doSoftProof(sRGB_Red, testInputInRGB, 1, 1)

    console.log(convertedTriplet)
  }

  const selectedICCProfile = defaultICCProfiles.find((p) => p.label === selectedICCProfileLabel)


  return (
    <>
      <Flex paddingLeft="10" direction="column">
        <Heading mt={5} mb={5}>
          GMG SOFTPROOFER
        </Heading>
        <Flex gap="16" direction="row" width="1000">
          <ColorSwatch selectedProfile={selectedICCProfile?.handle || selectedICCProfile?.bytes || ""} />
          <Flex direction={"row"} gap={16}>
            <ICCProfileSelector
              selectedICCProfileName={selectedICCProfileLabel}
              handleChange={setSelectedICCProfileName}
              availableICCProfiles={availableICCProfiles}
            />
            <ICCProfileUploader
              handleFileChange={(newProfiles) => {
                const newItems = newProfiles.map(async (f) => {
                  const buffer = await f.arrayBuffer();
                  return {
                    label: f.name,
                    value: f.name,
                    bytes: new Uint8Array(buffer),
                  };
                });

                setAvailableICCProfiles((prev) => {
                  const seen = new Set(prev.map((x) => x.value));
                  return [
                    ...prev,
                    ...newItems.filter((x) => !seen.has(x.value)),
                  ];
                });
              }}
            />
            {/* <Button onClick={handleConvertBtnClick}>Convert...</Button> */}
          </Flex>
        </Flex>
      </Flex>
    </>
  );
};
