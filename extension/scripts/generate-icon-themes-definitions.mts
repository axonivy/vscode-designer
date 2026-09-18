import { IvyIcons } from '@axonivy/ui-icons';
import type { IvyIconDefinitions } from './generate-icon-themes-types.mts';

export const IVY_FONT_ID = 'ivy' as const;

export const IVY_ICON_DEFINITIONS: IvyIconDefinitions = {
  _ivy_folder: {
    icon: IvyIcons.FolderClosed,
    lightColor: '#bfc2c1',
    darkColor: '#d4d7d6'
  },
  _ivy_folder_expanded: {
    icon: IvyIcons.FolderOpen,
    lightColor: '#bfc2c1',
    darkColor: '#d4d7d6'
  },
  _ivy_process: {
    icon: IvyIcons.Process,
    lightColor: '#498ba7',
    darkColor: '#519aba'
  },
  _ivy_dataclass: {
    icon: IvyIcons.DataClass,
    lightColor: '#7fae42',
    darkColor: '#8dc149'
  },
  _ivy_form: {
    icon: IvyIcons.Form,
    lightColor: '#b7b73b',
    darkColor: '#cbcb41'
  },
  _ivy_casemap: {
    icon: IvyIcons.CaseMap,
    lightColor: '#b8383d',
    darkColor: '#cc3e44'
  },
  _ivy_cms: {
    icon: IvyIcons.Cms,
    lightColor: '#498ba7',
    darkColor: '#519aba'
  },
  _ivy_custom_fields: {
    icon: IvyIcons.CustomFields,
    lightColor: '#cc6d2e',
    darkColor: '#e37933'
  },
  _ivy_databases: {
    icon: IvyIcons.Database,
    lightColor: '#7fae42',
    darkColor: '#8dc149'
  },
  _ivy_formats: {
    icon: IvyIcons.Formats,
    lightColor: '#bfc2c1',
    darkColor: '#d4d7d6'
  },
  _ivy_overrides: {
    icon: IvyIcons.Overrides,
    lightColor: '#b8383d',
    darkColor: '#cc3e44'
  },
  _ivy_persistence: {
    icon: IvyIcons.PersistenceConfig,
    lightColor: '#627379',
    darkColor: '#6d8086'
  },
  _ivy_restclients: {
    icon: IvyIcons.RestClient,
    lightColor: '#498ba7',
    darkColor: '#519aba'
  },
  _ivy_roles: {
    icon: IvyIcons.Users,
    lightColor: '#dd4b78',
    darkColor: '#f55385'
  },
  _ivy_users: {
    icon: IvyIcons.User,
    lightColor: '#b8383d',
    darkColor: '#cc3e44'
  },
  _ivy_variables: {
    icon: IvyIcons.Variables,
    lightColor: '#9068b0',
    darkColor: '#a074c4'
  },
  _ivy_webservices: {
    icon: IvyIcons.WsStart,
    lightColor: '#b7b73b',
    darkColor: '#cbcb41'
  },
  _ivy_axonivy: {
    icon: IvyIcons.AxonIvy,
    lightColor: '#bfc2c1',
    darkColor: '#d4d7d6'
  }
} as const;

export const IVY_FOLDER = '_ivy_folder' as const;
export const IVY_FOLDER_EXPANDED = '_ivy_folder_expanded' as const;

export const IVY_FILE_EXTENSIONS = {
  'p.json': '_ivy_process',
  'd.json': '_ivy_dataclass',
  'f.json': '_ivy_form',
  'm.json': '_ivy_casemap',
  'cms/yaml': '_ivy_cms'
} as const;

export const IVY_FILE_NAMES = {
  'custom-fields.yaml': '_ivy_custom_fields',
  'databases.yaml': '_ivy_databases',
  'formats.yaml': '_ivy_formats',
  'overrides.any': '_ivy_overrides',
  'persistence.yaml': '_ivy_persistence',
  'rest-clients.yaml': '_ivy_restclients',
  'roles.yaml': '_ivy_roles',
  'users.yaml': '_ivy_users',
  'variables.yaml': '_ivy_variables',
  'webservice-clients.yaml': '_ivy_webservices',
  '.ivyproject': '_ivy_axonivy'
} as const;
