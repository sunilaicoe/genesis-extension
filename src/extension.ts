import * as vscode from 'vscode';
import { SidebarProvider } from './panels/sidebar';
import { HomePage } from './panels/homePage';
import { SettingsPanel } from './panels/settingsPanel';
import { WorkflowPanel } from './panels/workflowPanel';
import { WorkflowDetailPanel } from './panels/workflowDetailPanel';
import { NewWorkflowModal } from './panels/newWorkflowModal';
import { DocumentPreviewPanel } from './panels/documentPreviewPanel';
import { WorkflowEditorPanel } from './panels/workflowEditorPanel';
import { ExportDialogModal } from './panels/exportDialogModal';

export function activate(context: vscode.ExtensionContext) {
    console.log('Genesis extension is now active!');

    const sidebarProvider = new SidebarProvider(context.extensionUri, {
        onOpenSettings: () => SettingsPanel.open(context.extensionUri),
        onOpenHome: () => HomePage.open(context.extensionUri),
        onOpenWorkflow: () => { WorkflowPanel.open(context.extensionUri); sidebarProvider.exitAgentMode(); },
        onOpenWorkflowDetail: (name: string) => { WorkflowDetailPanel.open(context.extensionUri, name); sidebarProvider.enterAgentMode(name); },
        onBackToWorkflows: () => { WorkflowDetailPanel.close(); sidebarProvider.exitAgentMode(); WorkflowPanel.open(context.extensionUri); },
        onNewProject: () => NewWorkflowModal.open(context.extensionUri),
    });

    // Wire HomePage callbacks
    HomePage.setOnOpenSettings(() => SettingsPanel.open(context.extensionUri));

    // Wire WorkflowPanel callbacks
    WorkflowPanel.setOpenDetail((name: string) => { WorkflowDetailPanel.open(context.extensionUri, name); sidebarProvider.enterAgentMode(name); });
    WorkflowPanel.setNewWorkflow(() => NewWorkflowModal.open(context.extensionUri));

    // Wire WorkflowDetailPanel callbacks
    WorkflowDetailPanel.setOnBack(() => { sidebarProvider.exitAgentMode(); WorkflowPanel.open(context.extensionUri); });
    WorkflowDetailPanel.setOnViewDocument((wfName, docName) => { DocumentPreviewPanel.open(context.extensionUri, wfName, docName); });
    WorkflowDetailPanel.setOnOpenEditor((name) => { WorkflowEditorPanel.open(context.extensionUri, name); });
    WorkflowDetailPanel.setOnExport((name) => { ExportDialogModal.open(context.extensionUri, name); });
    WorkflowDetailPanel.setOnNewProject(() => NewWorkflowModal.open(context.extensionUri));

    // Wire NewWorkflowModal callbacks
    NewWorkflowModal.setOnCreate((name) => {
        WorkflowDetailPanel.open(context.extensionUri, name);
        sidebarProvider.enterAgentMode(name);
    });

    // Wire WorkflowEditorPanel callbacks
    WorkflowEditorPanel.setOnViewDocument((wfName, docName) => { DocumentPreviewPanel.open(context.extensionUri, wfName, docName); });
    WorkflowEditorPanel.setOnExport((name) => { ExportDialogModal.open(context.extensionUri, name); });

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('helloWorldSidebarView', sidebarProvider)
    );
}

export function deactivate() {}
