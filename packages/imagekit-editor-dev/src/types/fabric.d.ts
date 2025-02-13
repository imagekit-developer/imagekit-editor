import {
  Canvas as FabricCanvasOriginal,
  CanvasOptions as FabricCanvasOptions,
  FabricObject as FabricObjectOriginal,
  FabricObjectProps,
  Line as FabricLine,
  ObjectEvents,
  SerializedObjectProps,
  TFabricObjectProps,
} from "fabric";

declare module "fabric" {
  // @ts-expect-error
  export interface FabricObject<
    Props extends TFabricObjectProps = Partial<FabricObjectProps>,
    SProps extends SerializedObjectProps = SerializedObjectProps,
    EventSpec extends ObjectEvents = ObjectEvents,
  > extends FabricObjectOriginal<Props, SProps, EventSpec> {
    id: string;
    didCrop?: boolean;
  }

  // @ts-expect-error
  export interface Canvas extends FabricCanvasOriginal {
    guidelines: FabricLine[] | null;
    originalImageDimensions: {width: number; height: number} | null;
  }

  // @ts-expect-error
  export interface CanvasOptions extends FabricCanvasOptions {
    guidelines?: FabricLine[];
  }
}
