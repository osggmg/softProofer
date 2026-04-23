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

  const selectedImageLabel =
    props.availableImages.find((img) => img.id === props.selectedImageId)?.label ?? "";
  
  return (
    <Select.Root
      collection={itemsToRender}
      size="sm"
      width="200px"
      pt="2"
      value={props.selectedImageId ? [props.selectedImageId] : []}
      onValueChange={(e) => props.handleChange(e.value[0] || "")}
    >
      <Select.Label>{label}</Select.Label>
      <Select.Control>
        <Select.Trigger
          border={"1px solid grey"}
          bg="gray.100"
          color="gray.800"
          title={selectedImageLabel || placeholder}
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
            {itemsToRender.items.map((item) => (
              <Select.Item
                item={item}
                key={item.value}
                color="gray.800"
                _highlighted={{ bg: "gray.200" }}
              >
                <Select.ItemText
                  maxW="170px"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  title={item.label}
                >
                  {item.label}
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};
