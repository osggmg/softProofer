import { Box, Flex } from "@chakra-ui/react";
import { useState } from "react";
import ReactCompareImage from "react-compare-image";

interface PixelData {
  rgb: Uint8Array;
  lab: Uint16Array;
  width: number;
  height: number;
}

interface ImageCompareProps {
  selectedImageLeftUrl: string;
  selectedImageRightUrl: string;
  pixelDataRef: React.RefObject<{
    left: PixelData | null;
    right: PixelData | null;
  }>;
  onPipetteChange: (value: PipetteValue | null) => void;
}

interface PipetteValue {
  x: number;
  y: number;
  rgb: [number, number, number];
  lab: [number, number, number];
}

const LAB_L_SCALE = 100.0 / 65535.0;
const LAB_AB_SCALE = 255.0 / 65535.0;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const readPixel = (data: PixelData, x: number, y: number) => {
  const px = clamp(Math.round(x), 0, data.width - 1);
  const py = clamp(Math.round(y), 0, data.height - 1);
  const pixelIndex = py * data.width + px;
  const rgbBase = pixelIndex * 3;
  const labBase = pixelIndex * 3;

  const rgb: [number, number, number] = [
    data.rgb[rgbBase],
    data.rgb[rgbBase + 1],
    data.rgb[rgbBase + 2],
  ];

  const lab: [number, number, number] = [
    data.lab[labBase] * LAB_L_SCALE,
    data.lab[labBase + 1] * LAB_AB_SCALE - 128.0,
    data.lab[labBase + 2] * LAB_AB_SCALE - 128.0,
  ];

  return { px, py, rgb, lab };
};


export default function ImageCompare(props: ImageCompareProps) {
  console.log("Rendering ImageCompare with URLs:", props.selectedImageLeftUrl, props.selectedImageRightUrl);

  const [sliderPosition, setSliderPosition] = useState(0.5);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    const data = props.pixelDataRef.current;
    if (!data?.left || !data?.right) {
      props.onPipetteChange(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const normalizedX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const normalizedY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const side: "left" | "right" =
      normalizedX <= sliderPosition ? "left" : "right";
    const activeData = data[side];
    if (!activeData) return;

    const x = normalizedX * (activeData.width - 1);
    const y = normalizedY * (activeData.height - 1);
    const sampled = readPixel(activeData, x, y);

    props.onPipetteChange({
      x: sampled.px,
      y: sampled.py,
      rgb: sampled.rgb,
      lab: sampled.lab,
    });
  };

  return (
    <Flex direction="column" gap={2} width="500px" maxW="100%">
      <Box
        width="500px"
        maxW="100%"
        minH="320px"
        borderRadius="3px"
        overflow="hidden"
        boxShadow="0px 0px 15px -3px #574B4E"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => props.onPipetteChange(null)}
      >
        <ReactCompareImage
          leftImage={props.selectedImageLeftUrl}
          rightImage={props.selectedImageRightUrl}
          onSliderPositionChange={(position) => setSliderPosition(position)}
        />
      </Box>
    </Flex>
  );
}