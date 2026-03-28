import { Box } from "@chakra-ui/react";
import ReactCompareImage from "react-compare-image";

interface ImageCompareProps {
  selectedImageLeftUrl: string;
  selectedImageRightUrl: string;
}



export default function ImageCompare(props: ImageCompareProps) {
  console.log("Rendering ImageCompare with URLs:", props.selectedImageLeftUrl, props.selectedImageRightUrl);

  return (
    <Box maxW={500} maxH={500}>
      <ReactCompareImage
        leftImage={props.selectedImageLeftUrl} //here we need url
        rightImage={props.selectedImageRightUrl}
      />
    </Box>
  );
}