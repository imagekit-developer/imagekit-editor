import {Icon, IconButton} from "@chakra-ui/react";
import {CiCircleInfo} from "@react-icons/all-files/ci/CiCircleInfo";

interface Props {
  label: string;
  url: string;
}

export const InfoButton = ({label, url}: Props) => {
  return (
    <IconButton
      icon={<Icon as={CiCircleInfo} boxSize={4} />}
      variant="ghost"
      rounded="full"
      p="1"
      size="xs"
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        window.open(url, "_blank", "noopener,noreferrer");
      }}
    />
  );
};
