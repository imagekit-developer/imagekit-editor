import { Button, type ButtonProps, Icon, IconButton } from "@chakra-ui/react"
import type React from "react"

interface NavbarItemProps extends Omit<ButtonProps, "variant" | "size"> {
  icon?: React.ReactElement
  label: string
  variant?: "button" | "icon"
}

export const NavbarItem = ({
  icon,
  label,
  variant = "button",
  children,
  ...props
}: NavbarItemProps) => {
  const commonStyles = {
    variant: "ghost" as const,
    borderRadius: "md" as const,
    px: "4" as const,
    py: "2" as const,
    mx: "2" as const,
    fontSize: "sm" as const,
    fontWeight: "medium" as const,
    _hover: {
      bg: "editorBattleshipGrey.50",
    },
  }

  // If only icon is provided (no children or label to display), use icon variant
  if (variant === "icon" || (!children && icon && !label)) {
    return (
      <IconButton
        aria-label={label}
        icon={icon ? <Icon as={icon.type} boxSize={5} /> : undefined}
        color="editorBattleshipGrey.500"
        {...commonStyles}
        {...props}
      />
    )
  }

  return (
    <Button leftIcon={icon} aria-label={label} {...commonStyles} {...props}>
      {children || label}
    </Button>
  )
}
