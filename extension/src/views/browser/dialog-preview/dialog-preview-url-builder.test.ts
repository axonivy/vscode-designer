import { expect, test } from 'vitest';
import { buildDialogPreviewUrl } from './dialog-preview-url-builder';

test('builds preview url from dev workflow ui context path', () => {
  expect(
    buildDialogPreviewUrl(
      '/~Developer-prebuiltproject/dev-workflow-ui',
      'Developer-prebuiltproject',
      'prebuiltProject',
      'ch.form.test.testForm'
    )
  ).toBe(
    '/~Developer-prebuiltproject/dev-workflow-ui/faces/frame.xhtml?taskUrl=%2F~Developer-prebuiltproject%2FDeveloper-prebuiltproject%2F1%2Fpreview%2FprebuiltProject%2Fch.form.test.testForm'
  );
});

test('builds preview url from base developer context path', () => {
  expect(
    buildDialogPreviewUrl('/~Developer-prebuiltproject', 'Developer-prebuiltproject', 'prebuiltProject', 'ch.xhtml.test.testXhtml')
  ).toBe(
    '/~Developer-prebuiltproject/dev-workflow-ui/faces/frame.xhtml?taskUrl=%2F~Developer-prebuiltproject%2FDeveloper-prebuiltproject%2F1%2Fpreview%2FprebuiltProject%2Fch.xhtml.test.testXhtml'
  );
});

test('normalizes absolute dev workflow ui url', () => {
  expect(
    buildDialogPreviewUrl(
      'http://localhost:8080/~Developer-prebuiltproject/dev-workflow-ui',
      'Developer-prebuiltproject',
      'prebuiltProject',
      'ch.xhtml.test.testXhtml'
    )
  ).toBe(
    '/~Developer-prebuiltproject/dev-workflow-ui/faces/frame.xhtml?taskUrl=%2F~Developer-prebuiltproject%2FDeveloper-prebuiltproject%2F1%2Fpreview%2FprebuiltProject%2Fch.xhtml.test.testXhtml'
  );
});
