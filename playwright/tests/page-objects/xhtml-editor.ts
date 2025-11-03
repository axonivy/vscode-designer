import { type Locator, type Page } from '@playwright/test';
import { Editor } from './editor';

export class XhtmlEditor extends Editor {
  readonly complitions: Locator;
  
  constructor(page: Page, editorFile = 'testXhtml.xhtml') {
    super(editorFile, page);
    this.complitions = page.locator('.suggest-widget');
  }
}
