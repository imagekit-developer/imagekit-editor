import {ResizeMode, ScaleMode} from "../utils/constants";

export interface ResizeOption {
  mode: ResizeMode;
  height?: number;
  width?: number;
  percentage?: number;
  maintainAspectRatio?: boolean;
  scale?: ScaleMode;
  backgroundColor?: string;
}
