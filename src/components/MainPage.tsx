import { Flex } from "@chakra-ui/react";
import styled from "styled-components";

export const MainPage = (props) => {
  return (
    <>
      <Title>GMG SOFTPROOFER</Title>
      <Flex gap="4" direction="row" width="400">
        <ImagePreview />
      </Flex>
    </>

  );
};

const ImagePreview = styled.div`
  width: 500px;
  height: 500px;
  border: 1px solid white;
  padding-right: 100px;
`;

const Title = styled.div`
  padding: 30px;
  font-weight: 600px;
  font-size: 24px;
`;
