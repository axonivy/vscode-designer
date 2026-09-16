import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';
import { extensions, version } from 'vscode';
import { IvyEngineManager } from '../../engine/engine-manager';
import { extensionVersion } from '../../version/extension-version';

const execFileAsync = promisify(execFile);

export type SystemInfo = {
  engineVersion: string;
  extensionVersion: string;
  vsCodeVersion: string;
  operatingSystem: OperatingSystemInfo;
  cpu: CpuInfo;
  memory: MemoryInfo;
  java: string;
  maven: string;
  extensions: ExtensionInfo[];
};

type OperatingSystemInfo = {
  platform: string;
  release: string;
  arch: string;
};

type CpuInfo = {
  model: string;
  logicalCores: number;
  usagePercent: number;
};

type MemoryInfo = {
  totalMb: number;
  usedMb: number;
  freeMb: number;
  usagePercent: number;
};

type ExtensionInfo = {
  id: string;
  version: string;
};

type CpuTimes = {
  idle: number;
  total: number;
};

export const getSystemInfo = async (): Promise<SystemInfo> => {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const engineVersion = (await IvyEngineManager.instance.getEngineVersion()) ?? '';

  const [cpuUsage, java, maven] = await Promise.all([getCpuUsage(), getJavaVersion(), getMavenVersion()]);

  return {
    engineVersion,
    extensionVersion: `${extensionVersion.major}.${extensionVersion.minor}.${extensionVersion.patch}`,
    vsCodeVersion: version,

    operatingSystem: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch()
    },

    cpu: {
      model: cpus[0]?.model ?? 'Unknown',
      logicalCores: cpus.length,
      usagePercent: round(cpuUsage)
    },

    memory: {
      totalMb: toMb(totalMemory),
      usedMb: toMb(totalMemory - freeMemory),
      freeMb: toMb(freeMemory),
      usagePercent: round(((totalMemory - freeMemory) / totalMemory) * 100)
    },

    java,
    maven,

    extensions: extensions.all
      .filter(extension => !extension.packageJSON.isBuiltin)
      .map(extension => ({
        id: extension.id,
        version: extension.packageJSON.version
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
  };
};

const getJavaVersion = async (): Promise<string> => {
  try {
    const { stdout, stderr } = await execFileAsync('java', ['-version']);
    return firstLine(stderr || stdout);
  } catch {
    return 'Not available';
  }
};

const getMavenVersion = async (): Promise<string> => {
  try {
    const { stdout, stderr } = await execFileAsync('mvn', ['-version']);
    return firstLine(stdout || stderr);
  } catch {
    return 'Not available';
  }
};

const firstLine = (value: string) => value.trim().split(/\r?\n/)[0] ?? 'Unknown';

const getCpuUsage = async (): Promise<number> => {
  const start = getCpuTimes();

  await new Promise(resolve => setTimeout(resolve, 500));

  const end = getCpuTimes();

  const idle = end.idle - start.idle;
  const total = end.total - start.total;

  if (total === 0) {
    return 0;
  }

  return ((total - idle) / total) * 100;
};

const getCpuTimes = (): CpuTimes =>
  os.cpus().reduce<CpuTimes>(
    (result, cpu) => {
      const total = Object.values(cpu.times).reduce((sum, time) => sum + time, 0);

      return {
        idle: result.idle + cpu.times.idle,
        total: result.total + total
      };
    },
    { idle: 0, total: 0 }
  );

const toMb = (bytes: number): number => Math.round(bytes / 1024 / 1024);

const round = (value: number): number => Math.round(value * 10) / 10;
