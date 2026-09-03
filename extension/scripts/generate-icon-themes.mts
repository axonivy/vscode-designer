import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { IVY_ICONS_CODEPOINTS } from '@axonivy/ui-icons';

const output = resolve(import.meta.dirname, '../fileicons/ivy-icon-theme.json');

type IconTheme = {
  fonts: Array<{
    id: string;
    src: Array<{ path: string; format: string }>;
    weight: string;
    style: string;
    size: string;
  }>;
  iconDefinitions: Record<string, { fontCharacter: string }>;
};

function toFontCharacter(codepoint: string): string {
  const value = Number.parseInt(codepoint, 10);
  if (!Number.isInteger(value) || value < 0 || value > 0x10ffff) {
    throw new Error(`Invalid Ivy icon codepoint: ${codepoint}`);
  }
  return `\\${value.toString(16).toUpperCase()}`;
}

function createTheme(): IconTheme {
  const iconDefinitions = Object.fromEntries(
    Object.entries(IVY_ICONS_CODEPOINTS).map(([iconId, codepoint]) => [`_ivy_${iconId}`, { fontCharacter: toFontCharacter(codepoint) }])
  );

  return {
    fonts: [
      {
        id: 'ivy',
        src: [{ path: '../node_modules/@axonivy/ui-icons/src-gen/ivy-icons.woff2', format: 'woff2' }],
        weight: 'normal',
        style: 'normal',
        size: '120%'
      }
    ],
    iconDefinitions
  };
}

async function run() {
  await writeFile(output, `${JSON.stringify(createTheme(), null, 2)}\n`, 'utf8');
  console.log(`Generated ${output}`);
}

await mkdir(dirname(output), { recursive: true });
await run();
