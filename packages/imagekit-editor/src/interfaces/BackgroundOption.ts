export interface BackgroundOption {
  removeBackground?: boolean;
  solidColor?: string;
  aiBackground?: boolean;
  shadow?: {
    enabled?: boolean;
    azimuth?: number;
    elevation?: number;
    saturation?: number;
  };
}
