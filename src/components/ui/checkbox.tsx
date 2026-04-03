import { Checkbox as ChakraCheckbox } from "@chakra-ui/react"
import * as React from "react"

export interface CheckboxProps extends ChakraCheckbox.RootProps {
  checked: boolean
  onCheckedChange: (details: ChakraCheckbox.CheckedChangeDetails) => void  
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(props, ref) {
    const { children, ...rest } = props
    return (
      <ChakraCheckbox.Root {...rest}>
        <ChakraCheckbox.HiddenInput ref={ref} />
        <ChakraCheckbox.Control>
          {<ChakraCheckbox.Indicator />}
        </ChakraCheckbox.Control>
        {children != null && (
          <ChakraCheckbox.Label>{children}</ChakraCheckbox.Label>
        )}
      </ChakraCheckbox.Root>
    )
  },
)
