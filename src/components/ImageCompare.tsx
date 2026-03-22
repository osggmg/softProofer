import { Box } from "@chakra-ui/react";
import ReactCompareImage from "react-compare-image";

interface ImageCompareProps {
    selectedImageLeft: any;
    selectedImageRight: any;
}

export default function ImageCompare(props: ImageCompareProps) {
  return (
    <Box maxW={500} maxH={500}>
      <ReactCompareImage
        leftImage={props.selectedImageLeft}
        rightImage={props.selectedImageRight}
      />
    </Box>
  );
}