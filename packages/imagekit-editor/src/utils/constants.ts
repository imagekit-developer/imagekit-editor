import {IconType} from "@react-icons/all-files";
import {CiCircleQuestion} from "@react-icons/all-files/ci/CiCircleQuestion";
import {HiOutlineAdjustmentsHorizontal} from "@react-icons/all-files/hi2/HiOutlineAdjustmentsHorizontal";
import {MdCropRotate} from "@react-icons/all-files/md/MdCropRotate";
import {PiArrowsOut} from "@react-icons/all-files/pi/PiArrowsOut";
import {PiResizeBold} from "@react-icons/all-files/pi/PiResizeBold";
import {TbArrowBarBoth} from "@react-icons/all-files/tb/TbArrowBarBoth";
import {TbBackground} from "@react-icons/all-files/tb/TbBackground";
import {VscScreenFull} from "@react-icons/all-files/vsc/VscScreenFull";
import {VscScreenNormal} from "@react-icons/all-files/vsc/VscScreenNormal";

import {
  IKCropFreeform,
  IKCropIPhone,
  IKCropLandscape,
  IKCropPortrait,
  IKCropPresentation,
  IKCropSquare,
  IKCropWidescreen,
} from "../icons/IKCrop";
import {IKCustomScale} from "../icons/IKCustomScale";

export const DEFAULT_ZOOM_LEVEL = 1;

export const SNAPPING_DISTANCE = 10;

export enum Tools {
  CROP = "crop",
  RESIZE = "resize",
  ADJUST = "adjust",
  BACKGROUND = "background",
  // AI_EDITOR = "ai_editor",
  AI_IMAGE_EXTENDER = "ai_image_extender",
  AI_RETOUCH = "ai_retouch",
  AI_UPSCALER = "ai_upscaler",
}

export const ToolIcons: Record<Tools, IconType> = {
  [Tools.CROP]: MdCropRotate,
  [Tools.RESIZE]: PiResizeBold,
  [Tools.ADJUST]: HiOutlineAdjustmentsHorizontal,
  [Tools.BACKGROUND]: TbBackground,
  // [Tools.AI_EDITOR]: PiPaintBrush,
  [Tools.AI_IMAGE_EXTENDER]: PiArrowsOut,
  [Tools.AI_RETOUCH]: CiCircleQuestion,
  [Tools.AI_UPSCALER]: CiCircleQuestion,
};

export const ToolHeadings: Record<Tools, string> = {
  [Tools.CROP]: "Crop",
  [Tools.RESIZE]: "Resize",
  [Tools.ADJUST]: "Adjust",
  [Tools.BACKGROUND]: "Background",
  // [Tools.AI_EDITOR]: "AI Editor",
  [Tools.AI_IMAGE_EXTENDER]: "AI Image Extender",
  [Tools.AI_RETOUCH]: "AI Retouch",
  [Tools.AI_UPSCALER]: "AI Upscaler",
};

export enum CropMode {
  FREEFORM = "freeform",
  SQUARE = "square",
  WIDESCREEN = "widescreen",
  IPHONE = "iphone",
  LANDSCAPE = "landscape",
  PORTRAIT = "portrait",
  PRESENTATION = "presentation",
}

export const CropModeIcons: Record<CropMode, IconType> = {
  [CropMode.FREEFORM]: IKCropFreeform,
  [CropMode.SQUARE]: IKCropSquare,
  [CropMode.WIDESCREEN]: IKCropWidescreen,
  [CropMode.IPHONE]: IKCropIPhone,
  [CropMode.LANDSCAPE]: IKCropLandscape,
  [CropMode.PORTRAIT]: IKCropPortrait,
  [CropMode.PRESENTATION]: IKCropPresentation,
};

export const CropModeHeadings: Record<CropMode, string> = {
  [CropMode.FREEFORM]: "Freeform",
  [CropMode.SQUARE]: "Square",
  [CropMode.WIDESCREEN]: "Widescreen",
  [CropMode.IPHONE]: "iPhone",
  [CropMode.LANDSCAPE]: "Landscape",
  [CropMode.PORTRAIT]: "Portrait",
  [CropMode.PRESENTATION]: "Presentation",
};

export const CropModeSubtitles: Record<CropMode, string> = {
  [CropMode.FREEFORM]: "-",
  [CropMode.SQUARE]: "1:1",
  [CropMode.WIDESCREEN]: "16:9",
  [CropMode.IPHONE]: "9:16",
  [CropMode.LANDSCAPE]: "3:2",
  [CropMode.PORTRAIT]: "2:3",
  [CropMode.PRESENTATION]: "4:3",
};

