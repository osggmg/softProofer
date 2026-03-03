import { Flex, Heading } from "@chakra-ui/react";
import { ColorSwatch } from "./ColorSwatch";
import { ICCProfileUploader } from "./ICCProfileUploader";
import { ICCProfileSelector } from "./ICCProfileSelector";
import { useState } from "react";
import type { ICCProfile } from "../types/types";
import { readFileFromPublic } from "../utils/utils";

const sRGB_Red = await readFileFromPublic("/sampleProfiles/sRGB_Red 1.icc");
const sRGB = await readFileFromPublic("/sampleProfiles/sRGB_v4.icc");


const defaultICCProfiles: ICCProfile[] = [
  { label: "No profile", value: "No profile" },
  { label: "sRGB", value: "sRGB", bytes: sRGB },
  { label: "sRGB_Red", value: "sRGB_Red", bytes: sRGB_Red },
];

export const MainPage = () => {
  const [availableICCProfiles, setAvailableICCProfiles] =
    useState(defaultICCProfiles);
  const [selectedICCProfileLabel, setSelectedICCProfileName] =
    useState<string>("");

  const selectedICCProfile = availableICCProfiles.find(
    (p) => p.label === selectedICCProfileLabel,
  );

  console.log("selectedProfile" + selectedICCProfile?.label)

  return (
    <>
      <Flex paddingLeft="10" direction="column">
        <Heading mt={5} mb={5}>
          GMG SOFTPROOFER
        </Heading>
        <Flex gap="16" direction="row" width="1000">
          <ColorSwatch
            selectedProfile={
              selectedICCProfile?.bytes
            }
          />
          <Flex direction={"row"} gap={16}>
            <ICCProfileSelector
              selectedICCProfileName={selectedICCProfileLabel}
              handleChange={setSelectedICCProfileName}
              availableICCProfiles={availableICCProfiles}
            />
            <ICCProfileUploader
              handleFileChange={async (newProfiles: File[]) => {
                const newItems = await Promise.all(newProfiles.map(async (f) => {
                  const buffer = await f.arrayBuffer();
                  return {
                    label: f.name,
                    value: f.name,
                    bytes: new Uint8Array(buffer),
                  };
                }));

                setAvailableICCProfiles((prev) => {
                  const seen = new Set(prev.map((x) => x.value));
                  return [
                    ...prev,
                    ...newItems.filter((x) => !seen.has(x.value)),
                  ];
                });
              }}
            />
          </Flex>
        </Flex>
      </Flex>
    </>
  );
};
