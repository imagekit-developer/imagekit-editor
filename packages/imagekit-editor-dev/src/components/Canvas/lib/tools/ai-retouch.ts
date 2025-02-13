import {Canvas as FabricCanvas, FabricImage} from "fabric";

interface InitAIRetouchProps {
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  imageRef: React.MutableRefObject<FabricImage | null>;
}

export const initializeAIRetouch = ({fabricRef, imageRef}: InitAIRetouchProps) => {
  if (!imageRef.current || !fabricRef.current) return;
};
