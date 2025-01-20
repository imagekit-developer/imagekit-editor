import {CropMode} from "../utils/constants";

export interface CropOption {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  mode: CropMode;
  ratio?: number;
  rotation: number;
}
