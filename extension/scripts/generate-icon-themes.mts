import { IVY_ICONS_CODEPOINTS, type IvyIconsId } from '@axonivy/ui-icons';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { IVY_FILE_EXTENSIONS, IVY_FILE_NAMES, IVY_FOLDER, IVY_FONT_ID, IVY_ICON_DEFINITIONS } from './generate-icon-themes-definitions.mts';
import type { IconTheme } from './generate-icon-themes-types.mts';

const ICON_THEMES_OUTPUT_DIRECTORY = '../dist/icon-themes' as const;
const IVY_ICON_THEME_COLORED_NAME = 'ivy-icon-theme-colored' as const;
const IVY_ICON_THEME_MONOCHROME_NAME = 'ivy-icon-theme-monochrome' as const;

const IVY_UI_ICONS_PACKAGE = '@axonivy/ui-icons' as const;
const IVY_ICONS_SRC_GEN = 'src-gen' as const;
const IVY_ICONS_FONT_FILE = 'ivy-icons.woff2' as const;

const SETI_THEME_URL = 'https://raw.githubusercontent.com/microsoft/vscode/refs/heads/main/extensions/theme-seti/' as const;
const SETI_THEME_LICENSE = 'ThirdPartyNotices.txt' as const;

const SETI_ICON_THEME_URL = `${SETI_THEME_URL}/icons/` as const;
const SETI_ICON_THEME_NAME = 'vs-seti-icon-theme.json' as const;

const outputDirectory = resolve(import.meta.dirname, ICON_THEMES_OUTPUT_DIRECTORY);

async function fetchResource(url: string, base: string) {
  const resolvedUrl = new URL(url, base);
  const response = await fetch(resolvedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch '${resolvedUrl}': ${response.status} ${response.statusText}`);
  }
  return response;
}

function setiFontName(setiTheme: IconTheme) {
  const fonts = setiTheme.fonts;
  const fontSrc = fonts.at(0)?.src;
  if (!fontSrc || fonts.length !== 1) {
    throw new Error(`Expected exactly one font in the seti theme, but found ${fonts.length}`);
  }
  const font = fontSrc.at(0);
  if (!font || fontSrc?.length !== 1) {
    throw new Error(`Expected exactly one font source in the seti theme, but found ${fontSrc?.length}`);
  }
  return font.path.replace(/^\.\//, '');
}

async function writeFetchedFile(file: string, response: Response) {
  return writeFile(resolve(outputDirectory, file), Buffer.from(await response.arrayBuffer()));
}

async function setiTheme(): Promise<IconTheme> {
  const licenseResponse = await fetchResource(SETI_THEME_LICENSE, SETI_THEME_URL);
  await writeFetchedFile(SETI_THEME_LICENSE, licenseResponse);

  const themeResponse = await fetchResource(SETI_ICON_THEME_NAME, SETI_ICON_THEME_URL);
  const theme = (await themeResponse.json()) as IconTheme;

  const fontName = setiFontName(theme);
  const fontResponse = await fetchResource(fontName, SETI_ICON_THEME_URL);
  await writeFetchedFile(fontName, fontResponse);

  return theme;
}

function toFontCharacter(icon: IvyIconsId) {
  return `\\${Number(IVY_ICONS_CODEPOINTS[icon]).toString(16)}`;
}

function toLight(iconDefinitionMapping: Record<string, string>) {
  return Object.fromEntries(Object.entries(iconDefinitionMapping).map(([key, value]) => [key, `${value}_light`]));
}

async function themeColored(): Promise<IconTheme> {
  const setiIconTheme = await setiTheme();
  const ivyIconDefinitions = Object.fromEntries(
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
    ...setiIconTheme,
    fonts: [
      ...setiIconTheme.fonts,
      {
        id: IVY_FONT_ID,
        src: [{ path: `./${IVY_ICONS_FONT_FILE}`, format: 'woff2' }],
        weight: 'normal',
        style: 'normal',
        size: '120%'
      }
    ],
    iconDefinitions: { ...setiIconTheme.iconDefinitions, ...ivyIconDefinitions },
    folder: IVY_FOLDER,
    fileExtensions: { ...setiIconTheme.fileExtensions, ...IVY_FILE_EXTENSIONS },
    fileNames: { ...setiIconTheme.fileNames, ...IVY_FILE_NAMES },
    light: {
      ...setiIconTheme.light,
      folder: `${IVY_FOLDER}_light`,
      fileExtensions: { ...setiIconTheme.light?.fileExtensions, ...toLight(IVY_FILE_EXTENSIONS) },
      fileNames: { ...setiIconTheme.light?.fileNames, ...toLight(IVY_FILE_NAMES) }
    }
  };
}

function writeIconTheme(iconTheme: IconTheme, iconThemeName: string) {
  return writeFile(resolve(outputDirectory, `${iconThemeName}.json`), `${JSON.stringify(iconTheme)}`);
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
  const require = createRequire(import.meta.url);
  const ivyIconsPackage = require.resolve(`${IVY_UI_ICONS_PACKAGE}/package.json`);
  const ivyIconsFontSource = resolve(dirname(ivyIconsPackage), IVY_ICONS_SRC_GEN, IVY_ICONS_FONT_FILE);

  await mkdir(outputDirectory, { recursive: true });
  const ivyIconThemeColored = await themeColored();
  const ivyIconThemeMonochrome = makeMonochrome(ivyIconThemeColored);

  await Promise.all([
    copyFile(ivyIconsFontSource, resolve(outputDirectory, IVY_ICONS_FONT_FILE)),
    writeIconTheme(ivyIconThemeColored, IVY_ICON_THEME_COLORED_NAME),
    writeIconTheme(ivyIconThemeMonochrome, IVY_ICON_THEME_MONOCHROME_NAME)
  ]);
}
