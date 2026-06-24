export const OWN_TOOL_NAMES = new Set([
  'new_axon_ivy_project',
  'new_axon_ivy_data_class',
  'new_axon_ivy_process',
  'new_axon_ivy_dialog'
] as const);

export type OwnToolName = typeof OWN_TOOL_NAMES extends Set<infer T> ? T : never;

export function isOwnToolName(name: string): name is OwnToolName {
  return OWN_TOOL_NAMES.has(name as OwnToolName);
}
