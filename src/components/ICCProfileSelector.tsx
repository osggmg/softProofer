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
    <Select.Root collection={itemsToRender} size="sm" width="320px" pt="2" value={props.selectedICCProfileName ? [props.selectedICCProfileName] : []} onValueChange={(e) => props.handleChange(e.value[0] || "")}>
      <Select.Label>{label}</Select.Label>
      <Select.Control>
        <Select.Trigger border={"1px solid grey"}>
          <Select.ValueText placeholder={placeholder}/>
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content>
            {itemsToRender.items.map((profile) => (
              <Select.Item item={profile} key={profile.value}>
                <Select.ItemText >{profile.label}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};
