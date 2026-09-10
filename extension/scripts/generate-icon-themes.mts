import { IVY_ICONS_CODEPOINTS, type IvyIconsId } from '@axonivy/ui-icons';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import {
  IVY_FILE_EXTENSIONS,
  IVY_FILE_NAMES,
  IVY_FOLDER,
  IVY_FONT_ID,
  IVY_ICON_DEFINITIONS,
  IVY_ICONS_FONT_FILE
} from './generate-icon-themes-definitions.mts';
import type { IconTheme } from './generate-icon-themes-types.mts';

const outputDirectory = resolve(import.meta.dirname, '../dist/icon-themes');
const outputColored = resolve(outputDirectory, 'ivy-icon-theme-colored.json');
const outputMonochrome = resolve(outputDirectory, 'ivy-icon-theme-monochrome.json');

const require = createRequire(import.meta.url);
const ivyIconsPackage = require.resolve('@axonivy/ui-icons/package.json');
const ivyIconsFontSource = resolve(dirname(ivyIconsPackage), `src-gen/${IVY_ICONS_FONT_FILE}`);
const ivyIconsFontOutput = resolve(outputDirectory, IVY_ICONS_FONT_FILE);

function toFontCharacter(icon: IvyIconsId) {
  return `\\${Number(IVY_ICONS_CODEPOINTS[icon]).toString(16)}`;
}

function toLight(iconDefinitionMapping: Record<string, string>) {
  return Object.fromEntries(Object.entries(iconDefinitionMapping).map(([key, value]) => [key, `${value}_light`]));
}

function themeColored(): IconTheme {
  const iconDefinitions = Object.fromEntries(
    Object.entries(IVY_ICON_DEFINITIONS).flatMap(([iconId, iconDefinition]) => [
      [
        `${iconId}_light`,
        {
          fontId: IVY_FONT_ID,
          fontCharacter: toFontCharacter(iconDefinition.icon),
          fontColor: iconDefinition.lightColor
        }
      ],
      [
        iconId,
        {
          fontId: IVY_FONT_ID,
          fontCharacter: toFontCharacter(iconDefinition.icon),
          fontColor: iconDefinition.darkColor
        }
      ]
    ])
  );

  return {
    fonts: [
      {
        id: IVY_FONT_ID,
        src: [{ path: `./${IVY_ICONS_FONT_FILE}`, format: 'woff2' }],
        weight: 'normal',
        style: 'normal',
        size: '120%'
      }
    ],
    iconDefinitions,
    folder: IVY_FOLDER,
    fileExtensions: IVY_FILE_EXTENSIONS,
    fileNames: IVY_FILE_NAMES,
    light: {
      folder: `${IVY_FOLDER}_light`,
      fileExtensions: toLight(IVY_FILE_EXTENSIONS),
      fileNames: toLight(IVY_FILE_NAMES)
    }
  };
}

function writeIconTheme(iconTheme: IconTheme, outputPath: string) {
  return writeFile(outputPath, `${JSON.stringify(iconTheme, null, 2)}\n`);
}

function makeMonochrome(ivyIconThemeColored: IconTheme) {
  return {
    ...ivyIconThemeColored,
    iconDefinitions: Object.fromEntries(
      Object.entries(ivyIconThemeColored.iconDefinitions).map(([key, value]) => [
        key,
        {
          ...value,
          fontColor: key.endsWith('_light') ? '#1b1b1b' : '#ffffff'
        }
      ])
    )
  };
}

export async function generateIconThemes() {
  await mkdir(outputDirectory, { recursive: true });
  const ivyIconThemeColored = themeColored();
  const ivyIconThemeMonochrome = makeMonochrome(ivyIconThemeColored);
  await Promise.all([
    copyFile(ivyIconsFontSource, ivyIconsFontOutput),
    writeIconTheme(ivyIconThemeColored, outputColored),
    writeIconTheme(ivyIconThemeMonochrome, outputMonochrome)
  ]);
}
