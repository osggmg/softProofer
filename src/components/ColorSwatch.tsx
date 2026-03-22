import { Flex, SimpleGrid, Text } from "@chakra-ui/react";
import {
  CMYKtoLAB,
  doRGBSoftProof,
} from "../profile_transformations/profileTransformations";
import { flatRgbToStrings } from "../utils/utils";
import {
  CMYKColorSpace,
  colorsInput,
  colorsInputAsAFlatMapU16Arr,
  colorsInputAsAFlatMapU8Arr,
  RGBColorSpace,
} from "../utils/constants";
import { useMemo } from "react";
import { lcms } from "../profile_transformations/lcmsSingleton";

interface ColorSwatchProps {
  selectedProfile: Uint8Array | undefined;
}

export const ColorSwatch = (props: ColorSwatchProps) => {
  const profileColorSpace =
    props.selectedProfile &&
    lcms.getColorSpace(lcms.openProfileFromBytes(props.selectedProfile));

  const colorsOutput = useMemo(() => {
    if (props.selectedProfile === undefined) {
      console.log("selectedProfile is undefined");
      return colorsInput;
    }

    try {
      if (profileColorSpace === RGBColorSpace) {
        const RGBOut = doRGBSoftProof(
          props.selectedProfile,
          colorsInputAsAFlatMapU8Arr,
          7,
          3,
        );
        return flatRgbToStrings(RGBOut);
      }

      // if (profileColorSpace === CMYKColorSpace) {
      //   const referenceValuesLAB = CMYKtoLAB(
      //     colorsInputAsAFlatMapU16Arr,
      //     props.selectedProfile,
      //   );
      // }
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
          <Flex flexDirection={"column"}>
            {/* <Text>CMYK: {colorsInput[index]}</Text>
            <Text>LAB: {colorsOutput[index]}</Text> */}
          </Flex>
        </div>
      ))}
    </SimpleGrid>
  );
};
