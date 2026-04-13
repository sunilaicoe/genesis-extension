import * as vscode from 'vscode';
import { WorkflowService } from './services/workflowService';
import { SidebarProvider } from './panels/sidebar';
import { HomePage } from './panels/homePage';
import { SettingsPanel } from './panels/settingsPanel';
import { WorkflowPanel } from './panels/workflowPanel';
import { WorkflowDetailPanel } from './panels/workflowDetailPanel';
import { NewWorkflowModal } from './panels/newWorkflowModal';
import { DocumentPreviewPanel } from './panels/documentPreviewPanel';
import { WorkflowEditorPanel } from './panels/workflowEditorPanel';
import { ExportDialogModal } from './panels/exportDialogModal';

let workflowService: WorkflowService;

export function activate(context: vscode.ExtensionContext) {
    workflowService = new WorkflowService(context.secrets);

    // Initialize: load API key & fetch data
    workflowService.loadApiKey(context.secrets).then(async (connected) => {
        if (connected) {
            await Promise.all([
                workflowService.fetchUser(),
                workflowService.fetchWorkflows(),
            ]);
        }
    });

    // Register status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'genesis.showSettings';
    context.subscriptions.push(statusBarItem);

    workflowService.events.event(({ type, data }) => {
        if (type === 'connection-changed') {
            if (data?.connected) {
                statusBarItem.text = '$(check) Genesis Connected';
                statusBarItem.tooltip = 'Connected to Genesis Cloud';
                statusBarItem.backgroundColor = undefined;
            } else {
                statusBarItem.text = '$(warning) Genesis Disconnected';
                statusBarItem.tooltip = data?.error || 'No API key configured';
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            }
            statusBarItem.show();
        }
    });

    // Initial status bar state
    if (workflowService.isAuthenticated()) {
        statusBarItem.text = '$(sync~spin) Genesis Loading...';
        statusBarItem.show();
    } else {
        statusBarItem.text = '$(warning) Genesis: Set API Key';
        statusBarItem.tooltip = 'Click to configure API key';
        statusBarItem.show();
    }

    const sidebarProvider = new SidebarProvider(context.extensionUri, workflowService, {
        onOpenSettings: () => SettingsPanel.open(context.extensionUri, workflowService, context),
        onOpenHome: () => HomePage.open(context.extensionUri, workflowService),
        onOpenWorkflow: () => {
            WorkflowPanel.open(context.extensionUri, workflowService);
            sidebarProvider.exitAgentMode();
        },
        onOpenWorkflowDetail: (workflowId: string, name: string) => {
            WorkflowDetailPanel.open(context.extensionUri, workflowService, workflowId, name);
            sidebarProvider.enterAgentMode(name, workflowId);
        },
        onBackToWorkflows: () => {
            WorkflowDetailPanel.close();
            sidebarProvider.exitAgentMode();
            WorkflowPanel.open(context.extensionUri, workflowService);
        },
        onNewProject: () => NewWorkflowModal.open(context.extensionUri, workflowService),
    });

    // Wire HomePage callbacks
    HomePage.setOnOpenSettings(() => SettingsPanel.open(context.extensionUri, workflowService, context));

    // Wire WorkflowPanel callbacks
    WorkflowPanel.setOpenDetail((workflowId: string, name: string) => {
        WorkflowDetailPanel.open(context.extensionUri, workflowService, workflowId, name);
        sidebarProvider.enterAgentMode(name, workflowId);
    });
    WorkflowPanel.setNewWorkflow(() => NewWorkflowModal.open(context.extensionUri, workflowService));

    // Wire WorkflowDetailPanel callbacks
    WorkflowDetailPanel.setOnBack(() => {
        sidebarProvider.exitAgentMode();
        WorkflowPanel.open(context.extensionUri, workflowService);
    });
    WorkflowDetailPanel.setOnViewDocument((wfName, wfId, docType) => {
        DocumentPreviewPanel.open(context.extensionUri, workflowService, wfId, wfName, docType);
    });
    WorkflowDetailPanel.setOnOpenEditor((wfId, wfName) => {
        WorkflowEditorPanel.open(context.extensionUri, workflowService, wfId, wfName);
    });
    WorkflowDetailPanel.setOnExport((wfId, wfName) => {
        ExportDialogModal.open(context.extensionUri, workflowService, wfId, wfName);
    });
    WorkflowDetailPanel.setOnNewProject(() => NewWorkflowModal.open(context.extensionUri, workflowService));

    // Wire NewWorkflowModal callbacks
    NewWorkflowModal.setOnCreate((workflowId: string, name: string) => {
        WorkflowDetailPanel.open(context.extensionUri, workflowService, workflowId, name);
        sidebarProvider.enterAgentMode(name, workflowId);
    });

    // Wire WorkflowEditorPanel callbacks
    WorkflowEditorPanel.setOnViewDocument((wfName, wfId, docType) => {
        DocumentPreviewPanel.open(context.extensionUri, workflowService, wfId, wfName, docType);
    });
    WorkflowEditorPanel.setOnExport((wfId, wfName) => {
        ExportDialogModal.open(context.extensionUri, workflowService, wfId, wfName);
    });

    // Register sidebar provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('helloWorldSidebarView', sidebarProvider)
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('genesis.showSettings', () => {
            SettingsPanel.open(context.extensionUri, workflowService, context);
        }),
        vscode.commands.registerCommand('genesis.showHome', () => {
            HomePage.open(context.extensionUri, workflowService);
        }),
        vscode.commands.registerCommand('genesis.showWorkflows', () => {
            WorkflowPanel.open(context.extensionUri, workflowService);
        }),
        vscode.commands.registerCommand('genesis.newWorkflow', () => {
            NewWorkflowModal.open(context.extensionUri, workflowService);
        }),
    );
}

export function deactivate() {
    if (workflowService) {
        workflowService.dispose();
    }
}
