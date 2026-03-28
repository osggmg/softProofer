import { Button, FileUpload, Flex } from "@chakra-ui/react";
import { HiUpload } from "react-icons/hi";

interface ImageUploader {
  handleFileChange: any;
}

export const ImageUploader = (props: ImageUploader) => {
  return (
    <FileUpload.Root
      width="300px"
      onFileChange={(details) => {
        props.handleFileChange(details.acceptedFiles);
      }}
      accept={".jpeg,.tif,.tiff"}
    >
      <FileUpload.HiddenInput />
      <FileUpload.Label>Upload your image</FileUpload.Label>
      <Flex direction={"column"}>
        <FileUpload.Trigger asChild>
          <Button variant="outline" size="sm" border="1px solid grey">
            <HiUpload /> Upload image
          </Button>
        </FileUpload.Trigger>
        {/* <Box mt={3} borderRadius={10}>
          <FileUpload.List />
        </Box> */}
      </Flex>
    </FileUpload.Root>
  );
};

// accept=".icc,.icm"
