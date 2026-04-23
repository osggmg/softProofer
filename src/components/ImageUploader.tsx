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
      <Flex direction={"column"}>
        <FileUpload.Trigger asChild>
          <Button
            variant="outline"
            size="sm"
            color="#595959"
            fontWeight={400}
            _hover={{ color: "white" }}
          >
            <HiUpload /> Upload image(s)
          </Button>
        </FileUpload.Trigger>
      </Flex>
    </FileUpload.Root>
  );
};