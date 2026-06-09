import { Box, Flex } from '@chakra-ui/react'
import styled from 'styled-components';

interface PipetteContainerProps {
    pipetteValue: any,
}

export const PipetteContainer = (props: PipetteContainerProps) => {
    const pipetteValue = props.pipetteValue;
    return (
        <Box mt={6} p={3}>
            <Flex gap={6}>
                <Flex direction="column" gap={2} minW="120px">
                    <Flex align="center" gap={2} alignItems={"flex-end"}>
                        <PipetteLabel>L*:</PipetteLabel>
                        <PipetteValueBox>
                            {pipetteValue ? pipetteValue.lab[0].toFixed(2) : ""}
                        </PipetteValueBox>
                    </Flex>
                    <Flex align="center" gap={2} alignItems={"flex-end"}>
                        <PipetteLabel>a*:</PipetteLabel>
                        <PipetteValueBox>
                            {pipetteValue ? pipetteValue.lab[1].toFixed(2) : ""}
                        </PipetteValueBox>
                    </Flex>
                    <Flex align="center" gap={2} alignItems={"flex-end"}>
                        <PipetteLabel>b*:</PipetteLabel>
                        <PipetteValueBox>
                            {pipetteValue ? pipetteValue.lab[2].toFixed(2) : ""}
                        </PipetteValueBox>
                    </Flex>
                </Flex>

                <Flex direction="column" gap={2} minW="120px">
                    <Flex align="center" gap={2} alignItems={"flex-end"}>
                        <PipetteLabel>R:</PipetteLabel>
                        <PipetteValueBox>
                            {pipetteValue ? String(pipetteValue.rgb[0]) : ""}
                        </PipetteValueBox>
                    </Flex>
                    <Flex align="center" gap={2} alignItems={"flex-end"}>
                        <PipetteLabel>G:</PipetteLabel>
                        <PipetteValueBox>
                            {pipetteValue ? String(pipetteValue.rgb[1]) : ""}
                        </PipetteValueBox>
                    </Flex>
                    <Flex align="center" gap={2} alignItems={"flex-end"}>
                        <PipetteLabel>B:</PipetteLabel>
                        <PipetteValueBox>
                            {pipetteValue ? String(pipetteValue.rgb[2]) : ""}
                        </PipetteValueBox>
                    </Flex>
                </Flex>
            </Flex>
        </Box>
    )
}


const PipetteValueBox = styled.div`
  min-width: 56px;
  height: 24px;
  padding: 2px 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #eceff2;
  border: 1px solid #d0d7de;
  border-radius: 7px;
  font-size: 13px;
  color: #4b5563;
`;

const PipetteLabel = styled.div`
  width: 28px;
  text-align: left;
  font-weight: 600;
`;
