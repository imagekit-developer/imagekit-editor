import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Switch,
  Text,
} from "@chakra-ui/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PiArrowLeft } from "@react-icons/all-files/pi/PiArrowLeft"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiInfo } from "@react-icons/all-files/pi/PiInfo"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { useEffect, useMemo } from "react"
import { Controller, type SubmitHandler, useForm } from "react-hook-form"
import Select from "react-select"
import CreateableSelect from "react-select/creatable"
import { z } from "zod/v3"
import type { TransformationField } from "../../schema"
import { transformationSchema } from "../../schema"
import { useEditorStore } from "../../store"
import AnchorField from "../common/AnchorField"
import ColorPickerField from "../common/ColorPickerField"
import { SidebarBody } from "./sidebar-body"
import { SidebarFooter } from "./sidebar-footer"
import { SidebarHeader } from "./sidebar-header"
import { SidebarRoot } from "./sidebar-root"

export const TransformationConfigSidebar: React.FC = () => {
  const {
    transformations,
    addTransformation,
    updateTransformation,
    _setSidebarState,
    _internalState,
    _setTransformationToEdit,
    _setSelectedTransformationKey,
  } = useEditorStore()

  const selectedTransformation = useMemo(() => {
    return transformationSchema
      .find(
        (transformation) =>
          transformation.key ===
          _internalState.selectedTransformationKey?.split("-")[0],
      )
      ?.items.find(
        (item) => item.key === _internalState.selectedTransformationKey,
      )
  }, [_internalState.selectedTransformationKey])

  const defaultValues = useMemo(() => {
    const transformationToEdit = _internalState.transformationToEdit

    if (
      transformationToEdit &&
      selectedTransformation &&
      transformationToEdit.position === "inplace"
    ) {
      const currentValues: Record<string, unknown> = {}

      const value = transformations.find(
        (transformation) =>
          transformation.id === transformationToEdit.transformationId,
      )?.value as Record<string, unknown>

      selectedTransformation.transformations.forEach((field) => {
        if (value && field.name in value) {
          currentValues[field.name] = value[field.name]
        } else {
          currentValues[field.name] = field.fieldProps?.defaultValue ?? ""
        }
      })

      return currentValues
    } else if (selectedTransformation) {
      return selectedTransformation.transformations.reduce(
        (acc, field) => {
          acc[field.name] = field.fieldProps?.defaultValue ?? ""
          return acc
        },
        {} as Record<string, unknown>,
      )
    }
    return {}
  }, [
    _internalState.transformationToEdit,
    selectedTransformation,
    transformations,
  ])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control,
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(selectedTransformation?.schema ?? z.object({})),
    defaultValues: defaultValues,
  })

  useEffect(() => {
    reset(defaultValues)
  }, [reset, defaultValues])

  const values = watch()

  const onClose = () => {
    _setSidebarState("none")
    _setSelectedTransformationKey(null)
    _setTransformationToEdit(null)
  }

  const onBack = () => {
    _setSidebarState("type")
  }

  const onApply = (data: Record<string, unknown>) => {
    if (!selectedTransformation) {
      return
    }

    const transformationToEdit = _internalState.transformationToEdit

    if (transformationToEdit && transformationToEdit.position === "inplace") {
      updateTransformation(transformationToEdit.transformationId, {
        type: "transformation",
        name: selectedTransformation.name,
        key: selectedTransformation.key,
        value: data,
      })
    } else if (
      transformationToEdit &&
      (transformationToEdit.position === "above" ||
        transformationToEdit.position === "below")
    ) {
      const index = transformations.findIndex(
        (transformation) => transformation.id === transformationToEdit.targetId,
      )

      const transformationId = addTransformation(
        {
          type: "transformation",
          name: selectedTransformation.name,
          key: selectedTransformation.key,
          value: data,
        },
        index + (transformationToEdit.position === "above" ? 0 : 1),
      )

      _setTransformationToEdit(transformationId, "inplace")
    } else {
      const transformationId = addTransformation({
        type: "transformation",
        name: selectedTransformation.name,
        key: selectedTransformation.key,
        value: data,
      })

      _setTransformationToEdit(transformationId, "inplace")
    }
  }

  const onSubmit = (
    shouldClose = false,
  ): SubmitHandler<Record<string, unknown>> => {
    return (data) => {
      onApply(data)
      if (shouldClose) {
        onClose()
      }
    }
  }

  if (!selectedTransformation) {
    return null
  }

  return (
    <SidebarRoot>
      <SidebarHeader>
        {!_internalState.transformationToEdit ? (
          <IconButton
            icon={<Icon as={PiArrowLeft} />}
            onClick={onBack}
            variant="ghost"
            size="sm"
            aria-label="Back Button"
          />
        ) : null}
        <Text fontSize="sm" fontWeight="normal">
          {selectedTransformation.name}
        </Text>

        {(selectedTransformation.description ||
          selectedTransformation.docsLink) && (
          <Popover
            trigger="hover"
            isLazy
            lazyBehavior="unmount"
            gutter={2}
            placement="bottom-end"
          >
            <PopoverTrigger>
              <IconButton
                icon={<Icon as={PiInfo} />}
                variant="ghost"
                size="sm"
                aria-label="Info Button"
              />
            </PopoverTrigger>
            <PopoverContent>
              <PopoverBody fontSize="xs">
                {selectedTransformation.description && (
                  <Text>{selectedTransformation.description}</Text>
                )}
                {selectedTransformation.docsLink && (
                  <Link
                    fontSize="10px"
                    href={selectedTransformation.docsLink}
                    isExternal
                    color="editorBlue.500"
                  >
                    Click here to view docs
                  </Link>
                )}
              </PopoverBody>
            </PopoverContent>
          </Popover>
        )}
        {_internalState.transformationToEdit && (
          <IconButton
            icon={<Icon as={PiX} />}
            onClick={onClose}
            variant="ghost"
            size="sm"
            aria-label="Close Button"
            ml="auto"
          />
        )}
      </SidebarHeader>

      <SidebarBody gap="6" p="4">
        {selectedTransformation.transformations
          .filter((field) => {
            if (field.isVisible) {
              return field.isVisible(values)
            }
            return true
          })
          .map((field: TransformationField) => (
            <FormControl key={field.name} isInvalid={!!errors[field.name]}>
              <FormLabel htmlFor={field.name} fontSize="xs">
                {field.label}
              </FormLabel>
              {field.fieldType === "select" ? (
                <Controller
                  name={field.name}
                  control={control}
                  render={({ field: controllerField }) => (
                    <Select
                      id={field.name}
                      placeholder="Select"
                      options={field.fieldProps?.options?.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                      value={field.fieldProps?.options?.find(
                        (option) => option.value === controllerField.value,
                      )}
                      onChange={(selectedOption) =>
                        controllerField.onChange(selectedOption?.value)
                      }
                      onBlur={controllerField.onBlur}
                      styles={{
                        control: (base) => ({
                          ...base,
                          fontSize: "12px",
                          minHeight: "32px",
                          borderColor: "#E2E8F0",
                        }),
                        option: (base) => ({
                          ...base,
                          fontSize: "12px",
                        }),
                      }}
                    />
                  )}
                />
              ) : null}
              {field.fieldType === "select-creatable" ? (
                <Controller
                  name={field.name}
                  control={control}
                  render={({ field: controllerField }) => (
                    <CreateableSelect
                      id={field.name}
                      placeholder="Select"
                      options={field.fieldProps?.options?.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                      value={field.fieldProps?.options?.find(
                        (option) => option.value === controllerField.value,
                      )}
                      onChange={(selectedOption) =>
                        controllerField.onChange(selectedOption?.value)
                      }
                      onBlur={controllerField.onBlur}
                      styles={{
                        control: (base) => ({
                          ...base,
                          fontSize: "12px",
                          minHeight: "32px",
                          borderColor: "#E2E8F0",
                        }),
                        option: (base) => ({
                          ...base,
                          fontSize: "12px",
                        }),
                      }}
                    />
                  )}
                />
              ) : null}
              {field.fieldType === "input" ? (
                <Input
                  id={field.name}
                  fontSize="xs"
                  size="sm"
                  {...register(field.name)}
                />
              ) : null}
              {field.fieldType === "switch" ? (
                <Switch
                  id={field.name}
                  fontSize="xs"
                  size="sm"
                  isChecked={watch(field.name) === true}
                  {...register(field.name)}
                />
              ) : null}
              {field.fieldType === "slider" ? (
                <Box pt={2} pb={2}>
                  <Flex justify="space-between" mb={1}>
                    <Input
                      id={`${field.name}-input`}
                      fontSize="xs"
                      size="sm"
                      width="80px"
                      value={(watch(field.name) as string) || ""}
                      defaultValue={field.fieldProps?.defaultValue}
                      onChange={(e) => setValue(field.name, e.target.value)}
                    />
                    {field.fieldProps?.autoOption && (
                      <Button
                        size="xs"
                        colorScheme={
                          watch(field.name) === "auto" ? "blue" : "gray"
                        }
                        onClick={() => setValue(field.name, "auto")}
                      >
                        Auto
                      </Button>
                    )}
                  </Flex>
                  <Slider
                    id={field.name}
                    min={field.fieldProps?.min || 0}
                    max={field.fieldProps?.max || 100}
                    step={field.fieldProps?.step || 1}
                    value={
                      Number.isNaN(Number(watch(field.name)))
                        ? 0
                        : Number(watch(field.name))
                    }
                    defaultValue={field.fieldProps?.defaultValue as number}
                    onChange={(val) => setValue(field.name, val.toString())}
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                </Box>
              ) : null}
              {field.fieldType === "color-picker" ? (
                <ColorPickerField
                  fieldName={field.name}
                  value={watch(field.name) as string}
                  setValue={setValue}
                />
              ) : null}
              {field.fieldType === "anchor" ? (
                <AnchorField
                  value={watch(field.name) as string}
                  positions={field.fieldProps?.positions as string[]}
                  onChange={(value) => setValue(field.name, value)}
                />
              ) : null}
              <FormErrorMessage fontSize="xs">
                {String(
                  errors[field.name as keyof typeof errors]?.message ?? "",
                )}
              </FormErrorMessage>
              {field.helpText && (
                <FormHelperText fontSize="xs">{field.helpText}</FormHelperText>
              )}
            </FormControl>
          ))}
      </SidebarBody>
      {errors[""] && (
        <Alert status="error" fontSize="xs" p="2">
          <AlertIcon />
          <AlertDescription lineHeight="normal">
            {errors[""]?.message}
          </AlertDescription>
        </Alert>
      )}
      <SidebarFooter>
        <HStack spacing={2} w="full" justifyContent="space-between">
          <Button variant="ghost" size="sm" fontSize="xs" onClick={onClose}>
            Discard changes
          </Button>

          <ButtonGroup
            size="sm"
            isAttached
            variant="solid"
            colorScheme="editorBlue"
          >
            <Button type="submit" onClick={handleSubmit(onSubmit())}>
              Apply
            </Button>
            <Menu placement="top-end" closeOnSelect>
              <MenuButton
                as={Button}
                colorScheme="editorBlue"
                borderLeft="1px"
                borderLeftColor="blue.300"
              >
                <Icon as={PiCaretDown} fontSize="xs" />
              </MenuButton>
              <MenuList minW="160px" fontSize="sm">
                <MenuItem onClick={handleSubmit(onSubmit(true))}>
                  Apply & Close
                </MenuItem>
              </MenuList>
            </Menu>
          </ButtonGroup>
        </HStack>
      </SidebarFooter>
    </SidebarRoot>
  )
}
