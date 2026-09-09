import type { IvyIconsId } from '@axonivy/ui-icons';

export type IvyIconDefinitions = Record<
  string,
  {
    icon: IvyIconsId;
    lightColor: string;
    darkColor: string;
  }
>;

type Font = {
  id: string;
  src: Array<{ path: string; format: string }>;
  weight: string;
  style: string;
  size: string;
};

type IconDefinition = {
  fontId: string;
  fontCharacter: string;
  fontColor: string;
};

type IconThemeDefinition = {
  folder: string;
  fileExtensions: Record<string, string>;
  fileNames: Record<string, string>;
};

export type IconTheme = IconThemeDefinition & {
  information: string;
  fonts: Array<Font>;
  iconDefinitions: Record<string, IconDefinition>;
  light: IconThemeDefinition;
};
