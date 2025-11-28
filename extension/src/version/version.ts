export type Version = { major: number; minor: number; patch: number; rawVersion: string };

export const toVersion = (rawVersion: string) => {
  const splittedVersion = rawVersion.split('.');
  if (splittedVersion.length < 3) {
    throw new Error(`Invalid version ${rawVersion}`);
  }
  return {
    major: toInt(rawVersion, splittedVersion[0]),
    minor: toInt(rawVersion, splittedVersion[1]),
    patch: toInt(rawVersion, splittedVersion[2]),
    rawVersion
  };
};

const toInt = (rawVersion: string, value?: string) => {
  const int = parseInt(value ?? '');
  if (isNaN(int)) {
    throw new Error(`Invalid version part ${value} in version ${rawVersion}`);
  }
  return int;
};
