import { Button, FileUpload, Flex } from "@chakra-ui/react";
import { HiUpload } from "react-icons/hi";

interface ICCProfileUploaderProps {
  handleFileChange: any;
  label?: string;
  buttonLabel?: string;
}

export const ICCProfileUploader = (props: ICCProfileUploaderProps) => {
  const label = props.label ?? "...or upload your own:";
  const buttonLabel = props.buttonLabel ?? "Upload profile";

  return (
    <FileUpload.Root
      width="300px"
      onFileChange={(details) => {
        props.handleFileChange(details.acceptedFiles);
      }}
    >
      <FileUpload.HiddenInput />
      <FileUpload.Label>{label}</FileUpload.Label>
      <Flex direction={"column"}>
        <FileUpload.Trigger asChild>
          <Button variant="outline" size="sm" border="1px solid grey">
            <HiUpload /> {buttonLabel}
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
