import { Box, Button, FileUpload, Flex } from "@chakra-ui/react";
import { HiUpload } from "react-icons/hi";

interface ICCProfileUploaderProps {
  handleFileChange: any;
}

export const ICCProfileUploader = (props: ICCProfileUploaderProps) => {
  return (
    <FileUpload.Root
      width="300px"
      onFileChange={(details) => {
        props.handleFileChange(details.acceptedFiles);
      }}
    >
      <FileUpload.HiddenInput />
      <FileUpload.Label>...or upload your own:</FileUpload.Label>
      <Flex direction={"column"}>
        <FileUpload.Trigger asChild>
          <Button variant="outline" size="sm" border="1px solid grey">
            <HiUpload /> Upload profile
          </Button>
        </FileUpload.Trigger>
        <Box mt={3} borderRadius={10}>
          <FileUpload.List />
        </Box>
      </Flex>
    </FileUpload.Root>
  );
};

// accept=".icc,.icm"
