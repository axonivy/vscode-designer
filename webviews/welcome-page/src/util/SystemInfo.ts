import { HOST_EXTENSION, type RequestType } from 'vscode-messenger-common';
import type { Messenger } from 'vscode-messenger-webview';

export const getSystemInfoType: RequestType<void, SystemInfo> = {
  method: 'getSystemInfo'
};

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

export const SystemInfo = {
  get(messenger: Messenger) {
    return messenger.sendRequest(getSystemInfoType, HOST_EXTENSION);
  }
};
