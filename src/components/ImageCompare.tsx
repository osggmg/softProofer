import { Box, Flex } from "@chakra-ui/react";
import { useMemo, useState } from "react";
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
  showHeatmap: boolean;
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

const toLab = (data: Uint16Array, base: number): [number, number, number] => {
  return [
    data[base] * LAB_L_SCALE,
    data[base + 1] * LAB_AB_SCALE - 128.0,
    data[base + 2] * LAB_AB_SCALE - 128.0,
  ];
};

const distanceToHeatColor = (normalized: number): [number, number, number] => {
  const t = clamp(normalized, 0, 1);

  // Yellow -> Red ramp.
  const r = 255;
  const g = Math.round(255 * (1 - t));
  const b = 0;

  return [r, g, b];
};

const createHeatmapUrl = (left: PixelData, right: PixelData): string => {
  const width = Math.min(left.width, right.width);
  const height = Math.min(left.height, right.height);
  const pixelCount = width * height;

  if (pixelCount <= 0) {
    throw new Error("Cannot build heatmap for empty image dimensions.");
  }

  const distances = new Float32Array(pixelCount);
  let maxDistance = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const leftBase = (y * left.width + x) * 3;
      const rightBase = (y * right.width + x) * 3;

      const [l1, a1, b1] = toLab(left.lab, leftBase);
      const [l2, a2, b2] = toLab(right.lab, rightBase);

      const dL = l1 - l2;
      const dA = a1 - a2;
      const dB = b1 - b2;
      const distance = Math.sqrt(dL * dL + dA * dA + dB * dB);

      distances[i] = distance;
      if (distance > maxDistance) {
        maxDistance = distance;
      }
    }
  }

  const rgba = new Uint8ClampedArray(pixelCount * 4);
  const normalizationMax = maxDistance > 0 ? maxDistance : 1;

  for (let i = 0, j = 0; i < pixelCount; i++, j += 4) {
    const normalized = distances[i] / normalizationMax;
    const [r, g, b] = distanceToHeatColor(normalized);
    rgba[j] = r;
    rgba[j + 1] = g;
    rgba[j + 2] = b;
    rgba[j + 3] = 255;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create heatmap canvas context.");
  }

  ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas.toDataURL("image/png");
};


export default function ImageCompare(props: ImageCompareProps) {
  console.log("Rendering ImageCompare with URLs:", props.selectedImageLeftUrl, props.selectedImageRightUrl);

  const [sliderPosition, setSliderPosition] = useState(0.5);
  const heatmapUrl = useMemo(() => {
    if (!props.showHeatmap) {
      return "";
    }

    const data = props.pixelDataRef.current;
    if (!data?.left || !data?.right) {
      return "";
    }

    try {
      return createHeatmapUrl(data.left, data.right);
    } catch (error) {
      console.error("Failed to build heatmap:", error);
      return "";
    }
  }, [
    props.showHeatmap,
    props.pixelDataRef,
  ]);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (props.showHeatmap) {
      props.onPipetteChange(null);
      return;
    }

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
        {props.showHeatmap && heatmapUrl ? (
          <img
            src={heatmapUrl}
            alt="Lab distance heatmap"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <ReactCompareImage
            leftImage={props.selectedImageLeftUrl}
            rightImage={props.selectedImageRightUrl}
            onSliderPositionChange={(position) => setSliderPosition(position)}
          />
        )}
      </Box>
    </Flex>
  );
}