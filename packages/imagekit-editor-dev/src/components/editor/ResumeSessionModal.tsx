import { Box, Flex, Icon, IconButton, Text } from "@chakra-ui/react"
import { PiX } from "@react-icons/all-files/pi/PiX"

export type ResumeSessionModalProps = {
  onRestore: () => void
  onStartNew: () => void
  onCloseEditor: () => void
}

export function ResumeSessionModal({
  onRestore,
  onStartNew,
  onCloseEditor,
}: ResumeSessionModalProps) {
  return (
    <Box
      position="fixed"
      inset={0}
      bg="blackAlpha.400"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={2200}
    >
      <Box
        w={{ base: "92vw", md: "40vw" }}
        maxW={{ base: "92vw", md: "40vw" }}
        bg="white"
        borderRadius="xl"
        boxShadow="xl"
        overflow="hidden"
      >
        {/* Header */}
        <Flex
          px="6"
          py="4"
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth="1px"
          borderColor="editorGray.300"
        >
          <Text fontSize="lg" fontWeight="semibold" color="editorGray.900">
            Resume previous session?
          </Text>
          <IconButton
            variant="ghost"
            size="sm"
            icon={<Icon as={PiX} boxSize={5} />}
            aria-label="Close resume session"
            onClick={onCloseEditor}
          />
        </Flex>

        {/* Content */}
        <Box px="6" py="6">
          <Text fontSize="sm" color="editorBattleshipGrey.600" lineHeight="1.6">
            You have unsaved changes from a previous session. Would you like to
            restore your work and resume that session, or start a new one?
          </Text>
          <Text fontSize="sm" color="red.500" mt="4" lineHeight="1.6">
            If you start a new session, any previous unsaved changes will be
            discarded forever. This action is irreversible.
          </Text>
        </Box>

        {/* Footer */}
        <Flex px="6" pb="6" justifyContent="flex-end" gap="2" flexWrap="wrap">
          <Box
            as="button"
            display="inline-flex"
            alignItems="center"
            px="3"
            py="1.5"
            borderRadius="md"
            borderWidth="1px"
            borderColor="gray.200"
            bg="white"
            fontSize="sm"
            fontWeight="medium"
            color="gray.600"
            cursor="pointer"
            _hover={{ bg: "gray.50" }}
            onClick={onStartNew}
          >
            Start a new session
          </Box>
          <Box
            as="button"
            display="inline-flex"
            alignItems="center"
            px="3"
            py="1.5"
            borderRadius="md"
            bg="editorBlue.500"
            fontSize="sm"
            fontWeight="semibold"
            color="white"
            cursor="pointer"
            _hover={{ bg: "editorBlue.600" }}
            onClick={onRestore}
          >
            Restore session
          </Box>
        </Flex>
      </Box>
    </Box>
  )
}
