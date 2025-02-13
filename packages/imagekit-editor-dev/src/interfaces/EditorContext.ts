import ImageKit from "imagekit-javascript";
import {Tools} from "../utils/constants";
import {AdjustOption} from "./AdjustOption";
import {AIImageExtenderOption} from "./AIImageExtenderOption";
import {AIRetouchOption} from "./AIRetouchOption";
import {AIUpscalerOption} from "./AIUpscalerOption";
import {BackgroundOption} from "./BackgroundOption";
import {CropOption} from "./CropOption";
import {ResizeOption} from "./ResizeOption";

interface HistoryState {
  [Tools.RESIZE]: ResizeOption;
  [Tools.CROP]: CropOption;
  [Tools.ADJUST]: AdjustOption;
  [Tools.BACKGROUND]: BackgroundOption;
  [Tools.AI_UPSCALER]: AIUpscalerOption;
  [Tools.AI_IMAGE_EXTENDER]: AIImageExtenderOption;
  [Tools.AI_RETOUCH]: AIRetouchOption;
}

export interface EditorContextType {
  client: ImageKit;
  imageUrl: string;
  imageName: string;
  originalImageUrl: string;
  canvas: {
    width: number;
    height: number;
  };
  zoomLevel: {
    defaultValues: number[];
    value: number;
    x?: number | null;
    y?: number | null;
  };
  tool: {
    value?: Tools;
    options: {
      [Tools.RESIZE]: ResizeOption;
      [Tools.CROP]: CropOption;
      [Tools.ADJUST]: AdjustOption;
      [Tools.BACKGROUND]: BackgroundOption;
      [Tools.AI_UPSCALER]: AIUpscalerOption;
      [Tools.AI_IMAGE_EXTENDER]: AIImageExtenderOption;
      [Tools.AI_RETOUCH]: AIRetouchOption;
    };
  };
  imageDimensions?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  history: {
    head: number;
    stack: Array<HistoryState>;
  };
}

export type EditorContextInitialState = Omit<EditorContextType, "tool"> & {
  tool: Omit<EditorContextType["tool"], "options"> & {
    options?: EditorContextType["tool"]["options"];
  };
};
