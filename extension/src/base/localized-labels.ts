import { l10n } from 'vscode';

export const localizeProcessKind = (kind: string) => {
  switch (kind) {
    case 'Business Process':
      return l10n.t('Business Process');
    case 'Callable Sub Process':
      return l10n.t('Callable Sub Process');
    case 'Web Service Process':
      return l10n.t('Web Service Process');
    default:
      return kind;
  }
};

export const localizeDataClassType = (type: string) => {
  switch (type) {
    case 'Data Class':
      return l10n.t('Data Class');
    case 'Entity Class':
      return l10n.t('Entity Class');
    default:
      return type;
  }
};

export const localizeDialogType = (type: string) => {
  switch (type) {
    case 'JSF':
      return l10n.t('JSF');
    case 'Form':
      return l10n.t('Form');
    case 'JSFOffline':
      return l10n.t('JSFOffline');
    default:
      return type;
  }
};

export const localizeDialogLayout = (layout: string) => {
  switch (layout) {
    case 'Page Responsive Grid 2 Columns':
      return l10n.t('Page Responsive Grid 2 Columns');
    case 'Page Responsive Grid 4 Columns':
      return l10n.t('Page Responsive Grid 4 Columns');
    case 'Page Responsive Top Labels':
      return l10n.t('Page Responsive Top Labels');
    case 'Page Panel Grid':
      return l10n.t('Page Panel Grid');
    case 'Component':
      return l10n.t('Component');
    case 'Page':
      return l10n.t('Page');
    default:
      return layout;
  }
};
