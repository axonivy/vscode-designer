import { type Page } from '@playwright/test';
import { Editor } from './editor';

export class XhtmlEditor extends Editor {

  constructor(page: Page, editorFile = 'testXhtml.xhtml') {
    super(editorFile, page);
  }
}
