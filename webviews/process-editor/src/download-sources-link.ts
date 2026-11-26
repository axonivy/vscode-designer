// Keep in sync with extension/src/editors/process-editor/java-completion-documentation.ts.
const DOWNLOAD_SOURCES_LINK = 'https://axonivy.invalid/download-dependency-sources';

export const setupDownloadSourcesLink = (downloadSources: () => void) => {
  document.addEventListener(
    'click',
    event => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const link = event.target.closest('a');
      // Monaco clears href and uses data-href; ordinary Markdown renderers use href.
      const href = link?.getAttribute('data-href') ?? link?.getAttribute('href');
      if (href !== DOWNLOAD_SOURCES_LINK) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      downloadSources();
    },
    true
  );
};
