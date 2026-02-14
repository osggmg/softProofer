import { Flex } from "@chakra-ui/react";
import { ColorSwatch } from "./ColorSwatch";
import styled from "styled-components";
import { ICCProfileUploader } from "./ICCProfileUploader";
import { ICCProfileSelector } from "./ICCProfileSelector";
import { useState } from "react";
import type { ICCProfile } from "../types/types";

const defaultICCProfiles: ICCProfile[] = [
  { label: "profile1", value: "profile1" },
  { label: "profile2", value: "profile2" },
];

export const MainPage = () => {
  const [availableICCProfiles, setAvailableICCProfiles] =
    useState(defaultICCProfiles);
  const [selectedICCProfile, setSelectedICCProfile] = useState("");

  return (
    <>
      <Flex paddingLeft="10" direction="column">
        <Title>GMG SOFTPROOFER</Title>
        <Flex gap="16" direction="row" width="1000">
          <ColorSwatch />
          <Flex direction={"row"} gap={16}>
            <ICCProfileSelector
              selectedICCProfile={selectedICCProfile}
              handleChange={setSelectedICCProfile}
              availableICCProfiles={availableICCProfiles}
            />
            <ICCProfileUploader
              handleFileChange={(newProfiles) => {
                const newItems = newProfiles.map((f) => ({
                  label: f.name,
                  value: f.name,
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

const Title = styled.div`
  //change this to use chakra ui styling
  padding: 15px;
  font-weight: 600;
  font-size: 24px;
`;
