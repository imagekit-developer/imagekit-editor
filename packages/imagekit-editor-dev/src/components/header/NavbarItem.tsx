import { Button, type ButtonProps, Icon, IconButton } from "@chakra-ui/react"
import type React from "react"
import { forwardRef } from "react"
import { chakraAny } from "../../utils"

interface NavbarItemProps extends Omit<ButtonProps, "variant" | "size"> {
  icon?: React.ReactElement
  label: string
  variant?: "button" | "icon"
}

export const NavbarItem = forwardRef<HTMLButtonElement, NavbarItemProps>(
  function NavbarItem(
    { icon, label, variant = "button", children, ...props },
    ref,
  ) {
    const ButtonAny = chakraAny(Button)
    const IconButtonAny = chakraAny(IconButton)
    const commonStyles = {
      variant: "ghost" as const,
      borderRadius: "md" as const,
      px: "4" as const,
      py: "2" as const,
      mx: "2" as const,
      fontSize: "sm" as const,
      fontWeight: "medium" as const,
      color: "editorBattleshipGrey.700",
      _hover: {
        bg: "gray.100",
      },
    }

    // If only icon is provided (no children or label to display), use icon variant
    if (variant === "icon" || (!children && icon && !label)) {
      return (
        <IconButtonAny
          ref={ref}
          aria-label={label}
          icon={
            icon ? (
              <Icon as={icon.type as React.ElementType} boxSize={5} />
            ) : undefined
          }
          {...commonStyles}
          {...(props as unknown as Record<string, unknown>)}
        />
      )
    }

    return (
      <ButtonAny
        ref={ref}
        leftIcon={icon}
        aria-label={label}
        {...commonStyles}
        {...(props as unknown as Record<string, unknown>)}
      >
        {children || label}
      </ButtonAny>
    )
  },
)
