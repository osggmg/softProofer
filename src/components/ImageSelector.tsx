import { createListCollection, Portal, Select } from "@chakra-ui/react";
import { useMemo } from "react";

interface ImageSelectorProps {
  selectedImageId: string;
  handleChange: (value: string) => void;
  availableImages: { id: string; label: string }[];
  label?: string;
  placeholder?: string;
}

export const ImageSelector = (props: ImageSelectorProps) => {

   const itemsToRender = useMemo(
    () =>
      createListCollection({
        items: props.availableImages.map((img) => ({
          label: img.label,
          value: img.id,
        })),
      }),
    [props.availableImages],
  );

  const label = props.label ?? "Select image";
  const placeholder = props.placeholder ?? "No image selected";
  
  return (
    <Select.Root collection={itemsToRender} size="sm" width="320px" pt="2" value={props.selectedImageId ? [props.selectedImageId] : []} onValueChange={(e) => props.handleChange(e.value[0] || "")}>
      <Select.Label>{label}</Select.Label>
      <Select.Control>
        <Select.Trigger border={"1px solid grey"}>
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content>
            {itemsToRender.items.map((item) => (
              <Select.Item item={item} key={item.value}>
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};
