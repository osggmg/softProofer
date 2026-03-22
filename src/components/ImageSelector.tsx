import { createListCollection, Portal, Select } from "@chakra-ui/react";
import { useMemo } from "react";
import type { ImageObject } from "./MainPage";

interface ImageSelectorProps {
  selectedImage: string;
  handleChange: any;
  availableImages: ImageObject[];
  isRightSelector: boolean;
}


const noImageItem = {
  id: "no-image",
  label: "No image",
  width: 0,
  height: 0,
  data: new Uint8Array(),
}
export const ImageSelector = (props: ImageSelectorProps) => {

  const itemsToRender = useMemo(() => createListCollection({items: [...props.availableImages, noImageItem]}), [props.availableImages])
  const text = props.isRightSelector ? "Select right image" : "Select left image";
  
  return (
    <Select.Root collection={itemsToRender} size="sm" width="320px" pt="2" value={[props.selectedImage]} onValueChange={(e) => props.handleChange(e.value[0] || "")}>
      <Select.Label>{text}</Select.Label>
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
            {[...props.availableImages, noImageItem].map((img) => (
              <Select.Item item={img} key={img.id}>
                {img.label}
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};
