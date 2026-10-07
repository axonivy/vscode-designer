import fs from 'node:fs';
import path from 'node:path';

const extensionRoot = path.resolve(import.meta.dirname, '..');
const readJson = file => JSON.parse(fs.readFileSync(path.join(extensionRoot, file), 'utf8'));

const manifest = readJson('package.json');
const defaultCatalog = readJson('package.nls.json');
const localizedCatalogs = fs
  .readdirSync(extensionRoot)
  .filter(file => /^package\.nls\.[^.]+\.json$/.test(file))
  .map(file => [file.slice('package.nls.'.length, -'.json'.length), readJson(file)]);
const defaultBundleCatalog = readJson(path.join('l10n', 'bundle.l10n.json'));
const localizedBundleCatalogs = fs
  .readdirSync(path.join(extensionRoot, 'l10n'))
  .filter(file => /^bundle\.l10n\.[^.]+\.json$/.test(file))
  .map(file => [file.slice('bundle.l10n.'.length, -'.json'.length), readJson(path.join('l10n', file))]);

const referencedKeys = new Set();
const findReferencedKeys = value => {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/%([^%\s]+)%/g)) {
      referencedKeys.add(match[1]);
    }
  } else if (Array.isArray(value)) {
    value.forEach(findReferencedKeys);
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(findReferencedKeys);
  }
};

findReferencedKeys(manifest.description);
findReferencedKeys(manifest.displayName);
findReferencedKeys(manifest.contributes);

const errors = [];
if (localizedCatalogs.length === 0) {
  errors.push('No localized package.nls.*.json catalogs were found.');
}
if (localizedBundleCatalogs.length === 0) {
  errors.push('No localized l10n/bundle.l10n.*.json catalogs were found.');
}

const missingDefaultKeys = [...referencedKeys].filter(key => !Object.hasOwn(defaultCatalog, key));
if (missingDefaultKeys.length > 0) {
  errors.push(`package.nls.json is missing keys referenced by package.json: ${missingDefaultKeys.join(', ')}`);
}

for (const [locale, catalog] of localizedCatalogs) {
  const missingKeys = Object.keys(defaultCatalog).filter(key => !Object.hasOwn(catalog, key));
  const extraKeys = Object.keys(catalog).filter(key => !Object.hasOwn(defaultCatalog, key));
  if (missingKeys.length > 0) {
    errors.push(`package.nls.${locale}.json is missing keys from package.nls.json: ${missingKeys.join(', ')}`);
  }
  if (extraKeys.length > 0) {
    errors.push(`package.nls.${locale}.json has keys not present in package.nls.json: ${extraKeys.join(', ')}`);
  }
}

for (const [locale, catalog] of localizedBundleCatalogs) {
  const missingKeys = Object.keys(defaultBundleCatalog).filter(key => !Object.hasOwn(catalog, key));
  const extraKeys = Object.keys(catalog).filter(key => !Object.hasOwn(defaultBundleCatalog, key));
  if (missingKeys.length > 0) {
    errors.push(`l10n/bundle.l10n.${locale}.json is missing keys from l10n/bundle.l10n.json: ${missingKeys.join(', ')}`);
  }
  if (extraKeys.length > 0) {
    errors.push(`l10n/bundle.l10n.${locale}.json has keys not present in l10n/bundle.l10n.json: ${extraKeys.join(', ')}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Manifest and runtime localization catalogs are complete.');
}
