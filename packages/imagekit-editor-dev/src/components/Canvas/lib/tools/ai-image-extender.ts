import {Canvas as FabricCanvas, FabricImage} from "fabric";

interface InitAIImageExtenderProps {
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  imageRef: React.MutableRefObject<FabricImage | null>;
}

export const initializeAIImageExtender = ({fabricRef, imageRef}: InitAIImageExtenderProps) => {
  if (!imageRef.current || !fabricRef.current) return;
};
