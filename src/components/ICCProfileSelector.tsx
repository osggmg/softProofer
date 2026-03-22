import { createListCollection, Portal, Select } from "@chakra-ui/react";
import { useMemo } from "react";
import type { ICCProfile } from "../types/types";

interface ICCProfileSelectorProps {
  selectedICCProfileName: string;
  handleChange: (value: string) => void;
  availableICCProfiles: ICCProfile[];
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
  
  return (
    <Select.Root collection={itemsToRender} size="sm" width="320px" pt="2" value={[props.selectedICCProfileName]} onValueChange={(e) => props.handleChange(e.value[0] || "")}>
      <Select.Label>Select ICC Profile</Select.Label>
      <Select.Control>
        <Select.Trigger border={"1px solid grey"}>
          <Select.ValueText />
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
                {profile.label}
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};
