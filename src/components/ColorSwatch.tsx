import { ColorSwatchMix, SimpleGrid } from "@chakra-ui/react";

const colorsInput = ["rgb(238, 4, 4)", "green"]
const colorsOutput = ["white", "blue"]

export const ColorSwatch = (props) => {

  return (
    <SimpleGrid columns={7} gap={2}>
      {Array.from({ length: 3 * 7 }).map((_, index) => (
        <ColorSwatchMix key={index} size="xl" items={[colorsInput[index], colorsOutput[index]]} />
      ))}
    </SimpleGrid>
  );
};
