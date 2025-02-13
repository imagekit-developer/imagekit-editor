export interface BackgroundOption {
  removeBackground?: boolean;
  solidColor?: string;
  aiPrompt?: string;
  shadow?: {
    enabled?: boolean;
    azimuth?: number;
    elevation?: number;
    saturation?: number;
  };
}
