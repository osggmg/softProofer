import { createListCollection, Portal, Select } from "@chakra-ui/react";
import { useMemo } from "react";
import type { ICCProfile } from "../types/types";

interface ICCProfileSelectorProps {
  selectedICCProfileName: string;
  handleChange: (value: string) => void;
  availableICCProfiles: ICCProfile[];
  label?: string;
  placeholder?: string;
}

export const ICCProfileSelector = (props: ICCProfileSelectorProps) => {
  const itemsToRender = useMemo(
    () =>
      createListCollection({
        items: props.availableICCProfiles.map((profile) => ({
          label: profile.label,
          value: profile.label,
        })),
      }),
    [props.availableICCProfiles],
  );

  const label = props.label ?? "Select ICC Profile";
  const placeholder = props.placeholder ?? "No ICC profile selected";

  return (
    <Select.Root
      collection={itemsToRender}
      size="sm"
      width="200px"
      pt="2"
      value={props.selectedICCProfileName ? [props.selectedICCProfileName] : []}
      onValueChange={(e) => props.handleChange(e.value[0] || "")}
    >
      <Select.Label>{label}</Select.Label>
      <Select.Control>
        <Select.Trigger
          border={"1px solid grey"}
          bg="gray.100"
          color="gray.800"
          title={props.selectedICCProfileName || placeholder}
        >
          <Select.ValueText
            placeholder={placeholder}
            maxW="150px"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content
            bg="gray.100"
            color="gray.800"
            border="1px solid"
            borderColor="gray.300"
          >
            {itemsToRender.items.map((profile) => (
              <Select.Item
                item={profile}
                key={profile.value}
                color="gray.800"
                _highlighted={{ bg: "gray.200" }}
              >
                <Select.ItemText
                  maxW="170px"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  title={profile.label}
                >
                  {profile.label}
                </Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};
