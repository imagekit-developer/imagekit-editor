import {Transformation} from "imagekit-javascript/dist/src/interfaces/Transformation";
import {ActionFn} from "../context";
import {EditorContextType} from "../interfaces/EditorContext";
import {ScaleMode, Tools} from "../utils/constants";

export const GENERATE_IMAGEKIT_URL = "GENERATE_IMAGEKIT_URL";

export interface GenerateImageKitUrlAction {
  type: typeof GENERATE_IMAGEKIT_URL;
}

const convertToolStateToTransformation = (
  _state: EditorContextType,
  options: EditorContextType["tool"]["options"],
): Transformation[] => {
  const transformations: Transformation[] = [];

  if (options[Tools.BACKGROUND]) {
    if (options[Tools.BACKGROUND].removeBackground) {
      const background = options[Tools.BACKGROUND].shadow?.enabled
        ? undefined
        : options[Tools.BACKGROUND].solidColor?.replace("#", "");

      transformations.push({
        "e-removedotbg": "-",
        bg: background,
      });

      if (options[Tools.BACKGROUND].aiPrompt) {
        transformations.push({
          "e-removedotbg": "-",
          "e-changebg-prompt": `${options[Tools.BACKGROUND].aiPrompt}`,
        });
      }

      if (options[Tools.BACKGROUND].shadow?.enabled) {
        transformations.push({
          "e-dropshadow": `az-${options[Tools.BACKGROUND].shadow.azimuth}_el-${options[Tools.BACKGROUND].shadow.elevation}_st-${options[Tools.BACKGROUND].shadow.saturation}`,
          bg: options[Tools.BACKGROUND].solidColor?.replace("#", ""),
        });
      }
    }
  }

  if (options[Tools.AI_IMAGE_EXTENDER]) {
    if (options[Tools.AI_IMAGE_EXTENDER].customSize) {
      transformations.push({
        raw: `w-${options[Tools.AI_IMAGE_EXTENDER].customSize.width},h-${options[Tools.AI_IMAGE_EXTENDER].customSize.height},bg-genfill,cm-pad_resize`,
      });
    }
  }

  if (options[Tools.CROP] && options[Tools.CROP].height && options[Tools.CROP].width) {
    transformations.push({
      h: String(options[Tools.CROP].height),
      w: String(options[Tools.CROP].width),
      x: String(options[Tools.CROP].x),
      y: String(options[Tools.CROP].y),
      cropMode: "extract",
    });
  }

  if (options[Tools.RESIZE]) {
    let transformation: (typeof transformations)[0] = {};

    if (options[Tools.RESIZE].percentage) {
      transformation = {
        w: `cw_mul_${options[Tools.RESIZE].percentage}`,
        h: `ch_mul_${options[Tools.RESIZE].percentage}`,
      };
    }
    if (options[Tools.RESIZE].width && options[Tools.RESIZE].height) {
      transformation = {
        h: String(options[Tools.RESIZE].height),
        w: String(options[Tools.RESIZE].width),
      };

      if (options[Tools.RESIZE].scale) {
        switch (options[Tools.RESIZE].scale) {
          case ScaleMode.FILL_SCREEN:
            break;
          case ScaleMode.FIT_SCREEN:
            transformation.cropMode = "pad_resize";
            break;
          case ScaleMode.STRETCH:
            transformation.crop = "force";
            break;
          case ScaleMode.CUSTOM:
            break;
        }
      }

      if (options[Tools.RESIZE].backgroundColor === "transparent") {
        transformation.format = "png";
      } else if (options[Tools.RESIZE].backgroundColor) {
        transformation.bg = options[Tools.RESIZE].backgroundColor.replace("#", "");
      }
    }

    transformations.push(transformation);
  }

  if (options[Tools.ADJUST]) {
    if (options[Tools.ADJUST].grayscale) {
      transformations.push({
        effectGray: "-",
      });
    }
    if (options[Tools.ADJUST].contrastStretch) {
      transformations.push({
        effectContrast: "-",
      });
    }
    if (options[Tools.ADJUST].sharpness && options[Tools.ADJUST].sharpness !== 0) {
      transformations.push({
        effectSharpen: String(options[Tools.ADJUST].sharpness),
      });
    }
    if (options[Tools.ADJUST].unsharpenMask && options[Tools.ADJUST].unsharpenMask !== 0) {
      transformations.push({
        effectUSM: String(options[Tools.ADJUST].sharpness),
      });
    }
  }

  if (options[Tools.AI_UPSCALER] && options[Tools.AI_UPSCALER].upscalingFactor) {
    transformations.push({
      raw: `e-upscale,h-ch_mul_${options[Tools.AI_UPSCALER].upscalingFactor}`,
    });
  }

  if (options[Tools.AI_RETOUCH] && options[Tools.AI_RETOUCH].enabled) {
    transformations.push({
      "e-retouch": "-",
    });
  }

  // console.log("Converting tool state to transformation", options, transformations);

  return transformations;
};

const generateImageKitUrlAction: ActionFn<GenerateImageKitUrlAction> = (state, _data) => {
  const imageUrl = state.client.url({
    src: state.originalImageUrl,
    transformation:
      state.history.head !== 0 ? convertToolStateToTransformation(state, state.history.stack[state.history.head]) : [],
  });

  // console.log("Generated ImageKit URL", imageUrl);

  return {
    ...state,
    imageUrl,
  };
};

export default generateImageKitUrlAction;
