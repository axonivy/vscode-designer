import { l10n, window, type Disposable } from 'vscode';
import { State, type LanguageClient } from 'vscode-languageclient/node';
import { NotificationType } from 'vscode-languageserver-protocol';
import { newMarkdownString, StatusBar } from '../base/status-bar';

type ValidationEvent = { runId: string } & (
  | { phase: 'STARTED' }
  | { phase: 'WARNING'; message: string }
  | { phase: 'FINISHED'; durationMs: number }
  | { phase: 'FAILED'; durationMs: number; message: string }
);
const validationNotification = new NotificationType<ValidationEvent>('ivy/workspaceValidation');
type Validator = 'Ivy' | 'XHTML';
const validationLogPrefix = (runId: string, validator: Validator) => `[${runId}] ${validator} Workspace validation`;

export class WorkspaceValidation {
  readonly outputChannel = window.createOutputChannel(l10n.t('Axon Ivy Validation'), { log: true });
  private readonly subscriptions: Disposable[] = [];
  private readonly active = new Map<string, Validator>();
  private failed = false;

  watch(validator: Validator, client: Pick<LanguageClient, 'onNotification' | 'onDidChangeState'>) {
    this.subscriptions.push(
      client.onNotification(validationNotification, event => this.onValidationEvent(validator, event)),
      client.onDidChangeState(({ oldState, newState }) => {
        if (oldState === State.Running && newState !== State.Running) {
          this.onDisconnect(validator);
        }
      })
    );
  }

  private onValidationEvent(validator: Validator, event: ValidationEvent) {
    const prefix = validationLogPrefix(event.runId, validator);
    switch (event.phase) {
      case 'STARTED':
        if (!this.active.size) {
          this.failed = false;
          const text = l10n.t('Validating workspace...');
          StatusBar.overrideStatusBar({ text, tooltip: newMarkdownString(text), icon: '$(loading~spin)' });
        }
        this.active.set(event.runId, validator);
        this.outputChannel.info(`${prefix} started.`);
        return;
      case 'WARNING':
        this.outputChannel.warn(`${prefix}: ${event.message}`);
        return;
      case 'FINISHED':
        this.active.delete(event.runId);
        this.outputChannel.info(`${prefix} finished in ${event.durationMs} ms.`);
        break;
      case 'FAILED':
        this.active.delete(event.runId);
        this.failed = true;
        this.outputChannel.error(`${prefix} failed after ${event.durationMs} ms: ${event.message}`);
        break;
    }
    this.finishIfIdle();
  }

  private onDisconnect(validator: Validator) {
    let interrupted = false;
    for (const [runId, source] of this.active) {
      if (source !== validator) {
        continue;
      }
      this.active.delete(runId);
      this.outputChannel.warn(`${validationLogPrefix(runId, validator)} interrupted: language server disconnected.`);
      interrupted = true;
    }
    if (interrupted) {
      this.failed = true;
      this.finishIfIdle();
    }
  }

  private finishIfIdle() {
    if (this.active.size) {
      return;
    }
    if (!this.failed) {
      StatusBar.showTemporarySuccess(l10n.t('Validation successful'));
      return;
    }
    StatusBar.refreshStatusBar();
    const openOutput = l10n.t('Open Validation Output');
    void window.showErrorMessage(l10n.t('Workspace validation did not complete'), openOutput).then(selection => {
      if (selection === openOutput) {
        this.outputChannel.show();
      }
    });
  }

  dispose() {
    this.subscriptions.forEach(subscription => subscription.dispose());
    this.outputChannel.dispose();
  }
}