export const CropModeRatios: Record<CropMode, number | undefined> = {
  [CropMode.FREEFORM]: undefined,
  [CropMode.SQUARE]: 1,
  [CropMode.WIDESCREEN]: 16 / 9,
  [CropMode.IPHONE]: 9 / 16,
  [CropMode.LANDSCAPE]: 3 / 2,
  [CropMode.PORTRAIT]: 2 / 3,
  [CropMode.PRESENTATION]: 4 / 3,
};

export enum ResizeMode {
  CUSTOM_SIZE = "custom-size",
  PERCENTAGE = "percentage",
  INSTAGRAM = "instagram",
  FACEBOOK = "facebook",
  LINKEDIN = "linkedin",
  TWITTER = "twitter",
  YOUTUBE = "youtube",
  PINTEREST = "pinterest",
  SNAPCHAT = "snapchat",
}

export enum ScaleMode {
  FILL_SCREEN = "fill-screen",
  FIT_SCREEN = "fit-screen",
  STRETCH = "stretch",
  CUSTOM = "custom",
}

export const ScaleModeIcons: Record<ScaleMode, IconType> = {
  [ScaleMode.FILL_SCREEN]: VscScreenFull,
  [ScaleMode.FIT_SCREEN]: VscScreenNormal,
  [ScaleMode.STRETCH]: TbArrowBarBoth,
  [ScaleMode.CUSTOM]: IKCustomScale,
};

export const ScaleModeHeadings: Record<ScaleMode, string> = {
  [ScaleMode.FILL_SCREEN]: "Fill screen",
  [ScaleMode.FIT_SCREEN]: "Fit screen",
  [ScaleMode.STRETCH]: "Stretch",
  [ScaleMode.CUSTOM]: "Custom",
};

export enum POINTER_ICONS {
  DEFAULT = "default",
  DRAW = "crosshair",
  SELECT = "pointer",
  MOVE = "move",
  DRAG = "grab",
}

export const DEFAULT_TOOLS_STATE = Object.freeze({
  [Tools.RESIZE]: {
    mode: ResizeMode.CUSTOM_SIZE,
    maintainAspectRatio: true,
  },
  [Tools.CROP]: {
    mode: CropMode.FREEFORM,
    x: 0,
    y: 0,
    rotation: 0,
  },
  [Tools.ADJUST]: {},
  [Tools.BACKGROUND]: {
    shadow: {
      enabled: false,
      azimuth: 215,
      elevation: 45,
      saturation: 60,
    },
  },
  [Tools.AI_UPSCALER]: {},
  [Tools.AI_RETOUCH]: {},
  [Tools.AI_IMAGE_EXTENDER]: {
    sizeCategory: "Standard Options",
  },
});

export const AIImageExtenderOptions = [
  {
    category: "Standard Options",
    items: [
      {
        name: "Square",
        label: "1:1",
        icon: IKCropSquare,
        value: 1 / 1,
      },
      {
        name: "Widescreen",
        icon: IKCropWidescreen,
        label: "16:9",
        value: 16 / 9,
      },
      {
        name: "iPhone",
        icon: IKCropIPhone,
        label: "9:16",
        value: 9 / 16,
      },
      {
        name: "Landscape",
        icon: IKCropLandscape,
        label: "3:2",
        value: 3 / 2,
      },
      {
        name: "Presentation",
        icon: IKCropPresentation,
        label: "4:3",
        value: 4 / 3,
      },
      {
        name: "Portrait",
        icon: IKCropPortrait,
        label: "2:3",
        value: 2 / 3,
      },
    ],
  },
  {
    category: "Instagram",
    items: [
      {
        name: "Square Post",
        label: "1080 x 1080",
        icon: IKCropSquare,
        value: 1080 / 1080,
      },
      {
        name: "Landscape",
        label: "1080 x 566",
        icon: IKCropLandscape,
        value: 1080 / 566,
      },
      {
        name: "iPhone",
        label: "1080 x 1920",
        icon: IKCropIPhone,
        value: 1080 / 1920,
      },
      {
        name: "Portrait",
        label: "1080 x 1350",
        icon: IKCropPortrait,
        value: 1080 / 1350,
      },
    ],
  },
  {
    category: "Facebook",
    items: [],
  },
  {
    category: "LinkedIn",
    items: [],
  },
  {
    category: "X (Twitter)",
    items: [],
  },
  {
    category: "Youtube",
    items: [],
  },
  {
    category: "Pinterest",
    items: [],
  },
  {
    category: "SnapChat",
    items: [],
  },
];
