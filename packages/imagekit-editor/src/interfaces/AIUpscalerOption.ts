export interface AIUpscalerOption {
  upscalingFactor?: string;
  originalImageDimensions?: {
    width: number;
    height: number;
  };
  scaledImageDimensions?: {
    width: number;
    height: number;
  };
}
