import { SimpleGrid } from "@chakra-ui/react";
import { doSoftProof } from "../profile_transformations/profileTransformations";
import { flatRgbToStrings } from "../utils/utils";
import { colorsInput, colorsInputAsAFlatMapU8Arr } from "../utils/constants";
import { useMemo } from "react";

interface ColorSwatchProps {
  selectedProfile: Uint8Array | undefined;
}

export const ColorSwatch = (props: ColorSwatchProps) => {

  const colorsOutput = useMemo(() => {
    if (props.selectedProfile === undefined) 
      {
        console.log("selectedProfile is undefined")
        return colorsInput;
      }

    try {
      const out = doSoftProof(
        props.selectedProfile,
        colorsInputAsAFlatMapU8Arr,
        7,
        3,
      );
      return flatRgbToStrings(out);
    } catch (e) {
      console.error("Softproof error:", e);
      return colorsInput;
    }
  }, [props.selectedProfile]);

  return (
    <SimpleGrid columns={7} gap={2}>
      {Array.from({ length: 21 }).map((_, index) => (
        <div key={index}>
          <div
            style={{
              width: 32,
              height: 16,
              background: colorsInput[index],
              borderTopRightRadius: 2,
              borderTopLeftRadius: 2,
            }}
          />
          <div
            style={{
              width: 32,
              height: 16,
              background: colorsOutput[index],
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
            }}
          />
        </div>
      ))}
    </SimpleGrid>
  );
};
