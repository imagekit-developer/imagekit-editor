import {FieldOption, FieldOptions} from "./types";

export const mapOptions = <TOption extends FieldOption = FieldOption>(options: FieldOptions<TOption>) => {
  return options.map((option) => {
    if (typeof option === "string") {
      return {
        label: option,
        value: option,
      };
    }
    return option;
  });
};
