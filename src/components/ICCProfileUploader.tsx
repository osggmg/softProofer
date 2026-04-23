import { Button, FileUpload, Flex } from "@chakra-ui/react";
import { HiUpload } from "react-icons/hi";

interface ICCProfileUploaderProps {
  handleFileChange: any;
  label?: string;
  buttonLabel?: string;
}

export const ICCProfileUploader = (props: ICCProfileUploaderProps) => {
  const label = props.label;
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
          <Button
            height="36px"
            variant="outline"
            size="sm"
            color="#595959"
            fontWeight={400}
            _hover={{ color: "white" }}
          >
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
