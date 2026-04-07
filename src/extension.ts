import * as vscode from 'vscode';

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
    WorkflowPanel.setOpenDetail((name: string) => { WorkflowDetailPanel.open(context.extensionUri, name); sidebarProvider.enterAgentMode(name); });
    WorkflowDetailPanel.setOnBack(() => { sidebarProvider.exitAgentMode(); WorkflowPanel.open(context.extensionUri); });
    WorkflowPanel.setNewWorkflow(() => NewWorkflowModal.open(context.extensionUri));

    WorkflowDetailPanel.setOnViewDocument((wfName, docName) => { DocumentPreviewPanel.open(context.extensionUri, wfName, docName); });
    WorkflowDetailPanel.setOnOpenEditor((name) => { WorkflowEditorPanel.open(context.extensionUri, name); });
    WorkflowDetailPanel.setOnExport((name) => { ExportDialogModal.open(context.extensionUri, name); });
    WorkflowDetailPanel.setOnNewProject(() => NewWorkflowModal.open(context.extensionUri));

    NewWorkflowModal.setOnCreate((name) => {
        WorkflowDetailPanel.open(context.extensionUri, name);
        sidebarProvider.enterAgentMode(name);
    });

    WorkflowEditorPanel.setOnViewDocument((wfName, docName) => { DocumentPreviewPanel.open(context.extensionUri, wfName, docName); });
    WorkflowEditorPanel.setOnExport((name) => { ExportDialogModal.open(context.extensionUri, name); });

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('helloWorldSidebarView', sidebarProvider)
    );
}

// ==================== SIDEBAR ====================

interface SidebarCallbacks {
    onOpenSettings: () => void;
    onOpenHome: () => void;
    onOpenWorkflow: () => void;
    onOpenWorkflowDetail: (name: string) => void;
    onBackToWorkflows: () => void;
    onNewProject: () => void;
}

class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'helloWorldSidebarView';
    private _callbacks: SidebarCallbacks;

    constructor(private readonly _extensionUri: vscode.Uri, callbacks: SidebarCallbacks) {
        this._callbacks = callbacks;
    }

    private _webviewView: vscode.WebviewView | undefined;
    private _agentMode: boolean = false;
    private _agentWorkflowName: string = '';

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._webviewView = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        webviewView.webview.html = this._getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'home': this._callbacks.onOpenHome(); break;
                case 'workflow': this._callbacks.onOpenWorkflow(); break;
                case 'settings': this._callbacks.onOpenSettings(); break;
                case 'open-workflow': this._callbacks.onOpenWorkflowDetail(message.name); break;
                case 'back-to-workflows': this._confirmBackFromAgent(); break;
                case 'new-project': this._callbacks.onNewProject(); break;
                case 'profile': vscode.window.showInformationMessage('👤 John Doe', 'john@genesis.io · Online'); break;
                case 'run-pipeline': vscode.window.showInformationMessage('Run Pipeline', 'Pipeline execution started for active workflow.'); break;
                case 'export-all': vscode.window.showInformationMessage('Export All', 'All artifacts exported to /genesis/exports/'); break;
                case 'view-logs': vscode.window.showInformationMessage('View Logs', 'Opening terminal output panel...'); break;
                case 'help': vscode.window.showInformationMessage('Genesis Help', 'Documentation: https://genesis.ai/docs'); break;
                case 'status': vscode.window.showInformationMessage('Status', '✅ Connected to Genesis Cloud · Ollama v0.1.28 · All systems operational'); break;
            }
        });
    }

    public enterAgentMode(workflowName: string) {
        this._agentMode = true;
        this._agentWorkflowName = workflowName;
        this._updateWebview();
    }

    public exitAgentMode() {
        this._agentMode = false;
        this._agentWorkflowName = '';
        this._updateWebview();
    }

    private _confirmBackFromAgent() {
        vscode.window.showWarningMessage('Are you sure you want to go back to the Workflows list? Unsaved agent conversation will be lost.', { modal: true }, 'Yes', 'No').then(selection => {
            if (selection === 'Yes') {
                this._callbacks.onBackToWorkflows();
            }
        });
    }

    private _updateWebview() {
        if (this._webviewView) {
            this._webviewView.webview.html = this._getHtmlForWebview();
        }
    }

    private _getHtmlForWebview(): string {
        if (this._agentMode) {
            return this._getAgentSidebarHtml();
        }
        return this._getNormalSidebarHtml();
    }

    private _getNormalSidebarHtml(): string {
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Genesis Sidebar</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{background-color:#131313;color:#e5e2e1;font-family:'Inter',sans-serif;display:flex;flex-direction:column;height:100vh;overflow:hidden}
                ::-webkit-scrollbar{width:4px;height:4px}
                ::-webkit-scrollbar-track{background:transparent}
                ::-webkit-scrollbar-thumb{background:#404752;border-radius:10px}
                ::-webkit-scrollbar-thumb:hover{background:#505866}
                .sidebar{display:flex;flex-direction:column;height:100%;background-color:#1B1B1C;font-size:.75rem;letter-spacing:tight}
                .sidebar-header{padding:24px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(64,71,82,.1)}
                .header-logo{width:32px;height:32px;border-radius:8px;background:linear-gradient(180deg,#A3C9FF 0%,#0078D4 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .header-logo .material-symbols-outlined{font-size:20px;color:#131313}
                .header-text h1{font-family:'Space Grotesk',sans-serif;font-size:1.125rem;font-weight:700;letter-spacing:-.02em;color:#A3C9FF;line-height:1}
                .header-text p{font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:#C0C7D4;opacity:.6;margin-top:2px}
                .cta-section{padding:20px 20px}
                .cta-button{width:100%;padding:10px 0;background-color:#0078D4;color:#fff;font-family:'Inter',sans-serif;font-size:.75rem;font-weight:500;border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s ease}
                .cta-button:hover{filter:brightness(1.15)}
                .cta-button:active{transform:scale(.97)}
                .cta-button .material-symbols-outlined{font-size:18px}
                .nav-section{flex:1;overflow-y:auto;padding:0 8px}
                .nav-group{margin-bottom:16px}
                .nav-item{display:flex;align-items:center;gap:12px;padding:8px 16px;color:#9ca3af;opacity:.7;cursor:pointer;transition:all .15s ease;position:relative;border:none;background:none;width:100%;text-align:left;font-family:'Inter',sans-serif;font-size:.75rem}
                .nav-item::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:2px;height:0;background-color:#A3C9FF;border-radius:9999px;transition:height .15s ease}
                .nav-item:hover{background-color:#353535;color:#fff;opacity:1}
                .nav-item.active{color:#A3C9FF;opacity:1}
                .nav-item.active::before{height:16px}
                .nav-item:active{transform:scale(.97)}
                .nav-item .material-symbols-outlined{font-size:20px}
                .section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#C0C7D4;padding:16px 16px 12px 16px}
                .workflow-section{padding:16px 16px 12px;border-top:1px solid rgba(64,71,82,.1);margin:0 8px}
                .workflow-item{cursor:pointer;padding:8px 0;transition:all .15s ease}
                .workflow-item:hover .wf-name{color:#A3C9FF}
                .wf-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
                .wf-name{font-size:.75rem;font-weight:500;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .15s ease}
                .wf-status-running{width:8px;height:8px;border-radius:50%;background-color:#61dac1;box-shadow:0 0 8px rgba(97,218,193,.5);flex-shrink:0}
                .wf-status-completed{display:flex;align-items:center;justify-content:center;width:14px;height:14px;flex-shrink:0}
                .wf-status-completed .material-symbols-outlined{font-size:14px;color:#777677}
                .wf-status-pending{width:8px;height:8px;border-radius:50%;border:1px solid rgba(192,199,212,.4);flex-shrink:0}
                .wf-bottom{display:flex;align-items:center;justify-content:space-between;font-size:10px;color:rgba(192,199,212,.6)}
                .actions-section{padding:16px;border-top:1px solid rgba(64,71,82,.1);margin:0 8px}
                .action-button{display:flex;align-items:center;gap:12px;padding:8px 12px;background-color:rgba(53,53,53,.3);border:none;border-radius:4px;color:#C0C7D4;font-family:'Inter',sans-serif;font-size:11px;cursor:pointer;transition:all .15s ease;width:100%;margin-bottom:8px}
                .action-button:last-child{margin-bottom:0}
                .action-button:hover{color:#fff;background-color:#353535}
                .action-button .material-symbols-outlined{font-size:16px}
                .sidebar-footer{padding:12px 16px;border-top:1px solid rgba(64,71,82,.1);margin:0 8px;display:flex;flex-direction:column;gap:4px}
                .user-profile{display:flex;align-items:center;gap:12px;padding:8px;border-radius:4px;cursor:pointer;transition:all .15s ease}
                .user-profile:hover{background-color:#353535}
                .avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(180deg,#A3C9FF 0%,#0078D4 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative}
                .avatar .material-symbols-outlined{font-size:18px;color:#131313}
                .status-dot{position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;background-color:#61dac1;border-radius:50%;border:2px solid #1B1B1C;box-shadow:0 0 6px rgba(97,218,193,.5)}
                .user-info{display:flex;flex-direction:column;flex:1;min-width:0}
                .user-name{font-size:.75rem;font-weight:500;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .user-email{font-size:10px;color:#C0C7D4;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .footer-tabs{display:flex;align-items:center;justify-content:space-around;padding-top:8px}
                .footer-tab{display:flex;flex-direction:column;align-items:center;gap:4px;color:#9ca3af;opacity:.7;cursor:pointer;transition:all .15s ease;background:none;border:none;font-family:'Inter',sans-serif;padding:4px}
                .footer-tab:hover{color:#fff;opacity:1}
                .footer-tab .material-symbols-outlined{font-size:20px}
                .footer-tab span{font-size:9px}
            </style>
        </head>
        <body>
            <div class="sidebar">
                <div class="sidebar-header">
                    <div class="header-logo"><span class="material-symbols-outlined">hexagon</span></div>
                    <div class="header-text"><h1>Genesis</h1><p>AI SDLC Architect</p></div>
                </div>
                <div class="cta-section">
                    <button class="cta-button" onclick="handleClick('new-project')"><span class="material-symbols-outlined">add</span>New Project</button>
                </div>
                <div class="nav-section">
                    <div class="nav-group">
                        <button class="nav-item active" onclick="handleClickNav('home',this)"><span class="material-symbols-outlined">home</span><span>Home</span></button>
                        <button class="nav-item" onclick="handleClickNav('workflow',this)"><span class="material-symbols-outlined">account_tree</span><span>My Workflows</span></button>
                        <button class="nav-item" onclick="handleClickNav('settings',this)"><span class="material-symbols-outlined">settings</span><span>Settings</span></button>
                    </div>
                    <div class="workflow-section">
                        <div class="section-label">Workflows</div>
                        <div class="workflow-item" onclick="handleClickWF('open-workflow','E-Commerce Re-platform')">
                            <div class="wf-top"><span class="wf-name">E-Commerce Re-platform</span><div class="wf-status-running"></div></div>
                            <div class="wf-bottom"><span>Status: Running</span><span>2h ago</span></div>
                        </div>
                        <div class="workflow-item" onclick="handleClickWF('open-workflow','FinTech Wallet API')">
                            <div class="wf-top"><span class="wf-name">FinTech Wallet API</span><div class="wf-status-completed"><span class="material-symbols-outlined">check_circle</span></div></div>
                            <div class="wf-bottom"><span>Status: Completed</span><span>Yesterday</span></div>
                        </div>
                        <div class="workflow-item" onclick="handleClickWF('open-workflow','Patient Portal v2')">
                            <div class="wf-top"><span class="wf-name">Patient Portal v2</span><div class="wf-status-pending"></div></div>
                            <div class="wf-bottom"><span>Status: Pending</span><span>3 days ago</span></div>
                        </div>
                    </div>
                    <div class="actions-section">
                        <div class="section-label">Quick Actions</div>
                        <button class="action-button" onclick="handleClick('run-pipeline')"><span class="material-symbols-outlined">play_arrow</span>Run Pipeline</button>
                        <button class="action-button" onclick="handleClick('export-all')"><span class="material-symbols-outlined">ios_share</span>Export All</button>
                        <button class="action-button" onclick="handleClick('view-logs')"><span class="material-symbols-outlined">terminal</span>View Logs</button>
                    </div>
                </div>
                <div class="sidebar-footer">
                    <div class="user-profile" onclick="handleClick('profile')">
                        <div class="avatar"><span class="material-symbols-outlined">person</span><div class="status-dot"></div></div>
                        <div class="user-info"><span class="user-name">John Doe</span><span class="user-email">john@genesis.io</span></div>
                    </div>
                    <div class="footer-tabs">
                        <button class="footer-tab" onclick="handleClick('help')"><span class="material-symbols-outlined">help</span><span>Help</span></button>
                        <button class="footer-tab" onclick="handleClick('status')"><span class="material-symbols-outlined">sync_alt</span><span>Status</span></button>
                    </div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleClick(command){
                    vscode.postMessage({command:command});
                }
                function handleClickNav(command,element){
                    vscode.postMessage({command:command});
                    document.querySelectorAll('.nav-item').forEach(function(i){i.classList.remove('active')});
                    element.classList.add('active');
                }
                function handleClickWF(command,name){
                    vscode.postMessage({command:command,name:name});
                }
                function handleClickBack(command){
                    vscode.postMessage({command:command});
                }
            </script>
        </body>
        </html>`;
    }

    private _getAgentSidebarHtml(): string {
        const wfName = this._agentWorkflowName;
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Genesis Agent</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{background-color:#131313;color:#e5e2e1;font-family:'Inter',sans-serif;display:flex;flex-direction:column;height:100%;overflow:hidden;position:absolute;inset:0}
                ::-webkit-scrollbar{width:4px;height:4px}
                ::-webkit-scrollbar-track{background:transparent}
                ::-webkit-scrollbar-thumb{background:#404752;border-radius:10px}
                ::-webkit-scrollbar-thumb:hover{background:#505866}
                .agent{display:flex;flex-direction:column;height:100%;min-height:0;background-color:#1B1B1C}

                /* AGENT HEADER */
                .agent-header{padding:16px 16px 12px;display:flex;flex-direction:column;gap:10px}
                .back-row{display:flex;align-items:center;gap:8px}
                .back-btn{display:flex;align-items:center;gap:6px;padding:6px 12px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .back-btn:hover{background:#353535;color:#e5e2e1}
                .back-btn .material-symbols-outlined{font-size:16px}
                .agent-title{display:flex;align-items:center;gap:10px}
                .agent-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#A3C9FF,#0078D4);display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .agent-avatar .material-symbols-outlined{font-size:18px;color:#131313}
                .agent-title-text h2{font-family:'Space Grotesk',sans-serif;font-size:.8125rem;font-weight:700;color:#e5e2e1;line-height:1.2}
                .agent-title-text p{font-size:.5625rem;color:#8a919e}
                .agent-wf-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;background:rgba(97,218,193,.08);border:1px solid rgba(97,218,193,.15);border-radius:9999px;margin-left:auto}
                .agent-wf-badge .awb-dot{width:6px;height:6px;border-radius:50%;background:#61dac1;animation:blink 2s infinite}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                .agent-wf-badge span{font-size:.5625rem;color:#61dac1;font-weight:600}

                /* CONVERSATION */
                .convo{flex:1;overflow-y:auto;padding:0 16px 16px;display:flex;flex-direction:column;gap:14px}
                .msg{display:flex;gap:10px}
                .msg-avatar{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
                .msg-avatar.ma-agent{background:linear-gradient(135deg,#A3C9FF,#0078D4)}
                .msg-avatar.ma-user{background:#353535}
                .msg-avatar .material-symbols-outlined{font-size:14px;color:#131313}
                .msg-avatar.ma-user .material-symbols-outlined{color:#C0C7D4}
                .msg-bubble{background:#202020;border-radius:0 10px 10px 10px;padding:12px 14px;max-width:calc(100% - 36px);font-size:.75rem;line-height:1.6;color:#C0C7D4}
                .msg-bubble strong{color:#e5e2e1;font-weight:600}
                .msg-bubble code{font-family:'Fira Code',monospace;font-size:.6875rem;background:#0E0E0E;padding:1px 5px;border-radius:3px;color:#A3C9FF}
                .msg-bubble.mb-user{background:rgba(163,201,255,.08);border-radius:10px 0 10px 10px;border:1px solid rgba(163,201,255,.1);margin-left:auto}
                .msg-time{font-size:.5rem;color:#8a919e;margin-top:4px;padding-left:36px}
                .msg-time.right{text-align:right;padding-left:0;padding-right:0}

                /* INPUT AREA */
                .input-area{padding:12px 16px;border-top:1px solid rgba(64,71,82,.1)}
                .input-box{display:flex;align-items:center;gap:8px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:8px;padding:10px 12px;transition:border-color .15s ease}
                .input-box:focus-within{border-color:rgba(163,201,255,.3)}
                .input-box input{flex:1;background:transparent;border:none;outline:none;color:#e5e2e1;font-size:.75rem;font-family:'Inter',sans-serif}
                .input-box input::placeholder{color:#8a919e}
                .input-box .send-btn{width:28px;height:28px;border-radius:6px;background:linear-gradient(180deg,#A3C9FF,#0078D4);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .15s ease;flex-shrink:0}
                .input-box .send-btn:hover{opacity:.85}
                .input-box .send-btn .material-symbols-outlined{font-size:16px;color:#fff}
                .input-hint{text-align:center;padding-top:6px;font-size:.5rem;color:#8a919e}
            </style>
        </head>
        <body>
            <div class="agent">
                <div class="agent-header">
                    <div class="back-row">
                        <button class="back-btn" onclick="handleClick('back-to-workflows')">
                            <span class="material-symbols-outlined">arrow_back</span>
                            Back to Workflows
                        </button>
                        <div class="agent-wf-badge"><div class="awb-dot"></div><span>Active</span></div>
                    </div>
                    <div class="agent-title">
                        <div class="agent-avatar"><span class="material-symbols-outlined">smart_toy</span></div>
                        <div class="agent-title-text">
                            <h2>Genesis Agent</h2>
                            <p>Working on ${wfName}</p>
                        </div>
                    </div>
                </div>

                <div class="convo">
                    <!-- Agent greeting -->
                    <div class="msg">
                        <div class="msg-avatar ma-agent"><span class="material-symbols-outlined">smart_toy</span></div>
                        <div>
                            <div class="msg-bubble">
                                Welcome to <strong>${wfName}</strong> workflow! 🚀<br><br>
                                I'm your Genesis AI agent. I'll help you orchestrate the SDLC pipeline, generate documentation, and manage the entire lifecycle.<br><br>
                                The pipeline is currently <strong>running</strong> — Phase 02 (Architectural Planning) is active at <code>78%</code> completion.<br><br>
                                What would you like to do?
                            </div>
                            <div class="msg-time">2 min ago</div>
                        </div>
                    </div>

                    <!-- User message 1 -->
                    <div class="msg">
                        <div class="msg-bubble mb-user">Show me the current pipeline status</div>
                        <div class="msg-time right">2 min ago</div>
                    </div>

                    <!-- Agent reply 1 -->
                    <div class="msg">
                        <div class="msg-avatar ma-agent"><span class="material-symbols-outlined">smart_toy</span></div>
                        <div>
                            <div class="msg-bubble">
                                Here's the current status for <strong>${wfName}</strong>:<br><br>
                                ✅ <strong>Phase 01</strong> — Strategic Foundation <code>100%</code><br>
                                🔄 <strong>Phase 02</strong> — Architectural Planning <code>78%</code><br>
                                ⏳ <strong>Phase 03</strong> — Technical Implementation <code>Queued</code><br>
                                ⏸ <strong>Phase 04</strong> — Design & Delivery <code>Pending</code><br><br>
                                Overall progress: <code>45%</code> · ETA: <code>~4 min</code>
                            </div>
                            <div class="msg-time">2 min ago</div>
                        </div>
                    </div>

                    <!-- User message 2 -->
                    <div class="msg">
                        <div class="msg-bubble mb-user">What documents have been generated so far?</div>
                        <div class="msg-time right">1 min ago</div>
                    </div>

                    <!-- Agent reply 2 -->
                    <div class="msg">
                        <div class="msg-avatar ma-agent"><span class="material-symbols-outlined">smart_toy</span></div>
                        <div>
                            <div class="msg-bubble">
                                Here are the completed and in-progress documents:<br><br>
                                ✅ <strong>Vision & Strategy</strong> — Strategic alignment & business goals<br>
                                ✅ <strong>User Personas</strong> — 4 core archetypes defined<br>
                                ✅ <strong>Product Roadmap</strong> — 6-month delivery timeline<br>
                                ✅ <strong>GTM Strategy</strong> — Market positioning & channels<br>
                                🔄 <strong>Strategic Use Cases</strong> — Currently generating...<br>
                                🔄 <strong>UI Flows & Navigation</strong> — Currently generating...<br><br>
                                <code>4/20</code> documents complete · <code>2</code> in progress
                            </div>
                            <div class="msg-time">1 min ago</div>
                        </div>
                    </div>

                    <!-- User message 3 -->
                    <div class="msg">
                        <div class="msg-bubble mb-user">Can you prioritize the security specification? We need compliance docs first.</div>
                        <div class="msg-time right">45s ago</div>
                    </div>

                    <!-- Agent reply 3 -->
                    <div class="msg">
                        <div class="msg-avatar ma-agent"><span class="material-symbols-outlined">smart_toy</span></div>
                        <div>
                            <div class="msg-bubble">
                                Good call! I've reordered the pipeline to prioritize security-related artifacts:<br><br>
                                <strong>New execution order:</strong><br>
                                1. <code>Security Specification</code> — moved to next<br>
                                2. <code>Functional Requirements</code> — queued<br>
                                3. <code>Testing Strategy</code> — after functional specs<br><br>
                                This ensures HIPAA/PCI-DSS compliance constraints are captured before technical implementation begins.r><br>
                                ⚡ Priority updated. Security Spec will start in <code>~30s</code>.
                            </div>
                            <div class="msg-time">40s ago</div>
                        </div>
                    </div>

                    <!-- User message 4 -->
                    <div class="msg">
                        <div class="msg-bubble mb-user">What AI model is being used for generation?</div>
                        <div class="msg-time right">20s ago</div>
                    </div>

                    <!-- Agent reply 4 -->
                    <div class="msg">
                        <div class="msg-avatar ma-agent"><span class="material-symbols-outlined">smart_toy</span></div>
                        <div>
                            <div class="msg-bubble">
                                Currently using <strong>Codellama 13B</strong> via local Ollama instance for all document generation.<br><br>
                                📊 <strong>Model stats:</strong><br>
                                · Tokens consumed: <code>124,502</code><br>
                                · Avg latency: <code>142ms</code><br>
                                · Region: <code>US-East-1</code><br>
                                · Temperature: <code>0.7</code><br><br>
                                You can switch models in <strong>Settings → AI Provider</strong>.
                            </div>
                            <div class="msg-time">15s ago</div>
                        </div>
                    </div>

                    <!-- User message 5 -->
                    <div class="msg">
                        <div class="msg-bubble mb-user">Export the completed documents as PDF when ready</div>
                        <div class="msg-time right">5s ago</div>
                    </div>

                    <!-- Agent reply 5 -->
                    <div class="msg">
                        <div class="msg-avatar ma-agent"><span class="material-symbols-outlined">smart_toy</span></div>
                        <div>
                            <div class="msg-bubble">
                                I'll queue a PDF export for all completed documents once the current batch finishes.<br><br>
                                📦 <strong>Export queue:</strong><br>
                                · Vision & Strategy → PDF<br>
                                · User Personas → PDF<br>
                                · Product Roadmap → PDF<br>
                                · GTM Strategy → PDF<br><br>
                                Output: <code>/Users/user/Desktop/Genesis_Exports/${wfName}/</code><br>
                                Status: <code>Waiting for pipeline checkpoint...</code>
                            </div>
                            <div class="msg-time">just now</div>
                        </div>
                    </div>
                </div>

                <div class="input-area">
                    <div class="input-box">
                        <input type="text" placeholder="Ask Genesis anything about this workflow..." id="agent-input">
                        <button class="send-btn"><span class="material-symbols-outlined">arrow_upward</span></button>
                    </div>
                    <div class="input-hint">Genesis v1.0 · Press Enter to send</div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleClick(cmd){vscode.postMessage({command:cmd})}
            </script>
        </body>
        </html>`;
    }
}

// ==================== HOME PAGE ====================

class HomePage {
    public static currentPanel: HomePage | undefined;
    private readonly _panel: vscode.WebviewPanel;

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        this._update();
        this._panel.onDidDispose(() => { HomePage.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'new-project': vscode.window.showInformationMessage('New Project clicked!'); break;
                case 'run-pipeline': vscode.window.showInformationMessage('Run Pipeline clicked!'); break;
                case 'open-project': vscode.window.showInformationMessage('Open project: ' + message.name); break;
                case 'open-settings': SettingsPanel.open(vscode.Uri.joinPath(vscode.Uri.file('/tmp'), 'ext')); break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri) {
        if (HomePage.currentPanel) { HomePage.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-home', 'Genesis Home', vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        HomePage.currentPanel = new HomePage(panel);
    }

    private _update() { this._panel.webview.html = this._getHtml(); }

    private _getHtml(): string {
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Genesis Home</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;overflow-y:auto;height:100vh;display:flex;flex-direction:column}
                ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}
                .font-hl{font-family:'Space Grotesk',sans-serif}
                .page{flex:1;display:flex;flex-direction:column;gap:12px;padding:16px 20px}

                /* ROW LAYOUTS */
                .row{display:flex;gap:12px;min-height:0}
                .row-main{flex:1;min-height:0}
                .col{display:flex;flex-direction:column;gap:12px;min-height:0;flex:1}
                .col-narrow{flex:0 0 260px}
                .col-wide{flex:0 0 340px}

                /* CARDS */
                .card{background:#1B1B1C;border-radius:8px;border:1px solid rgba(64,71,82,.08);overflow:hidden;display:flex;flex-direction:column}
                .card-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;flex-shrink:0}
                .card-head h2{font-family:'Space Grotesk',sans-serif;font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#e5e2e1}
                .card-head .material-symbols-outlined{font-size:16px;color:#8a919e;cursor:pointer;transition:color .15s ease}
                .card-head .material-symbols-outlined:hover{color:#e5e2e1}
                .card-body{flex:1;overflow-y:auto;padding:0 12px 12px;min-height:0}

                /* WELCOME STRIP */
                .welcome-strip{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#1B1B1C;border-radius:8px;border:1px solid rgba(64,71,82,.08);flex-shrink:0}
                .welcome-left{display:flex;align-items:center;gap:16px}
                .welcome-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(180deg,#A3C9FF 0%,#0078D4 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative}
                .welcome-avatar .material-symbols-outlined{font-size:18px;color:#131313}
                .welcome-avatar .w-dot{position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;background:#61dac1;border:2px solid #1B1B1C;box-shadow:0 0 6px rgba(97,218,193,.5)}
                .welcome-text h1{font-family:'Space Grotesk',sans-serif;font-size:1rem;font-weight:700;color:#e5e2e1;line-height:1.2}
                .welcome-text p{font-size:.6875rem;color:#8a919e}
                .welcome-right{display:flex;align-items:center;gap:20px}
                .welcome-clock{text-align:right}
                .welcome-clock .time{font-family:'Fira Code',monospace;font-size:.8125rem;color:#e5e2e1;font-weight:500}
                .welcome-clock .date{font-size:.5625rem;color:#8a919e;text-transform:uppercase;letter-spacing:.08em}
                .conn-badge{display:flex;align-items:center;gap:6px;padding:6px 14px;background:rgba(97,218,193,.08);border-radius:9999px;border:1px solid rgba(97,218,193,.15)}
                .conn-dot{width:6px;height:6px;border-radius:50%;background:#61dac1;animation:blink 2s infinite}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                .conn-badge span{font-size:.625rem;color:#61dac1;font-weight:600;text-transform:uppercase;letter-spacing:.05em}

                /* STATS ROW */
                .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;flex-shrink:0}
                .stat-card{background:#1B1B1C;border-radius:8px;padding:16px 18px;border:1px solid rgba(64,71,82,.08);display:flex;align-items:center;gap:14px;transition:background .15s ease;cursor:default}
                .stat-card:hover{background:#202020}
                .stat-icon{width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .stat-icon .material-symbols-outlined{font-size:18px}
                .si-blue{background:rgba(0,120,212,.15);color:#A3C9FF}
                .si-green{background:rgba(97,218,193,.12);color:#61dac1}
                .si-amber{background:rgba(251,191,36,.12);color:#fbbf24}
                .si-purple{background:rgba(168,85,247,.12);color:#a855f7}
                .stat-val{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;color:#e5e2e1;line-height:1}
                .stat-lbl{font-size:.625rem;color:#8a919e;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}

                /* PROJECT ITEM */
                .proj{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:6px;cursor:pointer;transition:background .15s ease}
                .proj:hover{background:rgba(53,53,53,.4)}
                .proj-icon{width:34px;height:34px;border-radius:6px;background:#202020;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(64,71,82,.15)}
                .proj-icon .material-symbols-outlined{font-size:16px;color:#A3C9FF}
                .proj-info{flex:1;min-width:0}
                .proj-name{font-size:.75rem;font-weight:600;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .proj-desc{font-size:.5625rem;color:#8a919e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .proj-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
                .proj-badge{font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:9999px}
                .b-run{background:rgba(97,218,193,.12);color:#61dac1}
                .b-done{background:rgba(163,201,255,.1);color:#A3C9FF}
                .b-pend{background:rgba(192,199,212,.08);color:#8a919e}
                .proj-time{font-size:.5625rem;color:#8a919e}
                .proj-arrow{color:#404752;transition:color .15s ease;font-size:14px}
                .proj:hover .proj-arrow{color:#C0C7D4}

                /* ACTIVITY */
                .act{display:flex;gap:12px;padding:8px 12px;border-radius:6px;transition:background .15s ease}
                .act:hover{background:rgba(53,53,53,.3)}
                .act-dots{display:flex;flex-direction:column;align-items:center;gap:2px;padding-top:4px;flex-shrink:0}
                .act-dot{width:7px;height:7px;border-radius:50%}
                .ad-green{background:#61dac1;box-shadow:0 0 5px rgba(97,218,193,.4)}
                .ad-blue{background:#A3C9FF;box-shadow:0 0 5px rgba(163,201,255,.4)}
                .ad-amber{background:#fbbf24;box-shadow:0 0 5px rgba(251,191,36,.4)}
                .ad-gray{background:#404752}
                .act-line{width:1px;height:16px;background:rgba(64,71,82,.2)}
                .act-info{flex:1;min-width:0}
                .act-title{font-size:.6875rem;color:#e5e2e1;line-height:1.35}
                .act-title strong{font-weight:600}
                .act-time{font-size:.5625rem;color:#8a919e;margin-top:2px}

                /* PIPELINE STEPS */
                .pipe-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:6px}
                .pipe-bar{width:4px;height:40px;border-radius:9999px;flex-shrink:0}
                .pb-green{background:#61dac1}
                .pb-blue{background:#0078D4;animation:pulse-bar 2s infinite}
                @keyframes pulse-bar{0%,100%{opacity:1}50%{opacity:.4}}
                .pb-gray{background:#353535}
                .pipe-info{flex:1;min-width:0}
                .pipe-name{font-size:.6875rem;color:#e5e2e1;font-weight:500}
                .pipe-desc{font-size:.5625rem;color:#8a919e;margin-top:1px}
                .pipe-status{font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:9999px;flex-shrink:0}
                .ps-done{background:rgba(97,218,193,.1);color:#61dac1}
                .ps-run{background:rgba(0,120,212,.12);color:#A3C9FF}
                .ps-wait{background:rgba(53,53,53,.5);color:#8a919e}

                /* RESOURCE BAR */
                .res-item{display:flex;align-items:center;gap:12px;padding:8px 0}
                .res-label{font-size:.6875rem;color:#C0C7D4;width:70px;flex-shrink:0}
                .res-bar{flex:1;height:6px;background:#0E0E0E;border-radius:9999px;overflow:hidden}
                .res-fill{height:100%;border-radius:9999px;transition:width .6s ease}
                .rf-blue{background:linear-gradient(90deg,#A3C9FF,#0078D4)}
                .rf-green{background:linear-gradient(90deg,#80f7dc,#008672)}
                .rf-amber{background:linear-gradient(90deg,#fde68a,#f59e0b)}
                .rf-purple{background:linear-gradient(90deg,#c4b5fd,#7c3aed)}
                .res-val{font-family:'Fira Code',monospace;font-size:.625rem;color:#C0C7D4;width:40px;text-align:right;flex-shrink:0}

                /* DOCUMENT ROW */
                .doc{display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:6px;cursor:pointer;transition:background .15s ease}
                .doc:hover{background:rgba(53,53,53,.3)}
                .doc-icon .material-symbols-outlined{font-size:16px;color:#8a919e}
                .doc-info{flex:1;min-width:0}
                .doc-name{font-size:.6875rem;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .doc-meta{font-size:.5625rem;color:#8a919e}
                .doc-status{width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .doc-status .material-symbols-outlined{font-size:14px}
                .ds-done{color:#61dac1}
                .ds-run{color:#A3C9FF}
                .ds-lock{color:#404752}

                /* QUICK ACTIONS */
                .qa-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
                .qa{background:#1B1B1C;border-radius:8px;padding:16px 12px;border:1px solid rgba(64,71,82,.08);cursor:pointer;transition:all .15s ease;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
                .qa:hover{background:#202020;border-color:rgba(64,71,82,.2);transform:translateY(-1px)}
                .qa:active{transform:scale(.98)}
                .qa-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center}
                .qa-icon .material-symbols-outlined{font-size:18px}
                .qi-primary{background:linear-gradient(135deg,rgba(163,201,255,.15),rgba(0,120,212,.15));color:#A3C9FF}
                .qi-secondary{background:rgba(53,53,53,.4);color:#C0C7D4}
                .qi-tertiary{background:rgba(97,218,193,.1);color:#61dac1}
                .qi-amber{background:rgba(251,191,36,.1);color:#fbbf24}
                .qa-label{font-size:.6875rem;font-weight:600;color:#e5e2e1}
                .qa-desc{font-size:.5625rem;color:#8a919e;line-height:1.4}

                /* LOG LINE */
                .log{display:flex;align-items:center;gap:10px;padding:6px 12px;font-family:'Fira Code',monospace;font-size:.5625rem;border-radius:4px}
                .log:hover{background:rgba(53,53,53,.2)}
                .log-ts{color:#8a919e;flex-shrink:0;width:62px}
                .log-tag{padding:1px 6px;border-radius:3px;font-weight:700;text-transform:uppercase;flex-shrink:0;width:56px;text-align:center}
                .lt-ok{background:rgba(97,218,193,.1);color:#61dac1}
                .lt-info{background:rgba(163,201,255,.08);color:#A3C9FF}
                .lt-warn{background:rgba(251,191,36,.1);color:#fbbf24}
                .log-msg{color:#C0C7D4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            </style>
        </head>
        <body>
            <div class="page">
                <!-- ROW 1: Welcome + Connection -->
                <div class="welcome-strip">
                    <div class="welcome-left">
                        <div class="welcome-avatar"><span class="material-symbols-outlined">person</span><div class="w-dot"></div></div>
                        <div class="welcome-text">
                            <h1>Welcome back, John</h1>
                            <p>Here's your Genesis workspace overview</p>
                        </div>
                    </div>
                    <div class="welcome-right">
                        <div class="welcome-clock">
                            <div class="time" id="clock-time">--:--:--</div>
                            <div class="date" id="clock-date">---</div>
                        </div>
                        <div class="conn-badge"><div class="conn-dot"></div><span>Ollama Connected</span></div>
                    </div>
                </div>

                <!-- ROW 2: Stats -->
                <div class="stats-row">
                    <div class="stat-card"><div class="stat-icon si-blue"><span class="material-symbols-outlined">folder</span></div><div><div class="stat-val">3</div><div class="stat-lbl">Active Projects</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-green"><span class="material-symbols-outlined">sync</span></div><div><div class="stat-val">1</div><div class="stat-lbl">Running Pipelines</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-amber"><span class="material-symbols-outlined">smart_toy</span></div><div><div class="stat-val">4</div><div class="stat-lbl">AI Models</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-purple"><span class="material-symbols-outlined">description</span></div><div><div class="stat-val">18</div><div class="stat-lbl">SDLC Documents</div></div></div>
                </div>

                <!-- ROW 3: Projects + Activity + Pipeline -->
                <div class="row row-main">
                    <!-- Col 1: Projects -->
                    <div class="col col-wide">
                        <div class="card" style="flex:1">
                            <div class="card-head"><h2>Recent Projects</h2><span class="material-symbols-outlined">arrow_outward</span></div>
                            <div class="card-body">
                                <div class="proj" onclick="handleAction('open-project','E-Commerce Re-platform')">
                                    <div class="proj-icon"><span class="material-symbols-outlined">shopping_cart</span></div>
                                    <div class="proj-info"><div class="proj-name">E-Commerce Re-platform</div><div class="proj-desc">Micro-frontend migration with real-time inventory</div></div>
                                    <div class="proj-right"><span class="proj-badge b-run">● Running</span><span class="proj-time">2h ago</span></div>
                                    <span class="material-symbols-outlined proj-arrow">chevron_right</span>
                                </div>
                                <div class="proj" onclick="handleAction('open-project','FinTech Wallet API')">
                                    <div class="proj-icon"><span class="material-symbols-outlined">account_balance</span></div>
                                    <div class="proj-info"><div class="proj-name">FinTech Wallet API</div><div class="proj-desc">Payment processing & ledger management</div></div>
                                    <div class="proj-right"><span class="proj-badge b-done">✓ Done</span><span class="proj-time">Yesterday</span></div>
                                    <span class="material-symbols-outlined proj-arrow">chevron_right</span>
                                </div>
                                <div class="proj" onclick="handleAction('open-project','Patient Portal v2')">
                                    <div class="proj-icon"><span class="material-symbols-outlined">local_hospital</span></div>
                                    <div class="proj-info"><div class="proj-name">Patient Portal v2</div><div class="proj-desc">HIPAA-compliant patient dashboard</div></div>
                                    <div class="proj-right"><span class="proj-badge b-pend">◎ Pending</span><span class="proj-time">3d ago</span></div>
                                    <span class="material-symbols-outlined proj-arrow">chevron_right</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Col 2: Activity -->
                    <div class="col col-narrow">
                        <div class="card" style="flex:1">
                            <div class="card-head"><h2>Activity</h2><span class="material-symbols-outlined">more_horiz</span></div>
                            <div class="card-body">
                                <div class="act"><div class="act-dots"><div class="act-dot ad-green"></div><div class="act-line"></div></div><div class="act-info"><div class="act-title"><strong>Pipeline started</strong> for E-Commerce</div><div class="act-time">2 hours ago</div></div></div>
                                <div class="act"><div class="act-dots"><div class="act-dot ad-blue"></div><div class="act-line"></div></div><div class="act-info"><div class="act-title"><strong>AI generated</strong> Architecture Doc</div><div class="act-time">3 hours ago</div></div></div>
                                <div class="act"><div class="act-dots"><div class="act-dot ad-blue"></div><div class="act-line"></div></div><div class="act-info"><div class="act-title"><strong>Exported</strong> FinTech docs to PDF</div><div class="act-time">Yesterday</div></div></div>
                                <div class="act"><div class="act-dots"><div class="act-dot ad-green"></div><div class="act-line"></div></div><div class="act-info"><div class="act-title"><strong>Completed</strong> FinTech pipeline</div><div class="act-time">Yesterday</div></div></div>
                                <div class="act"><div class="act-dots"><div class="act-dot ad-amber"></div><div class="act-line"></div></div><div class="act-info"><div class="act-title"><strong>Model updated</strong> to Codellama 13B</div><div class="act-time">2 days ago</div></div></div>
                                <div class="act"><div class="act-dots"><div class="act-dot ad-gray"></div></div><div class="act-info"><div class="act-title"><strong>Created</strong> Patient Portal v2</div><div class="act-time">3 days ago</div></div></div>
                            </div>
                        </div>
                    </div>

                    <!-- Col 3: Pipeline + Resources -->
                    <div class="col col-narrow">
                        <div class="card">
                            <div class="card-head"><h2>Live Pipeline</h2><span class="material-symbols-outlined" style="color:#61dac1">insights</span></div>
                            <div class="card-body">
                                <div class="pipe-item"><div class="pipe-bar pb-green"></div><div class="pipe-info"><div class="pipe-name">Requirement Parsing</div><div class="pipe-desc">124 nodes analyzed</div></div><span class="pipe-status ps-done">Done</span></div>
                                <div class="pipe-item"><div class="pipe-bar pb-blue"></div><div class="pipe-info"><div class="pipe-name">UML Generation</div><div class="pipe-desc">85% remaining</div></div><span class="pipe-status ps-run">Active</span></div>
                                <div class="pipe-item"><div class="pipe-bar pb-gray"></div><div class="pipe-info"><div class="pipe-name">Draft Documentation</div><div class="pipe-desc">Waiting...</div></div><span class="pipe-status ps-wait">Queued</span></div>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-head"><h2>System Resources</h2></div>
                            <div class="card-body" style="padding-top:8px">
                                <div class="res-item"><span class="res-label">CPU</span><div class="res-bar"><div class="res-fill rf-amber" style="width:72%"></div></div><span class="res-val">72%</span></div>
                                <div class="res-item"><span class="res-label">Memory</span><div class="res-bar"><div class="res-fill rf-blue" style="width:58%"></div></div><span class="res-val">58%</span></div>
                                <div class="res-item"><span class="res-label">GPU</span><div class="res-bar"><div class="res-fill rf-green" style="width:34%"></div></div><span class="res-val">34%</span></div>
                                <div class="res-item"><span class="res-label">Disk</span><div class="res-bar"><div class="res-fill rf-purple" style="width:45%"></div></div><span class="res-val">45%</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ROW 4: Quick Actions -->
                <div class="card">
                    <div class="card-head"><h2>Quick Actions</h2></div>
                    <div class="card-body" style="padding-top:4px">
                        <div class="qa-grid">
                            <div class="qa" onclick="handleAction('new-project')"><div class="qa-icon qi-primary"><span class="material-symbols-outlined">add_circle</span></div><div class="qa-label">New Project</div><div class="qa-desc">Start a new AI-powered workflow</div></div>
                            <div class="qa" onclick="handleAction('run-pipeline')"><div class="qa-icon qi-secondary"><span class="material-symbols-outlined">play_circle</span></div><div class="qa-label">Run Pipeline</div><div class="qa-desc">Execute SDLC generation</div></div>
                            <div class="qa" onclick="handleAction('export-all')"><div class="qa-icon qi-tertiary"><span class="material-symbols-outlined">ios_share</span></div><div class="qa-label">Export All</div><div class="qa-desc">Export docs & artifacts</div></div>
                            <div class="qa" onclick="handleAction('view-logs')"><div class="qa-icon qi-amber"><span class="material-symbols-outlined">terminal</span></div><div class="qa-label">View Logs</div><div class="qa-desc">Open terminal output</div></div>
                        </div>
                    </div>
                </div>

                <!-- ROW 5: Documents + Logs -->
                <div class="row row-main">
                    <!-- Recent Documents -->
                    <div class="col">
                        <div class="card" style="flex:1">
                            <div class="card-head"><h2>Recent Documents</h2><span class="material-symbols-outlined">folder_open</span></div>
                            <div class="card-body">
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">description</span></div><div class="doc-info"><div class="doc-name">Software Requirements Specification</div><div class="doc-meta">E-Commerce · Updated 2h ago</div></div><div class="doc-status"><span class="material-symbols-outlined ds-done" style="font-variation-settings:'FILL' 1">check_circle</span></div></div>
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">schema</span></div><div class="doc-info"><div class="doc-name">Architecture Design Document</div><div class="doc-meta">E-Commerce · Generating...</div></div><div class="doc-status"><span class="material-symbols-outlined ds-run">sync</span></div></div>
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">database</span></div><div class="doc-info"><div class="doc-name">Data Schema Definition</div><div class="doc-meta">FinTech · Yesterday</div></div><div class="doc-status"><span class="material-symbols-outlined ds-done" style="font-variation-settings:'FILL' 1">check_circle</span></div></div>
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">api</span></div><div class="doc-info"><div class="doc-name">API Documentation (Swagger)</div><div class="doc-meta">FinTech · Locked</div></div><div class="doc-status"><span class="material-symbols-outlined ds-lock">lock</span></div></div>
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">security</span></div><div class="doc-info"><div class="doc-name">Security Audit Trail</div><div class="doc-meta">FinTech · Locked</div></div><div class="doc-status"><span class="material-symbols-outlined ds-lock">lock</span></div></div>
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">fact_check</span></div><div class="doc-info"><div class="doc-name">Test Plan & Coverage Report</div><div class="doc-meta">FinTech · Locked</div></div><div class="doc-status"><span class="material-symbols-outlined ds-lock">lock</span></div></div>
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">rocket_launch</span></div><div class="doc-info"><div class="doc-name">Deployment Configuration</div><div class="doc-meta">FinTech · Locked</div></div><div class="doc-status"><span class="material-symbols-outlined ds-lock">lock</span></div></div>
                            </div>
                        </div>
                    </div>

                    <!-- Terminal Logs -->
                    <div class="col col-narrow">
                        <div class="card" style="flex:1">
                            <div class="card-head"><h2>Terminal Output</h2><span class="material-symbols-outlined">terminal</span></div>
                            <div class="card-body" style="background:#0E0E0E;border-radius:0 0 6px 6px;margin:0 -12px -12px;padding:8px 12px">
                                <div class="log"><span class="log-ts">14:02:44</span><span class="log-tag lt-ok">OK</span><span class="log-msg">Generated Swagger-UI definitions</span></div>
                                <div class="log"><span class="log-ts">14:02:38</span><span class="log-tag lt-ok">OK</span><span class="log-msg">Schema validation passed (0 errors)</span></div>
                                <div class="log"><span class="log-ts">14:02:31</span><span class="log-tag lt-info">INFO</span><span class="log-msg">Parsing OpenAPI spec for core v2.0.1</span></div>
                                <div class="log"><span class="log-ts">14:01:55</span><span class="log-tag lt-warn">WARN</span><span class="log-msg">Deprecated field: payment.v1.type</span></div>
                                <div class="log"><span class="log-ts">14:01:42</span><span class="log-tag lt-ok">OK</span><span class="log-msg">Connected to Genesis Cloud</span></div>
                                <div class="log"><span class="log-ts">14:01:30</span><span class="log-tag lt-info">INFO</span><span class="log-msg">Initializing Ollama model: codellama:13b</span></div>
                                <div class="log"><span class="log-ts">14:01:15</span><span class="log-tag lt-ok">OK</span><span class="log-msg">Pipeline resumed from checkpoint</span></div>
                                <div class="log"><span class="log-ts">14:00:58</span><span class="log-tag lt-info">INFO</span><span class="log-msg">Loading workspace configuration</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                const vscode=acquireVsCodeApi();
                function updateClock(){
                    const n=new Date();
                    const te=document.getElementById('clock-time');
                    const de=document.getElementById('clock-date');
                    if(te)te.textContent=n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
                    if(de)de.textContent=n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
                }
                updateClock();setInterval(updateClock,1000);
                function handleAction(c,v){vscode.postMessage(v?{command:c,name:v}:{command:c})}
            </script>
        </body>
        </html>`;
    }
}

// ==================== SETTINGS PANEL ====================

class SettingsPanel {
    public static currentPanel: SettingsPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        this._update();
        this._panel.onDidDispose(() => { SettingsPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'save-settings': vscode.window.showInformationMessage('Settings saved successfully!'); break;
                case 'reset-settings': vscode.window.showWarningMessage('Reset all settings to defaults?'); break;
                case 'test-connection': vscode.window.showInformationMessage('Testing AI Provider connection...'); break;
                case 'browse-path':
                    vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true }).then(uris => {
                        if (uris && uris.length > 0) this._panel.webview.postMessage({ command: 'update-path', value: uris[0].fsPath });
                    });
                    break;
                case 'clear-cache': vscode.window.showInformationMessage('Cache cleared!'); break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri) {
        if (SettingsPanel.currentPanel) { SettingsPanel.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-settings', 'Genesis Settings', vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        SettingsPanel.currentPanel = new SettingsPanel(panel);
    }

    private _update() { this._panel.webview.html = this._getHtml(); }

    private _getHtml(): string {
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Genesis Settings</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;overflow:hidden;height:100vh;display:flex;flex-direction:column}
                ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}
                .font-headline{font-family:'Space Grotesk',sans-serif}
                .settings-layout{display:flex;flex:1;overflow:hidden}
                .settings-nav{width:220px;background-color:#131313;border-right:1px solid rgba(64,71,82,.1);display:flex;flex-direction:column;padding:20px 0;flex-shrink:0;overflow-y:auto}
                .settings-nav-header{padding:0 24px;margin-bottom:16px}
                .settings-nav-header span{font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:#C0C7D4;font-weight:700}
                .settings-nav-group{display:flex;flex-direction:column;gap:2px}
                .settings-nav-item{display:flex;align-items:center;gap:12px;padding:10px 24px;color:#C0C7D4;cursor:pointer;transition:all .15s ease;position:relative;border:none;background:none;width:100%;text-align:left;font-family:'Inter',sans-serif;font-size:.75rem}
                .settings-nav-item::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:2px;height:0;background-color:#A3C9FF;border-radius:9999px;transition:height .15s ease}
                .settings-nav-item:hover{color:#e5e2e1;background-color:rgba(53,53,53,.3)}
                .settings-nav-item.active{color:#A3C9FF;background-color:rgba(53,53,53,.3)}
                .settings-nav-item.active::before{height:16px}
                .settings-nav-item .material-symbols-outlined{font-size:20px}
                .settings-nav-divider{margin:12px 24px;border-top:1px solid rgba(64,71,82,.1)}
                .settings-content{flex:1;overflow-y:auto;background-color:#202020;padding:48px 56px;display:flex;flex-direction:column}
                .settings-content-inner{max-width:860px;width:100%}
                .page-header{margin-bottom:48px}
                .page-header h1{font-family:'Space Grotesk',sans-serif;font-size:2rem;font-weight:700;color:#e5e2e1;letter-spacing:-.02em;margin-bottom:8px}
                .page-header p{font-size:.875rem;color:#C0C7D4}
                .settings-section{display:grid;grid-template-columns:1fr 2fr;gap:32px;padding-bottom:48px;border-bottom:1px solid rgba(64,71,82,.1);margin-bottom:48px}
                .settings-section:last-of-type{border-bottom:none;margin-bottom:0}
                .section-info h2{font-family:'Space Grotesk',sans-serif;font-size:.875rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#A3C9FF;margin-bottom:8px}
                .section-info p{font-size:.75rem;color:#C0C7D4;line-height:1.6}
                .section-fields{display:flex;flex-direction:column;gap:20px}
                .field-group{display:flex;flex-direction:column;gap:6px}
                .field-label{font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:.12em;color:#C0C7D4}
                .field-hint{font-size:.6875rem;color:#8a919e;font-style:italic}
                .field-input{width:100%;max-width:420px;background-color:#0E0E0E;border:none;color:#A3C9FF;font-family:'Fira Code',monospace;font-size:.75rem;padding:10px 14px;border-radius:4px;outline:none;transition:box-shadow .15s ease}
                .field-input:focus{box-shadow:0 0 0 1px #A3C9FF}
                .field-input-light{color:#C0C7D4}
                .field-row{display:flex;gap:8px;align-items:flex-end}
                .field-row .field-input{flex:1}
                .field-select-wrapper{position:relative;max-width:420px}
                .field-select{width:100%;background-color:#0E0E0E;border:none;color:#e5e2e1;font-family:'Inter',sans-serif;font-size:.75rem;padding:10px 36px 10px 14px;border-radius:4px;outline:none;appearance:none;cursor:pointer;transition:box-shadow .15s ease}
                .field-select:focus{box-shadow:0 0 0 1px #A3C9FF}
                .field-select-arrow{position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none}
                .field-select-arrow .material-symbols-outlined{font-size:18px;color:#C0C7D4}
                .btn{padding:10px 20px;font-family:'Inter',sans-serif;font-size:.75rem;font-weight:600;border:none;border-radius:4px;cursor:pointer;transition:all .15s ease;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap}
                .btn:active{transform:scale(.97)}
                .btn-primary{background:linear-gradient(180deg,#A3C9FF 0%,#0078D4 100%);color:#131313;box-shadow:0 4px 12px rgba(0,120,212,.3)}
                .btn-primary:hover{filter:brightness(1.1)}
                .btn-secondary{background-color:#353535;color:#C0C7D4}
                .btn-secondary:hover{background-color:#404752;color:#e5e2e1}
                .btn-danger{background-color:#93000a;color:#ffdad6}
                .btn-danger:hover{opacity:.9}
                .btn .material-symbols-outlined{font-size:16px}
                .radio-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:420px}
                .radio-card{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background-color:#1B1B1C;border:1px solid rgba(64,71,82,.2);border-radius:4px;cursor:pointer;transition:all .15s ease;position:relative}
                .radio-card:hover{background-color:#2a2a2a;border-color:rgba(64,71,82,.4)}
                .radio-card.selected{border-color:rgba(163,201,255,.4);background-color:#1B1B1C}
                .radio-card-left{display:flex;align-items:center;gap:12px}
                .radio-card-left .material-symbols-outlined{font-size:20px;color:#C0C7D4}
                .radio-card.selected .radio-card-left .material-symbols-outlined{color:#A3C9FF}
                .radio-card-text{display:flex;flex-direction:column}
                .radio-card-name{font-size:.8125rem;font-weight:500;color:#e5e2e1}
                .radio-card-sub{font-size:10px;color:#C0C7D4}
                .radio-dot{width:16px;height:16px;border-radius:50%;border:2px solid rgba(64,71,82,.5);display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .radio-dot-inner{width:8px;height:8px;border-radius:50%;background-color:#A3C9FF;display:none}
                .radio-card.selected .radio-dot{border-color:#A3C9FF}
                .radio-card.selected .radio-dot-inner{display:block}
                .provider-detail{padding:24px;background-color:#0E0E0E;border-radius:4px;border-left:2px solid rgba(163,201,255,.2);display:flex;flex-direction:column;gap:20px;max-width:420px}
                .connection-status{display:flex;align-items:center;gap:12px;padding:12px 16px;background-color:#202020;border-radius:4px;max-width:420px}
                .status-indicator{width:8px;height:8px;border-radius:50%;background-color:#61dac1;box-shadow:0 0 8px rgba(97,218,193,.5)}
                .status-text{font-size:.75rem;font-weight:500;color:#e5e2e1;flex:1}
                .status-version{font-size:.6875rem;color:#8a919e}
                .toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;cursor:pointer}
                .toggle-label{font-size:.8125rem;color:#C0C7D4;transition:color .15s ease}
                .toggle-row:hover .toggle-label{color:#e5e2e1}
                .toggle-switch{width:36px;height:20px;border-radius:9999px;background-color:#353535;position:relative;cursor:pointer;transition:background-color .15s ease;flex-shrink:0}
                .toggle-switch.on{background-color:#0078D4}
                .toggle-knob{width:16px;height:16px;border-radius:50%;background-color:#e5e2e1;position:absolute;top:2px;left:2px;transition:left .15s ease}
                .toggle-switch.on .toggle-knob{left:18px}
                .format-toggle{display:flex;padding:4px;background-color:#0E0E0E;border-radius:4px;width:fit-content}
                .format-btn{padding:8px 24px;font-family:'Inter',sans-serif;font-size:.75rem;border:none;border-radius:2px;cursor:pointer;color:#C0C7D4;background:none;font-weight:500;transition:all .15s ease}
                .format-btn:hover{color:#e5e2e1}
                .format-btn.active{background:linear-gradient(180deg,#A3C9FF 0%,#0078D4 100%);color:#131313;font-weight:700;box-shadow:0 2px 6px rgba(0,120,212,.25)}
                .cache-bar-wrapper{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background-color:#1B1B1C;border-radius:4px;max-width:420px}
                .cache-bar-left{display:flex;align-items:center;gap:12px}
                .cache-bar-info h4{font-size:.8125rem;font-weight:500;color:#e5e2e1}
                .cache-bar-info p{font-size:10px;color:#C0C7D4}
                .cache-bar-right{display:flex;align-items:center;gap:12px}
                .cache-value{font-family:'Fira Code',monospace;font-size:.75rem;font-weight:700;color:#A3C9FF}
                .cache-progress{width:96px;height:4px;background-color:#353535;border-radius:9999px;overflow:hidden}
                .cache-progress-fill{height:100%;width:66%;background-color:#A3C9FF;border-radius:9999px}
                .save-bar{position:sticky;bottom:20px;margin:0 auto;max-width:480px;width:100%;padding:16px 24px;background:rgba(53,53,53,.8);backdrop-filter:blur(20px);border-radius:8px;border:1px solid rgba(64,71,82,.1);box-shadow:0 8px 32px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:space-between;z-index:50;margin-top:40px}
                .save-bar-left{display:flex;align-items:center;gap:8px}
                .save-bar-dot{width:8px;height:8px;border-radius:50%;background-color:#61dac1;animation:pulse 2s infinite}
                @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
                .save-bar-text{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#C0C7D4}
                .save-bar-actions{display:flex;gap:12px}
            </style>
        </head>
        <body>
            <div class="settings-layout">
                <nav class="settings-nav">
                    <div class="settings-nav-header"><span>Configuration</span></div>
                    <div class="settings-nav-group">
                        <button class="settings-nav-item active" onclick="switchSection('ai-provider',this)"><span class="material-symbols-outlined">smart_toy</span>AI Provider</button>
                        <button class="settings-nav-item" onclick="switchSection('storage',this)"><span class="material-symbols-outlined">database</span>Storage</button>
                        <button class="settings-nav-item" onclick="switchSection('export',this)"><span class="material-symbols-outlined">ios_share</span>Export</button>
                        <button class="settings-nav-item" onclick="switchSection('notifications',this)"><span class="material-symbols-outlined">notifications</span>Notifications</button>
                    </div>
                    <div class="settings-nav-divider"></div>
                    <div class="settings-nav-group">
                        <button class="settings-nav-item" onclick="switchSection('keybindings',this)"><span class="material-symbols-outlined">keyboard</span>Keybindings</button>
                        <button class="settings-nav-item" onclick="switchSection('telemetry',this)"><span class="material-symbols-outlined">analytics</span>Telemetry</button>
                    </div>
                </nav>
                <div class="settings-content">
                    <div class="settings-content-inner">
                        <div class="page-header"><h1 class="font-headline">Genesis Settings</h1><p>Configure your local development architecture and AI preferences.</p></div>
                        <div class="settings-section" id="section-ai-provider">
                            <div class="section-info"><h2>AI PROVIDER</h2><p>Choose the primary intelligence engine for SDLC generation.</p></div>
                            <div class="section-fields">
                                <div class="radio-grid">
                                    <div class="radio-card selected" onclick="selectProvider(this)"><div class="radio-card-left"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">terminal</span><div class="radio-card-text"><span class="radio-card-name">Ollama</span><span class="radio-card-sub">Local - Recommended</span></div></div><div class="radio-dot"><div class="radio-dot-inner"></div></div></div>
                                    <div class="radio-card" onclick="selectProvider(this)"><div class="radio-card-left"><span class="material-symbols-outlined">hub</span><div class="radio-card-text"><span class="radio-card-name">OpenRouter</span><span class="radio-card-sub">Multi-Provider</span></div></div><div class="radio-dot"><div class="radio-dot-inner"></div></div></div>
                                    <div class="radio-card" onclick="selectProvider(this)"><div class="radio-card-left"><span class="material-symbols-outlined">bolt</span><div class="radio-card-text"><span class="radio-card-name">Anthropic</span><span class="radio-card-sub">Claude Models</span></div></div><div class="radio-dot"><div class="radio-dot-inner"></div></div></div>
                                    <div class="radio-card" onclick="selectProvider(this)"><div class="radio-card-left"><span class="material-symbols-outlined">auto_awesome</span><div class="radio-card-text"><span class="radio-card-name">OpenAI</span><span class="radio-card-sub">GPT Models</span></div></div><div class="radio-dot"><div class="radio-dot-inner"></div></div></div>
                                </div>
                                <div class="connection-status"><div class="status-indicator"></div><span class="status-text">Status: Ollama is Connected</span><span class="status-version">v0.1.28</span></div>
                                <div class="provider-detail">
                                    <div class="field-group"><span class="field-label">Endpoint</span><div class="field-row"><input class="field-input" type="text" id="endpoint-input" value="http://localhost:11434"/><button class="btn btn-secondary" onclick="handleAction('test-connection')"><span class="material-symbols-outlined">link</span>Test</button></div></div>
                                    <div class="field-group"><span class="field-label">Model</span><div class="field-row"><div class="field-select-wrapper"><select class="field-select"><option>Llama 3 (8B)</option><option>Mistral (7B)</option><option>Codellama (13B)</option></select><span class="field-select-arrow"><span class="material-symbols-outlined">expand_more</span></span></div><button class="btn btn-secondary" onclick="handleAction('refresh-models')"><span class="material-symbols-outlined">refresh</span></button></div></div>
                                </div>
                            </div>
                        </div>
                        <div class="settings-section" id="section-storage">
                            <div class="section-info"><h2>STORAGE</h2><p>Manage where your project data and cached assets are persisted.</p></div>
                            <div class="section-fields">
                                <div class="field-group"><span class="field-label">Storage Path</span><div class="field-row"><input class="field-input field-input-light" type="text" id="storage-path" value="/Users/user/Genesis/Data"/><button class="btn btn-secondary" onclick="handleAction('browse-path')">Browse</button></div></div>
                                <div class="cache-bar-wrapper"><div class="cache-bar-left"><span class="material-symbols-outlined" style="color:#C0C7D4">database</span><div class="cache-bar-info"><h4>Max Cache</h4><p>Allocated system memory for models</p></div></div><div class="cache-bar-right"><span class="cache-value">2048 MB</span><div class="cache-progress"><div class="cache-progress-fill"></div></div></div></div>
                                <div style="display:flex;gap:12px"><button class="btn btn-secondary" onclick="handleAction('clear-cache')"><span class="material-symbols-outlined">delete_sweep</span>Clear Cache</button><button class="btn btn-danger" onclick="handleAction('reset-settings')"><span class="material-symbols-outlined">warning</span>Reset All Data</button></div>
                            </div>
                        </div>
                        <div class="settings-section" id="section-export">
                            <div class="section-info"><h2>EXPORT</h2><p>Define output formats for architectural documentation.</p></div>
                            <div class="section-fields">
                                <div class="field-group"><span class="field-label">Default Format</span><div class="format-toggle"><button class="format-btn active" onclick="selectFormat(this)">PDF</button><button class="format-btn" onclick="selectFormat(this)">Markdown</button><button class="format-btn" onclick="selectFormat(this)">HTML</button><button class="format-btn" onclick="selectFormat(this)">JSON</button></div></div>
                                <div class="field-group"><span class="field-label">Auto-Export Path</span><input class="field-input field-input-light" type="text" placeholder="~/Desktop/Exports"/><span class="field-hint">Files will be automatically saved here after generation.</span></div>
                            </div>
                        </div>
                        <div class="settings-section" id="section-notifications">
                            <div class="section-info"><h2>NOTIFICATIONS</h2><p>Configure system feedback and background task alerts.</p></div>
                            <div class="section-fields">
                                <div class="toggle-row" onclick="toggleSwitch(this)"><span class="toggle-label">Show status bar progress</span><div class="toggle-switch on"><div class="toggle-knob"></div></div></div>
                                <div class="toggle-row" onclick="toggleSwitch(this)"><span class="toggle-label">Notify on pipeline completion</span><div class="toggle-switch on"><div class="toggle-knob"></div></div></div>
                                <div class="toggle-row" onclick="toggleSwitch(this)"><span class="toggle-label">Play sound on completion</span><div class="toggle-switch"><div class="toggle-knob"></div></div></div>
                                <div class="toggle-row" onclick="toggleSwitch(this)"><span class="toggle-label">Show AI generation progress</span><div class="toggle-switch on"><div class="toggle-knob"></div></div></div>
                                <div class="toggle-row" onclick="toggleSwitch(this)"><span class="toggle-label">Desktop notifications</span><div class="toggle-switch"><div class="toggle-knob"></div></div></div>
                            </div>
                        </div>
                        <div class="settings-section" id="section-keybindings">
                            <div class="section-info"><h2>KEYBINDINGS</h2><p>Customize keyboard shortcuts for Genesis commands.</p></div>
                            <div class="section-fields">
                                <div class="toggle-row"><span class="toggle-label">Open Genesis Panel</span><kbd style="padding:4px 10px;background:#0E0E0E;border-radius:4px;font-family:'Fira Code',monospace;font-size:.6875rem;color:#C0C7D4;border:1px solid rgba(64,71,82,.2)">Ctrl+Shift+D</kbd></div>
                                <div class="toggle-row"><span class="toggle-label">Run Pipeline</span><kbd style="padding:4px 10px;background:#0E0E0E;border-radius:4px;font-family:'Fira Code',monospace;font-size:.6875rem;color:#C0C7D4;border:1px solid rgba(64,71,82,.2)">Ctrl+Shift+R</kbd></div>
                                <div class="toggle-row"><span class="toggle-label">Toggle Sidebar</span><kbd style="padding:4px 10px;background:#0E0E0E;border-radius:4px;font-family:'Fira Code',monospace;font-size:.6875rem;color:#C0C7D4;border:1px solid rgba(64,71,82,.2)">Ctrl+Shift+B</kbd></div>
                            </div>
                        </div>
                        <div class="settings-section" id="section-telemetry">
                            <div class="section-info"><h2>TELEMETRY</h2><p>Help improve Genesis by sharing anonymous usage data.</p></div>
                            <div class="section-fields">
                                <div class="toggle-row" onclick="toggleSwitch(this)"><span class="toggle-label">Send anonymous usage statistics</span><div class="toggle-switch on"><div class="toggle-knob"></div></div></div>
                                <div class="toggle-row" onclick="toggleSwitch(this)"><span class="toggle-label">Send error reports</span><div class="toggle-switch on"><div class="toggle-knob"></div></div></div>
                                <div class="toggle-row" onclick="toggleSwitch(this)"><span class="toggle-label">Send crash dumps</span><div class="toggle-switch"><div class="toggle-knob"></div></div></div>
                            </div>
                        </div>
                        <div class="save-bar">
                            <div class="save-bar-left"><div class="save-bar-dot"></div><span class="save-bar-text">Unsaved Changes</span></div>
                            <div class="save-bar-actions">
                                <button class="btn btn-secondary" onclick="handleAction('reset-settings')" style="padding:8px 16px;font-size:.6875rem">Reset to Defaults</button>
                                <button class="btn btn-primary" onclick="handleAction('save-settings')" style="padding:8px 24px"><span class="material-symbols-outlined" style="font-size:14px">check</span>Save Settings</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function switchSection(id,el){document.querySelectorAll('.settings-nav-item').forEach(i=>{i.classList.remove('active')});el.classList.add('active');document.querySelectorAll('.settings-section').forEach(s=>s.style.display='none');const t=document.getElementById('section-'+id);if(t){t.style.display='grid';t.scrollIntoView({behavior:'smooth',block:'start'})}}
                function selectProvider(el){document.querySelectorAll('.radio-card').forEach(c=>{c.classList.remove('selected')});el.classList.add('selected')}
                function selectFormat(el){document.querySelectorAll('.format-btn').forEach(b=>{b.classList.remove('active')});el.classList.add('active')}
                function toggleSwitch(el){const t=el.querySelector('.toggle-switch');if(t)t.classList.toggle('on')}
                function handleAction(cmd){vscode.postMessage({command:cmd})}
                window.addEventListener('message',e=>{if(e.data.command==='update-path'){const p=document.getElementById('storage-path');if(p)p.value=e.data.value}})
            </script>
        </body>
        </html>`;
    }
}

// ==================== WORKFLOW PANEL (ALL WORKFLOWS LIST) ====================

class WorkflowPanel {
    public static currentPanel: WorkflowPanel | undefined;
    private _panel: vscode.WebviewPanel;
    private static _openDetail: ((name: string) => void) | undefined;
    private static _newWorkflow: (() => void) | undefined;

    public static setOpenDetail(cb: (name: string) => void) { WorkflowPanel._openDetail = cb; }
    public static setNewWorkflow(cb: () => void) { WorkflowPanel._newWorkflow = cb; }

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        panel.webview.html = this._getHtml();
        panel.iconPath = vscode.Uri.joinPath(vscode.Uri.file('/tmp'), 'media', 'icon.svg');
        this._panel.onDidDispose(() => { WorkflowPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'open-workflow': if (WorkflowPanel._openDetail) WorkflowPanel._openDetail(message.name); break;
                case 'new-workflow': if (WorkflowPanel._newWorkflow) WorkflowPanel._newWorkflow(); break;
                case 'delete-workflow': vscode.window.showWarningMessage('Delete workflow: ' + message.name + '?'); break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri) {
        if (WorkflowPanel.currentPanel) { WorkflowPanel.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-workflow', 'My Workflows', vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        WorkflowPanel.currentPanel = new WorkflowPanel(panel);
    }

    private _update() { this._panel.webview.html = this._getHtml(); }

    private _getHtml(): string {
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>My Workflows</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;flex-direction:column}
                ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}
                .page{flex:1;display:flex;flex-direction:column;gap:12px;padding:16px 20px;overflow-y:auto}

                /* WELCOME STRIP */
                .welcome-strip{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#1B1B1C;border-radius:8px;border:1px solid rgba(64,71,82,.08);flex-shrink:0}
                .ws-left{display:flex;align-items:center;gap:14px}
                .ws-icon{width:38px;height:38px;border-radius:8px;background:linear-gradient(135deg,rgba(163,201,255,.15),rgba(0,120,212,.15));display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .ws-icon .material-symbols-outlined{font-size:20px;color:#A3C9FF}
                .ws-text h1{font-family:'Space Grotesk',sans-serif;font-size:1rem;font-weight:700;color:#e5e2e1;line-height:1.2}
                .ws-text p{font-size:.6875rem;color:#8a919e}
                .ws-right{display:flex;align-items:center;gap:10px}
                .btn-new{display:flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(180deg,#A3C9FF 0%,#0078D4 100%);border:none;border-radius:6px;color:#fff;font-size:.6875rem;font-weight:700;cursor:pointer;transition:all .15s ease;text-transform:uppercase;letter-spacing:.04em}
                .btn-new:hover{opacity:.9;transform:translateY(-1px)}
                .btn-new .material-symbols-outlined{font-size:16px}
                .btn-filter{display:flex;align-items:center;gap:6px;padding:8px 14px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease}
                .btn-filter:hover{background:#353535;color:#e5e2e1}
                .btn-filter .material-symbols-outlined{font-size:14px}

                /* STATS ROW */
                .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;flex-shrink:0}
                .stat-card{background:#1B1B1C;border-radius:8px;padding:16px 18px;border:1px solid rgba(64,71,82,.08);display:flex;align-items:center;gap:14px;transition:background .15s ease;cursor:default}
                .stat-card:hover{background:#202020}
                .stat-icon{width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .stat-icon .material-symbols-outlined{font-size:18px}
                .si-blue{background:rgba(0,120,212,.15);color:#A3C9FF}
                .si-green{background:rgba(97,218,193,.12);color:#61dac1}
                .si-amber{background:rgba(251,191,36,.12);color:#fbbf24}
                .si-purple{background:rgba(168,85,247,.12);color:#a855f7}
                .stat-val{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;color:#e5e2e1;line-height:1}
                .stat-lbl{font-size:.625rem;color:#8a919e;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}

                /* FILTER TABS */
                .filter-tabs{display:flex;align-items:center;gap:2px;background:#1B1B1C;border-radius:8px;padding:4px;flex-shrink:0;border:1px solid rgba(64,71,82,.08)}
                .ftab{padding:7px 16px;border-radius:6px;font-size:.6875rem;font-weight:600;color:#8a919e;cursor:pointer;transition:all .15s ease;border:none;background:transparent}
                .ftab:hover{color:#e5e2e1}
                .ftab.active{background:#202020;color:#e5e2e1}
                .ftab .count{margin-left:6px;padding:1px 7px;background:rgba(53,53,53,.6);border-radius:9999px;font-size:.5625rem;font-weight:700}
                .ftab.active .count{background:rgba(163,201,255,.12);color:#A3C9FF}

                /* WORKFLOW LIST */
                .wf-list{display:flex;flex-direction:column;gap:1px;background:rgba(64,71,82,.12);border-radius:8px;overflow:hidden;border:1px solid rgba(64,71,82,.12)}
                .wf-row{display:flex;align-items:center;gap:16px;padding:16px 20px;background:#1B1B1C;cursor:pointer;transition:background .15s ease}
                .wf-row:hover{background:#202020}
                .wf-icon{width:40px;height:40px;border-radius:8px;background:#202020;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(64,71,82,.15)}
                .wf-icon .material-symbols-outlined{font-size:20px;color:#A3C9FF}
                .wf-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
                .wf-name{font-size:.8125rem;font-weight:600;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .wf-desc{font-size:.625rem;color:#8a919e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .wf-meta{display:flex;align-items:center;gap:16px;flex-shrink:0}
                .wf-phases{display:flex;align-items:center;gap:6px}
                .wf-phase-dot{width:8px;height:8px;border-radius:50%}
                .wpd-done{background:#61dac1;box-shadow:0 0 4px rgba(97,218,193,.4)}
                .wpd-active{background:#A3C9FF;box-shadow:0 0 4px rgba(163,201,255,.4);animation:blink 2s infinite}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                .wpd-pending{background:#353535}
                .wf-phase-label{font-size:.5625rem;color:#8a919e;white-space:nowrap}
                .wf-progress{width:80px;height:4px;background:#353535;border-radius:9999px;overflow:hidden}
                .wf-progress-fill{height:100%;border-radius:9999px}
                .wpf-blue{background:linear-gradient(90deg,#A3C9FF,#0078D4)}
                .wpf-green{background:linear-gradient(90deg,#80f7dc,#008672)}
                .wpf-gray{background:#404752}
                .wf-pct{font-family:'Fira Code',monospace;font-size:.6875rem;font-weight:600;color:#C0C7D4;width:36px;text-align:right}
                .wf-badge{font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:3px 10px;border-radius:9999px}
                .b-run{background:rgba(97,218,193,.12);color:#61dac1}
                .b-done{background:rgba(163,201,255,.1);color:#A3C9FF}
                .b-pend{background:rgba(192,199,212,.08);color:#8a919e}
                .b-err{background:rgba(255,180,171,.1);color:#ffb4ab}
                .wf-time{font-size:.625rem;color:#8a919e;white-space:nowrap}
                .wf-actions{display:flex;align-items:center;gap:4px;opacity:0;transition:opacity .15s ease}
                .wf-row:hover .wf-actions{opacity:1}
                .wf-act-btn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;color:#8a919e;cursor:pointer;transition:all .12s ease;border:none;background:transparent}
                .wf-act-btn:hover{background:rgba(53,53,53,.5);color:#e5e2e1}
                .wf-act-btn .material-symbols-outlined{font-size:16px}
                .wf-act-btn.delete:hover{background:rgba(255,180,171,.1);color:#ffb4ab}

                /* QUICK ACTIONS ROW */
                .qa-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;flex-shrink:0}
                .qa{background:#1B1B1C;border-radius:8px;padding:18px 16px;border:1px solid rgba(64,71,82,.08);cursor:pointer;transition:all .15s ease;display:flex;align-items:center;gap:14px}
                .qa:hover{background:#202020;border-color:rgba(64,71,82,.2);transform:translateY(-1px)}
                .qa:active{transform:scale(.98)}
                .qa-icon{width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .qa-icon .material-symbols-outlined{font-size:18px}
                .qi-primary{background:linear-gradient(135deg,rgba(163,201,255,.15),rgba(0,120,212,.15));color:#A3C9FF}
                .qi-tertiary{background:rgba(97,218,193,.1);color:#61dac1}
                .qi-amber{background:rgba(251,191,36,.1);color:#fbbf24}
                .qa-label{font-size:.75rem;font-weight:600;color:#e5e2e1}
                .qa-desc{font-size:.5625rem;color:#8a919e;line-height:1.4;margin-top:2px}
            </style>
        </head>
        <body>
            <div class="page">
                <!-- WELCOME STRIP -->
                <div class="welcome-strip">
                    <div class="ws-left">
                        <div class="ws-icon"><span class="material-symbols-outlined">account_tree</span></div>
                        <div class="ws-text">
                            <h1>My Workflows</h1>
                            <p>Manage and monitor all your AI-powered SDLC pipelines</p>
                        </div>
                    </div>
                    <div class="ws-right">
                        <button class="btn-filter" onclick="handleAction('filter')"><span class="material-symbols-outlined">filter_list</span>Filter</button>
                        <button class="btn-new" onclick="handleAction('new-workflow')"><span class="material-symbols-outlined">add</span>New Workflow</button>
                    </div>
                </div>

                <!-- STATS -->
                <div class="stats-row">
                    <div class="stat-card"><div class="stat-icon si-blue"><span class="material-symbols-outlined">account_tree</span></div><div><div class="stat-val">6</div><div class="stat-lbl">Total Workflows</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-green"><span class="material-symbols-outlined">sync</span></div><div><div class="stat-val">1</div><div class="stat-lbl">Running</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-blue"><span class="material-symbols-outlined">check_circle</span></div><div><div class="stat-val">3</div><div class="stat-lbl">Completed</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-purple"><span class="material-symbols-outlined">schedule</span></div><div><div class="stat-val">2</div><div class="stat-lbl">Pending</div></div></div>
                </div>

                <!-- FILTER TABS -->
                <div class="filter-tabs">
                    <button class="ftab active">All <span class="count">6</span></button>
                    <button class="ftab">Running <span class="count">1</span></button>
                    <button class="ftab">Completed <span class="count">3</span></button>
                    <button class="ftab">Pending <span class="count">2</span></button>
                    <button class="ftab">Failed <span class="count">0</span></button>
                </div>

                <!-- WORKFLOW LIST -->
                <div class="wf-list">
                    <!-- 1. E-Commerce Re-platform (Running) -->
                    <div class="wf-row" onclick="handleAction('open-workflow','E-Commerce Re-platform')">
                        <div class="wf-icon"><span class="material-symbols-outlined">shopping_cart</span></div>
                        <div class="wf-info">
                            <div class="wf-name">E-Commerce Re-platform</div>
                            <div class="wf-desc">Micro-frontend migration with real-time inventory management system</div>
                        </div>
                        <div class="wf-meta">
                            <div class="wf-phases">
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-active"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <span class="wf-phase-label">2/4 phases</span>
                            </div>
                            <div class="wf-progress"><div class="wf-progress-fill wpf-blue" style="width:45%"></div></div>
                            <span class="wf-pct">45%</span>
                            <span class="wf-badge b-run">● Running</span>
                            <span class="wf-time">2h ago</span>
                        </div>
                        <div class="wf-actions">
                            <button class="wf-act-btn" title="Open"><span class="material-symbols-outlined">open_in_new</span></button>
                            <button class="wf-act-btn delete" title="Delete" onclick="event.stopPropagation();handleAction('delete-workflow','E-Commerce Re-platform')"><span class="material-symbols-outlined">delete</span></button>
                        </div>
                    </div>

                    <!-- 2. FinTech Wallet API (Completed) -->
                    <div class="wf-row" onclick="handleAction('open-workflow','FinTech Wallet API')">
                        <div class="wf-icon"><span class="material-symbols-outlined">account_balance</span></div>
                        <div class="wf-info">
                            <div class="wf-name">FinTech Wallet API</div>
                            <div class="wf-desc">Payment processing and ledger management system</div>
                        </div>
                        <div class="wf-meta">
                            <div class="wf-phases">
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <span class="wf-phase-label">4/4 phases</span>
                            </div>
                            <div class="wf-progress"><div class="wf-progress-fill wpf-green" style="width:100%"></div></div>
                            <span class="wf-pct">100%</span>
                            <span class="wf-badge b-done">✓ Done</span>
                            <span class="wf-time">Yesterday</span>
                        </div>
                        <div class="wf-actions">
                            <button class="wf-act-btn" title="Open"><span class="material-symbols-outlined">open_in_new</span></button>
                            <button class="wf-act-btn delete" title="Delete" onclick="event.stopPropagation();handleAction('delete-workflow','FinTech Wallet API')"><span class="material-symbols-outlined">delete</span></button>
                        </div>
                    </div>

                    <!-- 3. Patient Portal v2 (Pending) -->
                    <div class="wf-row" onclick="handleAction('open-workflow','Patient Portal v2')">
                        <div class="wf-icon"><span class="material-symbols-outlined">local_hospital</span></div>
                        <div class="wf-info">
                            <div class="wf-name">Patient Portal v2</div>
                            <div class="wf-desc">HIPAA-compliant patient management dashboard</div>
                        </div>
                        <div class="wf-meta">
                            <div class="wf-phases">
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <span class="wf-phase-label">0/4 phases</span>
                            </div>
                            <div class="wf-progress"><div class="wf-progress-fill wpf-gray" style="width:0%"></div></div>
                            <span class="wf-pct">0%</span>
                            <span class="wf-badge b-pend">◎ Pending</span>
                            <span class="wf-time">3d ago</span>
                        </div>
                        <div class="wf-actions">
                            <button class="wf-act-btn" title="Open"><span class="material-symbols-outlined">open_in_new</span></button>
                            <button class="wf-act-btn delete" title="Delete" onclick="event.stopPropagation();handleAction('delete-workflow','Patient Portal v2')"><span class="material-symbols-outlined">delete</span></button>
                        </div>
                    </div>

                    <!-- 4. Supply Chain Tracker (Completed) -->
                    <div class="wf-row" onclick="handleAction('open-workflow','Supply Chain Tracker')">
                        <div class="wf-icon"><span class="material-symbols-outlined">local_shipping</span></div>
                        <div class="wf-info">
                            <div class="wf-name">Supply Chain Tracker</div>
                            <div class="wf-desc">Real-time logistics and inventory tracking platform</div>
                        </div>
                        <div class="wf-meta">
                            <div class="wf-phases">
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <span class="wf-phase-label">4/4 phases</span>
                            </div>
                            <div class="wf-progress"><div class="wf-progress-fill wpf-green" style="width:100%"></div></div>
                            <span class="wf-pct">100%</span>
                            <span class="wf-badge b-done">✓ Done</span>
                            <span class="wf-time">5d ago</span>
                        </div>
                        <div class="wf-actions">
                            <button class="wf-act-btn" title="Open"><span class="material-symbols-outlined">open_in_new</span></button>
                            <button class="wf-act-btn delete" title="Delete" onclick="event.stopPropagation();handleAction('delete-workflow','Supply Chain Tracker')"><span class="material-symbols-outlined">delete</span></button>
                        </div>
                    </div>

                    <!-- 5. Learning Management System (Pending) -->
                    <div class="wf-row" onclick="handleAction('open-workflow','Learning Management System')">
                        <div class="wf-icon"><span class="material-symbols-outlined">school</span></div>
                        <div class="wf-info">
                            <div class="wf-name">Learning Management System</div>
                            <div class="wf-desc">Course authoring, progress tracking & certification engine</div>
                        </div>
                        <div class="wf-meta">
                            <div class="wf-phases">
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <span class="wf-phase-label">0/4 phases</span>
                            </div>
                            <div class="wf-progress"><div class="wf-progress-fill wpf-gray" style="width:0%"></div></div>
                            <span class="wf-pct">0%</span>
                            <span class="wf-badge b-pend">◎ Pending</span>
                            <span class="wf-time">1w ago</span>
                        </div>
                        <div class="wf-actions">
                            <button class="wf-act-btn" title="Open"><span class="material-symbols-outlined">open_in_new</span></button>
                            <button class="wf-act-btn delete" title="Delete" onclick="event.stopPropagation();handleAction('delete-workflow','Learning Management System')"><span class="material-symbols-outlined">delete</span></button>
                        </div>
                    </div>

                    <!-- 6. DevOps Dashboard (Completed) -->
                    <div class="wf-row" onclick="handleAction('open-workflow','DevOps Dashboard')">
                        <div class="wf-icon"><span class="material-symbols-outlined">monitoring</span></div>
                        <div class="wf-info">
                            <div class="wf-name">DevOps Dashboard</div>
                            <div class="wf-desc">CI/CD monitoring, deployment metrics & alerting system</div>
                        </div>
                        <div class="wf-meta">
                            <div class="wf-phases">
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <span class="wf-phase-label">4/4 phases</span>
                            </div>
                            <div class="wf-progress"><div class="wf-progress-fill wpf-green" style="width:100%"></div></div>
                            <span class="wf-pct">100%</span>
                            <span class="wf-badge b-done">✓ Done</span>
                            <span class="wf-time">2w ago</span>
                        </div>
                        <div class="wf-actions">
                            <button class="wf-act-btn" title="Open"><span class="material-symbols-outlined">open_in_new</span></button>
                            <button class="wf-act-btn delete" title="Delete" onclick="event.stopPropagation();handleAction('delete-workflow','DevOps Dashboard')"><span class="material-symbols-outlined">delete</span></button>
                        </div>
                    </div>
                </div>

                <!-- QUICK ACTIONS -->
                <div class="qa-grid">
                    <div class="qa" onclick="handleAction('new-workflow')">
                        <div class="qa-icon qi-primary"><span class="material-symbols-outlined">add_circle</span></div>
                        <div><div class="qa-label">New Workflow</div><div class="qa-desc">Create a new AI-powered pipeline</div></div>
                    </div>
                    <div class="qa" onclick="handleAction('import-workflow')">
                        <div class="qa-icon qi-tertiary"><span class="material-symbols-outlined">upload_file</span></div>
                        <div><div class="qa-label">Import Workflow</div><div class="qa-desc">Import from file or template</div></div>
                    </div>
                    <div class="qa" onclick="handleAction('view-logs')">
                        <div class="qa-icon qi-amber"><span class="material-symbols-outlined">terminal</span></div>
                        <div><div class="qa-label">View Logs</div><div class="qa-desc">Open terminal output</div></div>
                    </div>
                </div>
            </div>

            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c,v){vscode.postMessage(v?{command:c,name:v}:{command:c})}
                document.querySelectorAll('.ftab').forEach(tab=>{
                    tab.addEventListener('click',()=>{
                        document.querySelectorAll('.ftab').forEach(t=>t.classList.remove('active'));
                        tab.classList.add('active');
                    });
                });
            </script>
        </body>
        </html>`;
    }
}


export function deactivate() {}

// ==================== WORKFLOW DETAIL PANEL (Enhanced Pipeline View) ====================

class WorkflowDetailPanel {
    public static currentPanel: WorkflowDetailPanel | undefined;
    private _panel: vscode.WebviewPanel;
    private static _onBack: (() => void) | undefined;
    private static _onViewDocument: ((wfName: string, docName: string) => void) | undefined;
    private static _onOpenEditor: ((name: string) => void) | undefined;
    private static _onExport: ((name: string) => void) | undefined;
    private static _onNewProject: (() => void) | undefined;

    public static setOnBack(cb: () => void) { WorkflowDetailPanel._onBack = cb; }
    public static setOnViewDocument(cb: (wfName: string, docName: string) => void) { WorkflowDetailPanel._onViewDocument = cb; }
    public static setOnOpenEditor(cb: (name: string) => void) { WorkflowDetailPanel._onOpenEditor = cb; }
    public static setOnExport(cb: (name: string) => void) { WorkflowDetailPanel._onExport = cb; }
    public static setOnNewProject(cb: () => void) { WorkflowDetailPanel._onNewProject = cb; }

    private constructor(panel: vscode.WebviewPanel, name: string) {
        this._panel = panel;
        panel.webview.html = this._getHtml(name);
        this._panel.onDidDispose(() => { WorkflowDetailPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'back-to-workflows': this._confirmBack(); break;
                case 'view-document': if (WorkflowDetailPanel._onViewDocument) WorkflowDetailPanel._onViewDocument(name, message.doc); break;
                case 'open-editor': if (WorkflowDetailPanel._onOpenEditor) WorkflowDetailPanel._onOpenEditor(name); break;
                case 'export': if (WorkflowDetailPanel._onExport) WorkflowDetailPanel._onExport(name); break;
                case 'new-project': if (WorkflowDetailPanel._onNewProject) WorkflowDetailPanel._onNewProject(); break;
                case 'run-pipeline': vscode.window.showInformationMessage('Pipeline started for ' + name); break;
                case 'pause-pipeline': vscode.window.showInformationMessage('Pipeline paused'); break;
                case 'stop-pipeline': vscode.window.showWarningMessage('Stop pipeline?', { modal: true }, 'Stop', 'Cancel').then(s => { if (s === 'Stop') vscode.window.showInformationMessage('Pipeline stopped'); }); break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri, name: string) {
        if (WorkflowDetailPanel.currentPanel) { WorkflowDetailPanel.currentPanel._panel.dispose(); }
        const panel = vscode.window.createWebviewPanel('genesis-workflow-detail', name, vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        WorkflowDetailPanel.currentPanel = new WorkflowDetailPanel(panel, name);
    }

    public static close() {
        if (WorkflowDetailPanel.currentPanel) { WorkflowDetailPanel.currentPanel._panel.dispose(); }
    }

    private _confirmBack() {
        vscode.window.showWarningMessage('Go back to Workflows list? Unsaved changes may be lost.', { modal: true }, 'Yes', 'No').then(s => {
            if (s === 'Yes') { this._panel.dispose(); if (WorkflowDetailPanel._onBack) WorkflowDetailPanel._onBack(); }
        });
    }

    private _getHtml(name: string): string {
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;font-family:'Material Symbols Outlined'}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;flex-direction:column}
                ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}
                .page{flex:1;display:flex;flex-direction:column;gap:16px;padding:16px 20px;overflow-y:auto;min-height:0}

                /* HEADER */
                .header{display:flex;align-items:center;gap:14px;padding:16px 20px;background:#1B1B1C;border-radius:8px;border:1px solid rgba(64,71,82,.08);flex-shrink:0}
                .back-btn{display:flex;align-items:center;gap:6px;padding:6px 14px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .back-btn:hover{background:#353535;color:#e5e2e1}
                .back-btn .material-symbols-outlined{font-size:16px}
                .header-info{flex:1}
                .header-info h1{font-family:'Space Grotesk',sans-serif;font-size:1rem;font-weight:700;color:#e5e2e1}
                .header-info p{font-size:.6875rem;color:#8a919e}
                .header-badge{display:flex;align-items:center;gap:6px;padding:6px 14px;background:rgba(97,218,193,.08);border:1px solid rgba(97,218,193,.15);border-radius:9999px}
                .header-dot{width:8px;height:8px;border-radius:50%;background:#61dac1;animation:blink 2s infinite}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                .header-badge span{font-size:.625rem;color:#61dac1;font-weight:700;text-transform:uppercase;letter-spacing:.04em}

                /* GLOBAL PROGRESS */
                .progress-section{display:flex;justify-content:space-between;align-items:flex-end;flex-shrink:0}
                .progress-left p{font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#A3C9FF;margin-bottom:4px}
                .progress-left h2{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;color:#e5e2e1}
                .progress-right{text-align:right}
                .progress-pct{font-family:'Fira Code',monospace;font-size:1.75rem;font-weight:700;color:#A3C9FF}
                .progress-label{font-size:.625rem;color:#8a919e;text-transform:uppercase}
                .global-bar{height:6px;background:#202020;border-radius:9999px;overflow:hidden;flex-shrink:0}
                .global-fill{height:100%;background:linear-gradient(90deg,#A3C9FF,#0078D4);border-radius:9999px;transition:width 1s ease}

                /* PHASE GRID */
                .phase-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(64,71,82,.2);border-radius:8px;overflow:visible;border:1px solid rgba(64,71,82,.2)}
                .phase-card{background:#202020;padding:24px;display:flex;flex-direction:column;justify-content:space-between;min-height:240px;cursor:pointer;transition:background .15s ease}
                .phase-card:hover{background:#252525}
                .phase-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
                .phase-label{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#8a919e;margin-bottom:4px}
                .phase-name{font-size:.9375rem;font-weight:700;color:#e5e2e1}
                .phase-icon{font-size:22px;color:#8a919e}
                .phase-icon.pi-done{color:#61dac1}
                .phase-icon.pi-active{color:#A3C9FF;animation:pulse 2s infinite}
                @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

                /* SUB-ITEMS */
                .sub-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:24px}
                .sub-item{aspect-ratio:1;background:#2a2a2a;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;border:1px solid transparent;border-radius:4px;transition:all .15s ease;cursor:help}
                .sub-item:hover{border-color:rgba(163,201,255,.4)}
                .sub-item .material-symbols-outlined{font-size:18px;color:#8a919e;margin-bottom:4px}
                .sub-item.si-done .material-symbols-outlined{color:#61dac1}
                .sub-item.si-active{border-color:rgba(163,201,255,.4)}
                .sub-item.si-active .material-symbols-outlined{color:#A3C9FF}
                .sub-item.si-pending{opacity:.4}
                .sub-item span{font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8a919e}
                .sub-item.si-active span{color:#A3C9FF}

                /* PHASE PROGRESS */
                .phase-bottom{}
                .phase-progress-row{display:flex;justify-content:space-between;font-size:.625rem;font-weight:700;text-transform:uppercase;margin-bottom:6px}
                .phase-progress-row.ppr-done{color:#C0C7D4}
                .phase-progress-row.ppr-active .ppr-status{color:#A3C9FF}
                .phase-progress-row.ppr-pending{color:#8a919e}
                .phase-bar{height:4px;background:#353535;border-radius:9999px;overflow:hidden}
                .phase-fill{height:100%;border-radius:9999px}
                .pf-done{background:#61dac1}
                .pf-active{background:linear-gradient(90deg,#A3C9FF,#0078D4)}
                .pf-pending{background:#353535}

                /* SUMMARY ROW */
                .summary-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;flex-shrink:0}
                .summary-card{background:#202020;padding:18px;border-left:2px solid #0078D4;border-radius:0 6px 6px 0}
                .summary-card .sc-label{font-size:.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a919e;margin-bottom:6px}
                .summary-card .sc-value{font-family:'Space Grotesk',sans-serif;font-size:1.25rem;font-weight:700;color:#e5e2e1}
                .summary-card .sc-value.green{color:#61dac1}
                .summary-card .sc-value.blue{color:#A3C9FF}
                .summary-card .sc-sub{font-size:.5625rem;color:#8a919e;margin-top:2px}
                .agent-avatars{display:flex;margin-top:4px}
                .agent-avatar{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.5625rem;font-weight:700;border:2px solid #202020;margin-left:-6px}
                .agent-avatar:first-child{margin-left:0}
                .aa-v{background:#A3C9FF;color:#131313}
                .aa-p{background:#0078D4;color:#fff}
                .aa-s{background:#393939;color:#e5e2e1}

                /* DOCUMENTS SECTION */
                .docs-section{flex-shrink:0}
                .docs-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
                .docs-header h2{font-family:'Space Grotesk',sans-serif;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#e5e2e1}
                .docs-header .material-symbols-outlined{font-size:16px;color:#8a919e;cursor:pointer}
                .docs-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
                .doc-card{background:#1B1B1C;border:1px solid rgba(64,71,82,.08);border-radius:8px;padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .15s ease}
                .doc-card:hover{background:#202020;border-color:rgba(64,71,82,.2);transform:translateY(-1px)}
                .doc-card .dc-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .doc-card .dc-icon .material-symbols-outlined{font-size:18px}
                .dc-done{background:rgba(97,218,193,.12);color:#61dac1}
                .dc-active{background:rgba(163,201,255,.12);color:#A3C9FF}
                .dc-pending{background:rgba(53,53,53,.5);color:#8a919e}
                .dc-info{flex:1;min-width:0}
                .dc-name{font-size:.6875rem;font-weight:600;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .dc-desc{font-size:.5rem;color:#8a919e}
                .dc-status{font-size:.5rem;font-weight:700;text-transform:uppercase;flex-shrink:0}
                .ds-green{color:#61dac1}
                .ds-blue{color:#A3C9FF}
                .ds-gray{color:#8a919e}

                /* ACTION BAR */
                .action-bar{display:flex;gap:10px;flex-shrink:0;padding-top:4px}
                .act-btn{display:flex;align-items:center;gap:8px;padding:10px 20px;border-radius:6px;font-size:.75rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif;border:none}
                .act-btn:hover{transform:translateY(-1px)}
                .act-btn:active{transform:scale(.97)}
                .act-btn .material-symbols-outlined{font-size:16px}
                .ab-primary{background:linear-gradient(180deg,#A3C9FF,#0078D4);color:#fff;box-shadow:0 4px 12px rgba(0,120,212,.3)}
                .ab-secondary{background:#202020;color:#C0C7D4;border:1px solid rgba(64,71,82,.15)}
                .ab-secondary:hover{background:#353535;color:#e5e2e1}
                .ab-danger{background:rgba(255,180,171,.08);color:#ffb4ab;border:1px solid rgba(255,180,171,.15)}
                .ab-danger:hover{background:rgba(255,180,171,.15)}
                .ab-new{background:rgba(163,201,255,.1);color:#A3C9FF;border:1px solid rgba(163,201,255,.2)}
                .ab-new:hover{background:rgba(163,201,255,.15)}
            </style>
        </head>
        <body>
            <div class="page">
                <!-- HEADER -->
                <div class="header">
                    <button class="back-btn" onclick="handleAction('back-to-workflows')">
                        <span class="material-symbols-outlined">arrow_back</span> Back
                    </button>
                    <div class="header-info">
                        <h1>${name}</h1>
                        <p>AI-powered SDLC pipeline workflow</p>
                    </div>
                    <div class="header-badge"><div class="header-dot"></div><span>Running</span></div>
                </div>

                <!-- GLOBAL PROGRESS -->
                <div class="progress-section">
                    <div class="progress-left">
                        <p>Genesis AI Orchestration</p>
                        <h2>Active Pipeline: ${name}</h2>
                    </div>
                    <div class="progress-right">
                        <div class="progress-pct">45%</div>
                        <div class="progress-label">Global Completion</div>
                    </div>
                </div>
                <div class="global-bar"><div class="global-fill" style="width:45%"></div></div>

                <!-- PHASE GRID -->
                <div class="phase-grid">
                    <!-- Phase 01: Strategic Foundation -->
                    <div class="phase-card" onclick="handleAction('view-document','Vision Strategy')">
                        <div>
                            <div class="phase-top">
                                <div><div class="phase-label">Phase 01</div><div class="phase-name">Strategic Foundation</div></div>
                                <span class="material-symbols-outlined phase-icon pi-done" style="font-variation-settings:'FILL' 1">check_circle</span>
                            </div>
                            <div class="sub-grid">
                                <div class="sub-item si-done"><span class="material-symbols-outlined">visibility</span><span>Vision</span></div>
                                <div class="sub-item si-done"><span class="material-symbols-outlined">groups</span><span>Persona</span></div>
                                <div class="sub-item si-done"><span class="material-symbols-outlined">query_stats</span><span>Market</span></div>
                                <div class="sub-item si-done"><span class="material-symbols-outlined">psychology</span><span>Logic</span></div>
                            </div>
                        </div>
                        <div class="phase-bottom">
                            <div class="phase-progress-row ppr-done"><span>Status: Complete</span><span>100%</span></div>
                            <div class="phase-bar"><div class="phase-fill pf-done" style="width:100%"></div></div>
                        </div>
                    </div>

                    <!-- Phase 02: Architectural Planning -->
                    <div class="phase-card" onclick="handleAction('view-document','Technical Architecture')">
                        <div>
                            <div class="phase-top">
                                <div><div class="phase-label">Phase 02</div><div class="phase-name">Architectural Planning</div></div>
                                <span class="material-symbols-outlined phase-icon pi-active">sync</span>
                            </div>
                            <div class="sub-grid">
                                <div class="sub-item si-active"><span class="material-symbols-outlined">schema</span><span>Schema</span></div>
                                <div class="sub-item"><span class="material-symbols-outlined">route</span><span>Router</span></div>
                                <div class="sub-item"><span class="material-symbols-outlined">database</span><span>Data</span></div>
                                <div class="sub-item"><span class="material-symbols-outlined">api</span><span>API</span></div>
                            </div>
                        </div>
                        <div class="phase-bottom">
                            <div class="phase-progress-row ppr-active"><span class="ppr-status">Status: Orchestrating...</span><span>78%</span></div>
                            <div class="phase-bar"><div class="phase-fill pf-active" style="width:78%"></div></div>
                        </div>
                    </div>

                    <!-- Phase 03: Technical Implementation -->
                    <div class="phase-card">
                        <div>
                            <div class="phase-top">
                                <div><div class="phase-label">Phase 03</div><div class="phase-name">Technical Implementation</div></div>
                                <span class="material-symbols-outlined phase-icon">hourglass_empty</span>
                            </div>
                            <div class="sub-grid">
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">terminal</span><span>CLI</span></div>
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">javascript</span><span>React</span></div>
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">settings_ethernet</span><span>Socket</span></div>
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">lock</span><span>Auth</span></div>
                            </div>
                        </div>
                        <div class="phase-bottom">
                            <div class="phase-progress-row ppr-pending"><span>Status: Queued</span><span>0%</span></div>
                            <div class="phase-bar"><div class="phase-fill pf-pending" style="width:0%"></div></div>
                        </div>
                    </div>

                    <!-- Phase 04: Design & Delivery -->
                    <div class="phase-card">
                        <div>
                            <div class="phase-top">
                                <div><div class="phase-label">Phase 04</div><div class="phase-name">Design & Delivery</div></div>
                                <span class="material-symbols-outlined phase-icon">pending_actions</span>
                            </div>
                            <div class="sub-grid">
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">palette</span><span>UI</span></div>
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">gesture</span><span>UX</span></div>
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">rocket_launch</span><span>Deploy</span></div>
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">inventory_2</span><span>Assets</span></div>
                            </div>
                        </div>
                        <div class="phase-bottom">
                            <div class="phase-progress-row ppr-pending"><span>Status: Pending</span><span>0%</span></div>
                            <div class="phase-bar"><div class="phase-fill pf-pending" style="width:0%"></div></div>
                        </div>
                    </div>
                </div>

                <!-- SUMMARY ROW -->
                <div class="summary-row">
                    <div class="summary-card">
                        <div class="sc-label">Active Agents</div>
                        <div class="agent-avatars">
                            <div class="agent-avatar aa-v">V</div>
                            <div class="agent-avatar aa-p">P</div>
                            <div class="agent-avatar aa-s">S</div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="sc-label">Tokens Consumed</div>
                        <div class="sc-value blue">124,502 <span style="font-size:.625rem;font-weight:400;opacity:.5">TX</span></div>
                    </div>
                    <div class="summary-card">
                        <div class="sc-label">Estimated Time</div>
                        <div class="sc-value green">04:12 <span style="font-size:.625rem;font-weight:400;opacity:.5">REMAINING</span></div>
                    </div>
                </div>

                <!-- GENERATED DOCUMENTS -->
                <div class="docs-section">
                    <div class="docs-header">
                        <h2>Generated Documents <span style="color:#8a919e;font-weight:400;font-size:.625rem;letter-spacing:0;text-transform:none">(20 total)</span></h2>
                        <span class="material-symbols-outlined" onclick="handleAction('export')">ios_share</span>
                    </div>
                    <div class="docs-grid">
                        <div class="doc-card" onclick="handleAction('view-document','Vision & Strategy')">
                            <div class="dc-icon dc-done"><span class="material-symbols-outlined">lightbulb</span></div>
                            <div class="dc-info"><div class="dc-name">Vision & Strategy</div><div class="dc-desc">Strategic alignment & business goals</div></div>
                            <span class="dc-status ds-green">Done</span>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','User Personas')">
                            <div class="dc-icon dc-done"><span class="material-symbols-outlined">groups</span></div>
                            <div class="dc-info"><div class="dc-name">User Personas</div><div class="dc-desc">Target audience definitions</div></div>
                            <span class="dc-status ds-green">Done</span>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','Product Roadmap')">
                            <div class="dc-icon dc-done"><span class="material-symbols-outlined">map</span></div>
                            <div class="dc-info"><div class="dc-name">Product Roadmap</div><div class="dc-desc">Phase-wise delivery plan</div></div>
                            <span class="dc-status ds-green">Done</span>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','GTM Strategy')">
                            <div class="dc-icon dc-done"><span class="material-symbols-outlined">trending_up</span></div>
                            <div class="dc-info"><div class="dc-name">GTM Strategy</div><div class="dc-desc">Go-to-market positioning</div></div>
                            <span class="dc-status ds-green">Done</span>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','Strategic Use Cases')">
                            <div class="dc-icon dc-active"><span class="material-symbols-outlined">account_tree</span></div>
                            <div class="dc-info"><div class="dc-name">Strategic Use Cases</div><div class="dc-desc">Generating requirements...</div></div>
                            <span class="dc-status ds-blue">Running</span>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','UI Flows & Navigation')">
                            <div class="dc-icon dc-active"><span class="material-symbols-outlined">route</span></div>
                            <div class="dc-info"><div class="dc-name">UI Flows & Navigation</div><div class="dc-desc">Generating navigation flows...</div></div>
                            <span class="dc-status ds-blue">Running</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">dataset</span></div>
                            <div class="dc-info"><div class="dc-name">Synthetic Data Schema</div><div class="dc-desc">Data models & relationships</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">description</span></div>
                            <div class="dc-info"><div class="dc-name">Product Requirements Doc</div><div class="dc-desc">PRD with feature specifications</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">architecture</span></div>
                            <div class="dc-info"><div class="dc-name">Technical Architecture</div><div class="dc-desc">System design & components</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">database</span></div>
                            <div class="dc-info"><div class="dc-name">Database Design</div><div class="dc-desc">Entity relationship diagrams</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">api</span></div>
                            <div class="dc-info"><div class="dc-name">API Specifications</div><div class="dc-desc">REST/GraphQL endpoint specs</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">security</span></div>
                            <div class="dc-info"><div class="dc-name">Security Specification</div><div class="dc-desc">Auth, encryption & compliance</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">bug_report</span></div>
                            <div class="dc-info"><div class="dc-name">Testing Strategy</div><div class="dc-desc">Test plans & coverage matrix</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">cloud</span></div>
                            <div class="dc-info"><div class="dc-name">DevOps & Infrastructure</div><div class="dc-desc">CI/CD, containers & hosting</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">layers</span></div>
                            <div class="dc-info"><div class="dc-name">Interactive Mockup</div><div class="dc-desc">Clickable UI prototype</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">palette</span></div>
                            <div class="dc-info"><div class="dc-name">Brand Style Guide</div><div class="dc-desc">Colors, typography & assets</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">business_center</span></div>
                            <div class="dc-info"><div class="dc-name">Business Requirements Doc</div><div class="dc-desc">Stakeholder requirements</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">fact_check</span></div>
                            <div class="dc-info"><div class="dc-name">Functional Requirements</div><div class="dc-desc">Feature-level specifications</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">inventory_2</span></div>
                            <div class="dc-info"><div class="dc-name">Bill of Materials</div><div class="dc-desc">Infrastructure cost estimation</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">rocket_launch</span></div>
                            <div class="dc-info"><div class="dc-name">Implementation Plan</div><div class="dc-desc">Sprint plan & milestones</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                    </div>
                </div>

                <!-- ACTION BAR -->
                <div class="action-bar">
                    <button class="act-btn ab-primary" onclick="handleAction('run-pipeline')"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">play_arrow</span> Run Pipeline</button>
                    <button class="act-btn ab-secondary" onclick="handleAction('pause-pipeline')"><span class="material-symbols-outlined">pause</span> Pause</button>
                    <button class="act-btn ab-secondary" onclick="handleAction('export')"><span class="material-symbols-outlined">ios_share</span> Export</button>
                    <button class="act-btn ab-secondary" onclick="handleAction('open-editor')"><span class="material-symbols-outlined">edit_note</span> Open Editor</button>
                    <button class="act-btn ab-danger" onclick="handleAction('stop-pipeline')"><span class="material-symbols-outlined">stop</span> Stop</button>
                    <button class="act-btn ab-new" onclick="handleAction('new-project')" style="margin-left:auto"><span class="material-symbols-outlined">add</span> New Workflow</button>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c,d){vscode.postMessage(d?{command:c,doc:d}:{command:c})}
            </script>
        </body>
        </html>`;
    }
}

// ==================== NEW WORKFLOW MODAL ====================

class NewWorkflowModal {
    public static currentPanel: NewWorkflowModal | undefined;
    private _panel: vscode.WebviewPanel;
    private static _onCreate: ((name: string) => void) | undefined;

    public static setOnCreate(cb: (name: string) => void) { NewWorkflowModal._onCreate = cb; }

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        panel.webview.html = this._getHtml();
        this._panel.onDidDispose(() => { NewWorkflowModal.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'create':
                    const name = message.name || 'Untitled Workflow';
                    if (NewWorkflowModal._onCreate) NewWorkflowModal._onCreate(name);
                    this._panel.dispose();
                    vscode.window.showInformationMessage('Workflow "' + name + '" created!');
                    break;
                case 'cancel':
                    this._panel.dispose();
                    break;
                case 'browse':
                    vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true }).then(uris => {
                        if (uris && uris.length > 0) this._panel.webview.postMessage({ command: 'update-path', value: uris[0].fsPath });
                    });
                    break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri) {
        if (NewWorkflowModal.currentPanel) { NewWorkflowModal.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-new-workflow', 'Create New Workflow', vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: false, localResourceRoots: [extensionUri]
        });
        NewWorkflowModal.currentPanel = new NewWorkflowModal(panel);
    }

    private _getHtml(): string {
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Create New Workflow</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;font-family:'Material Symbols Outlined'}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;align-items:center;justify-content:center}
                .overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px}
                .modal{width:100%;max-width:680px;background:rgba(53,53,53,.85);backdrop-filter:blur(20px);border-radius:12px;border:1px solid rgba(64,71,82,.15);box-shadow:0 16px 48px rgba(0,0,0,.5);overflow:hidden;display:flex;flex-direction:column}
                .modal-header{padding:32px 32px 24px;border-bottom:1px solid rgba(64,71,82,.1)}
                .modal-header h2{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;color:#e5e2e1;letter-spacing:-.02em}
                .modal-header p{font-size:.8125rem;color:#C0C7D4;margin-top:6px}
                .modal-body{padding:28px 32px;display:flex;flex-direction:column;gap:24px;overflow-y:auto;max-height:60vh}
                .field-group{display:flex;flex-direction:column;gap:8px}
                .field-label{font-family:'Space Grotesk',sans-serif;font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#A3C9FF}
                .field-input{width:100%;background:rgba(14,14,14,.8);border:1px solid rgba(64,71,82,.2);color:#e5e2e1;font-family:'Inter',sans-serif;font-size:.8125rem;padding:12px 16px;border-radius:6px;outline:none;transition:border-color .15s ease}
                .field-input:focus{border-color:rgba(163,201,255,.5)}
                .field-input::placeholder{color:#8a919e}
                textarea.field-input{resize:vertical;min-height:90px;line-height:1.6}
                .type-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
                .type-card{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 12px;background:rgba(14,14,14,.8);border:1px solid rgba(64,71,82,.2);border-radius:8px;cursor:pointer;transition:all .15s ease;text-align:center;gap:8px}
                .type-card:hover{background:rgba(53,53,53,.6);border-color:rgba(64,71,82,.4)}
                .type-card.selected{border-color:#A3C9FF;background:rgba(163,201,255,.06)}
                .type-card .material-symbols-outlined{font-size:24px;color:#C0C7D4}
                .type-card.selected .material-symbols-outlined{color:#A3C9FF}
                .type-card-name{font-size:.75rem;font-weight:600;color:#e5e2e1}
                .type-card-sub{font-size:.5625rem;color:#8a919e}
                .select-row{display:flex;gap:12px;align-items:flex-end}
                .select-row .field-group{flex:1}
                .field-select{width:100%;background:rgba(14,14,14,.8);border:1px solid rgba(64,71,82,.2);color:#e5e2e1;font-family:'Inter',sans-serif;font-size:.8125rem;padding:12px 16px;border-radius:6px;outline:none;appearance:none;cursor:pointer}
                .field-select:focus{border-color:rgba(163,201,255,.5)}
                .toggle-row{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(14,14,14,.8);border:1px solid rgba(64,71,82,.2);border-radius:6px}
                .toggle-label{font-size:.8125rem;color:#C0C7D4}
                .toggle-switch{width:36px;height:20px;border-radius:9999px;background:#353535;position:relative;cursor:pointer;transition:background .15s ease;flex-shrink:0}
                .toggle-switch.on{background:#0078D4}
                .toggle-knob{width:16px;height:16px;border-radius:50%;background:#e5e2e1;position:absolute;top:2px;left:2px;transition:left .15s ease}
                .toggle-switch.on .toggle-knob{left:18px}
                .modal-footer{padding:20px 32px;border-top:1px solid rgba(64,71,82,.1);display:flex;justify-content:flex-end;gap:12px}
                .btn{padding:10px 24px;font-family:'Inter',sans-serif;font-size:.8125rem;font-weight:600;border:none;border-radius:6px;cursor:pointer;transition:all .15s ease;display:flex;align-items:center;gap:8px}
                .btn:active{transform:scale(.97)}
                .btn-ghost{background:transparent;color:#C0C7D4;border:1px solid rgba(64,71,82,.2)}
                .btn-ghost:hover{background:rgba(53,53,53,.5);color:#e5e2e1}
                .btn-primary{background:linear-gradient(180deg,#A3C9FF,#0078D4);color:#fff;box-shadow:0 4px 12px rgba(0,120,212,.3)}
                .btn-primary:hover{filter:brightness(1.1)}
                .btn .material-symbols-outlined{font-size:18px}
            </style>
        </head>
        <body>
            <div class="overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h2>Create New Workflow</h2>
                        <p>Set up a new AI-powered SDLC generation pipeline</p>
                    </div>
                    <div class="modal-body">
                        <div class="field-group">
                            <label class="field-label">Workflow Name</label>
                            <input class="field-input" type="text" id="wf-name" placeholder="e.g. E-Commerce Re-platform" value="">
                        </div>
                        <div class="field-group">
                            <label class="field-label">Description</label>
                            <textarea class="field-input" id="wf-desc" placeholder="Describe the project scope, goals, and any specific requirements..."></textarea>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Project Type</label>
                            <div class="type-grid">
                                <div class="type-card selected" onclick="selectType(this)"><span class="material-symbols-outlined">shopping_cart</span><span class="type-card-name">E-Commerce</span><span class="type-card-sub">Retail & Marketplace</span></div>
                                <div class="type-card" onclick="selectType(this)"><span class="material-symbols-outlined">account_balance</span><span class="type-card-name">FinTech</span><span class="type-card-sub">Finance & Banking</span></div>
                                <div class="type-card" onclick="selectType(this)"><span class="material-symbols-outlined">local_hospital</span><span class="type-card-name">Healthcare</span><span class="type-card-sub">Medical & HIPAA</span></div>
                                <div class="type-card" onclick="selectType(this)"><span class="material-symbols-outlined">school</span><span class="type-card-name">EdTech</span><span class="type-card-sub">Learning & LMS</span></div>
                            </div>
                        </div>
                        <div class="select-row">
                            <div class="field-group">
                                <label class="field-label">AI Model</label>
                                <select class="field-select" id="wf-model">
                                    <option>Llama 3 (8B)</option>
                                    <option>Mistral (7B)</option>
                                    <option selected>Codellama (13B)</option>
                                    <option>GPT-4o-mini</option>
                                    <option>Claude 3.5 Haiku</option>
                                </select>
                            </div>
                            <div class="field-group">
                                <label class="field-label">Priority</label>
                                <select class="field-select" id="wf-priority">
                                    <option>Normal</option>
                                    <option selected>High</option>
                                    <option>Critical</option>
                                </select>
                            </div>
                        </div>
                        <div class="toggle-row" onclick="toggleSwitch(this)">
                            <span class="toggle-label">Enable auto-generation on creation</span>
                            <div class="toggle-switch on"><div class="toggle-knob"></div></div>
                        </div>
                        <div class="toggle-row" onclick="toggleSwitch(this)">
                            <span class="toggle-label">Use Genesis Agent for interactive mode</span>
                            <div class="toggle-switch on"><div class="toggle-knob"></div></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-ghost" onclick="handleAction('cancel')">Cancel</button>
                        <button class="btn btn-primary" onclick="handleCreate()"><span class="material-symbols-outlined">add_circle</span> Create Workflow</button>
                    </div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c){vscode.postMessage({command:c})}
                function handleCreate(){
                    var name=document.getElementById('wf-name').value.trim()||'Untitled Workflow';
                    vscode.postMessage({command:'create',name:name});
                }
                function selectType(el){document.querySelectorAll('.type-card').forEach(c=>c.classList.remove('selected'));el.classList.add('selected')}
                function toggleSwitch(el){var t=el.querySelector('.toggle-switch');if(t)t.classList.toggle('on')}
            </script>
        </body>
        </html>`;
    }
}

// ==================== DOCUMENT PREVIEW PANEL ====================

class DocumentPreviewPanel {
    public static currentPanel: DocumentPreviewPanel | undefined;
    private _panel: vscode.WebviewPanel;
    private static _onBack: (() => void) | undefined;
    private static _onExport: ((name: string) => void) | undefined;
    private static _onViewDocument: ((wfName: string, docName: string) => void) | undefined;

    public static setOnBack(cb: () => void) { DocumentPreviewPanel._onBack = cb; }
    public static setOnExport(cb: (name: string) => void) { DocumentPreviewPanel._onExport = cb; }
    public static setOnViewDocument(cb: (wfName: string, docName: string) => void) { DocumentPreviewPanel._onViewDocument = cb; }

    private constructor(panel: vscode.WebviewPanel, wfName: string, docName: string) {
        this._panel = panel;
        panel.webview.html = this._getHtml(wfName, docName);
        this._panel.onDidDispose(() => { DocumentPreviewPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'back': this._panel.dispose(); break;
                case 'view-document': if (DocumentPreviewPanel._onViewDocument) DocumentPreviewPanel._onViewDocument(wfName, message.doc); break;
                case 'export': if (DocumentPreviewPanel._onExport) DocumentPreviewPanel._onExport(wfName); break;
                case 'open-editor': vscode.window.showInformationMessage('Opening in editor...'); break;
                case 'regenerate': vscode.window.showInformationMessage('Regenerating document with latest AI model...'); break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri, wfName: string, docName: string) {
        if (DocumentPreviewPanel.currentPanel) { DocumentPreviewPanel.currentPanel._panel.dispose(); }
        const panel = vscode.window.createWebviewPanel('genesis-doc-preview', docName, vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        DocumentPreviewPanel.currentPanel = new DocumentPreviewPanel(panel, wfName, docName);
    }

    private _getHtml(wfName: string, activeDoc: string): string {
        const tabs = [
            { name: 'Vision & Strategy', icon: 'lightbulb', status: 'done' },
            { name: 'User Personas', icon: 'groups', status: 'done' },
            { name: 'Product Roadmap', icon: 'map', status: 'done' },
            { name: 'GTM Strategy', icon: 'trending_up', status: 'done' },
            { name: 'Strategic Use Cases', icon: 'account_tree', status: 'active' },
            { name: 'UI Flows & Navigation', icon: 'route', status: 'active' },
            { name: 'Synthetic Data Schema', icon: 'dataset', status: 'pending' },
            { name: 'Product Requirements Doc', icon: 'description', status: 'pending' },
            { name: 'Technical Architecture', icon: 'architecture', status: 'pending' },
            { name: 'Database Design', icon: 'database', status: 'pending' },
            { name: 'API Specifications', icon: 'api', status: 'pending' },
            { name: 'Security Specification', icon: 'security', status: 'pending' },
            { name: 'Testing Strategy', icon: 'bug_report', status: 'pending' },
            { name: 'DevOps & Infrastructure', icon: 'cloud', status: 'pending' },
            { name: 'Interactive Mockup', icon: 'layers', status: 'pending' },
            { name: 'Brand Style Guide', icon: 'palette', status: 'pending' },
            { name: 'Business Requirements', icon: 'business_center', status: 'pending' },
            { name: 'Functional Requirements', icon: 'fact_check', status: 'pending' },
            { name: 'Bill of Materials', icon: 'inventory_2', status: 'pending' },
            { name: 'Implementation Plan', icon: 'rocket_launch', status: 'pending' },
        ];
        const tabHtml = tabs.map(t =>
            `<div class="doc-tab ${t.name === activeDoc ? 'active' : ''}" onclick="handleAction('view-document','${t.name}')">${t.name}${t.status === 'active' ? '<span class="tab-spinner"></span>' : t.status === 'done' ? ' ✓' : ''}</div>`
        ).join('');

        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${activeDoc}</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;font-family:'Material Symbols Outlined'}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;flex-direction:column}
                ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}

                /* HEADER BAR */
                .topbar{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:44px;background:#131313;border-bottom:1px solid rgba(64,71,82,.1);flex-shrink:0}
                .topbar-left{display:flex;align-items:center;gap:16px}
                .back-btn{display:flex;align-items:center;gap:6px;padding:6px 12px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .back-btn:hover{background:#353535;color:#e5e2e1}
                .back-btn .material-symbols-outlined{font-size:16px}
                .topbar-title{font-family:'Space Grotesk',sans-serif;font-size:.8125rem;font-weight:700;color:#A3C9FF}
                .topbar-right{display:flex;align-items:center;gap:6px}
                .tb-btn{display:flex;align-items:center;gap:6px;padding:6px 14px;background:#2a2a2a;border:none;border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .tb-btn:hover{background:#353535;color:#e5e2e1}
                .tb-btn .material-symbols-outlined{font-size:14px}
                .tb-btn.tb-accent{background:rgba(163,201,255,.1);color:#A3C9FF;border:1px solid rgba(163,201,255,.2)}
                .tb-btn.tb-accent:hover{background:rgba(163,201,255,.15)}

                /* TABS */
                .tabs-bar{display:flex;align-items:center;background:#1B1B1C;height:40px;padding:0 16px;gap:0;border-bottom:1px solid rgba(64,71,82,.1);flex-shrink:0;overflow-x:auto}
                .doc-tab{padding:10px 16px;font-size:.6875rem;font-weight:500;color:#C0C7D4;cursor:pointer;transition:all .15s ease;border-bottom:2px solid transparent;white-space:nowrap;display:flex;align-items:center;gap:8px}
                .doc-tab:hover{color:#e5e2e1;background:rgba(53,53,53,.3)}
                .doc-tab.active{color:#A3C9FF;border-bottom-color:#A3C9FF;background:#202020}
                .tab-spinner{width:8px;height:8px;border-radius:50%;background:#A3C9FF;animation:blink 2s infinite}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}

                /* CONTEXT TOOLBAR */
                .ctx-toolbar{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:#131313;border-bottom:1px solid rgba(64,71,82,.05);flex-shrink:0}
                .ctx-breadcrumb{display:flex;align-items:center;gap:6px;font-size:.6875rem;color:#8a919e}
                .ctx-breadcrumb span{color:#C0C7D4}
                .ctx-actions{display:flex;gap:6px}

                /* DOCUMENT CONTENT */
                .doc-content{flex:1;overflow-y:auto;background:#131313;padding:40px 0;display:flex;justify-content:center}
                .doc-paper{max-width:720px;width:100%;background:#1E1E1E;padding:48px;box-shadow:0 8px 32px rgba(0,0,0,.4);border-radius:2px;border:1px solid rgba(64,71,82,.05);margin:0 20px 40px}
                .doc-paper h1{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:2rem;margin-bottom:1.5rem;color:#e5e2e1;letter-spacing:-.02em;line-height:1.2}
                .doc-paper h2{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1.375rem;margin-top:2rem;margin-bottom:1rem;color:#A3C9FF;border-bottom:1px solid rgba(64,71,82,.15);padding-bottom:.5rem}
                .doc-paper h3{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1rem;margin-top:1.5rem;margin-bottom:.75rem;color:#e5e2e1}
                .doc-paper p{line-height:1.7;color:#C0C7D4;margin-bottom:1rem;font-size:.875rem}
                .doc-paper ul{list-style:none;padding-left:0;margin-bottom:1.5rem}
                .doc-paper li{position:relative;padding-left:1.5rem;margin-bottom:.5rem;color:#C0C7D4;font-size:.875rem;line-height:1.6}
                .doc-paper li::before{content:'';position:absolute;left:0;top:.625rem;width:.5rem;height:1px;background:#A3C9FF}
                .code-block{font-family:'Fira Code',monospace;background:#0E0E0E;border-radius:4px;padding:16px;margin:1.5rem 0;font-size:.8125rem;border:1px solid rgba(64,71,82,.15);color:#A3C9FF;overflow-x:auto;position:relative}
                .code-block .code-lang{position:absolute;top:8px;right:12px;font-size:.5rem;color:#8a919e;text-transform:uppercase;letter-spacing:.1em}
                .flow-diagram{margin:2rem 0;padding:24px;background:#0E0E0E;border-radius:8px;border:1px solid rgba(64,71,82,.1)}
                .flow-node{padding:12px 24px;border:1px solid #0078D4;border-radius:4px;text-align:center;font-family:'Fira Code',monospace;font-size:.75rem;color:#A3C9FF;margin:0 auto;width:fit-content}
                .flow-node.primary-node{background:rgba(163,201,255,.08);border-color:#A3C9FF}
                .flow-arrow{text-align:center;color:#0078D4;padding:8px 0}
                .flow-grid{display:flex;gap:16px;justify-content:center;padding:8px 0}
                .flow-grid .flow-node{width:120px;padding:10px 8px;font-size:.625rem;background:#2a2a2a;border-color:rgba(64,71,82,.3);color:#C0C7D4}

                /* FOOTER */
                .doc-footer{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:28px;background:#0E0E0E;border-top:1px solid rgba(64,71,82,.1);font-family:'Fira Code',monospace;font-size:.5625rem;color:#8a919e;text-transform:uppercase;letter-spacing:.08em;flex-shrink:0}
                .footer-left{display:flex;align-items:center;gap:16px}
                .footer-right{display:flex;align-items:center;gap:12px}
            </style>
        </head>
        <body>
            <!-- TOP BAR -->
            <div class="topbar">
                <div class="topbar-left">
                    <button class="back-btn" onclick="handleAction('back')"><span class="material-symbols-outlined">arrow_back</span> Back</button>
                    <span class="topbar-title">${activeDoc}</span>
                </div>
                <div class="topbar-right">
                    <div style="display:flex;align-items:center;gap:2px;margin-right:8px">
                        <div style="width:6px;height:6px;border-radius:50%;background:#61dac1;box-shadow:0 0 6px rgba(97,218,193,.5)"></div>
                        <span style="font-size:.5625rem;color:#61dac1;font-weight:700;text-transform:uppercase">Live</span>
                    </div>
                    <button class="tb-btn" onclick="handleAction('open-editor')"><span class="material-symbols-outlined">edit</span> Open in Editor</button>
                    <button class="tb-btn" onclick="handleAction('export')"><span class="material-symbols-outlined">download</span> Export</button>
                    <button class="tb-btn tb-accent" onclick="handleAction('regenerate')"><span class="material-symbols-outlined">refresh</span> Regenerate</button>
                </div>
            </div>

            <!-- TABS -->
            <div class="tabs-bar">${tabHtml}</div>

            <!-- CONTEXT TOOLBAR -->
            <div class="ctx-toolbar">
                <div class="ctx-breadcrumb">
                    <span class="material-symbols-outlined" style="font-size:14px">folder_open</span>
                    <span>Projects</span> / <span>${wfName}</span> / <span style="color:#A3C9FF">${activeDoc}</span>
                </div>
            </div>

            <!-- DOCUMENT CONTENT -->
            <div class="doc-content">
                <div class="doc-paper">
                    <h1>Vision & Strategy - ${wfName}</h1>
                    <h2>1. Executive Summary</h2>
                    <p>This document outlines the migration of the legacy monolith architecture to a distributed ecosystem. The strategic goal is to reduce technical debt while increasing market responsiveness by 40% over the next two fiscal quarters.</p>
                    <h3>1.1 Goals</h3>
                    <ul>
                        <li>High availability (99.99% uptime) with zero-downtime deployments</li>
                        <li>API-first architecture for omnichannel expansion</li>
                        <li>Automated CI/CD pipelines with Genesis AI integration</li>
                        <li>Event-driven communication using message brokers</li>
                    </ul>
                    <h2>2. System Architecture</h2>
                    <p>The transition utilizes a strangler fig pattern to slowly decouple modules without interrupting existing revenue streams. The architecture follows Domain-Driven Design principles.</p>
                    <div class="flow-diagram">
                        <div class="flow-node primary-node">Client (Web/App)</div>
                        <div class="flow-arrow"><span class="material-symbols-outlined">arrow_downward</span></div>
                        <div class="flow-node" style="border-color:#0078D4;background:rgba(0,120,212,.08)">API Gateway</div>
                        <div class="flow-grid">
                            <div class="flow-node">Auth Service</div>
                            <div class="flow-node">Cart Service</div>
                            <div class="flow-node">Search Service</div>
                        </div>
                    </div>
                    <h2>3. Technical Configuration</h2>
                    <p>The infrastructure configuration is defined declaratively using Terraform modules for reproducible deployments across environments.</p>
                    <div class="code-block">
                        <span class="code-lang">json</span>
<pre>{
  "project": "${wfName}",
  "arch": "microservices",
  "deployment": {
    "provider": "Genesis Cloud",
    "region": "us-east-1",
    "scaling": "auto"
  },
  "services": ["auth", "cart", "catalog", "order"],
  "security": "OAuth2-OIDC"
}</pre>
                    </div>
                    <h2>4. Success Metrics</h2>
                    <ul>
                        <li>Reduce deployment time from 4 hours to 15 minutes</li>
                        <li>Achieve 99.99% uptime SLA across all critical services</li>
                        <li>Improve developer productivity by 35% through AI-assisted SDLC</li>
                        <li>Maintain PCI-DSS compliance throughout migration</li>
                    </ul>
                </div>
            </div>

            <!-- FOOTER -->
            <div class="doc-footer">
                <div class="footer-left">
                    <span>v1.0.4 - Connected to Genesis Cloud</span>
                </div>
                <div class="footer-right">
                    <span>1,240 Words</span>
                    <span>|</span>
                    <span>4 Sections</span>
                    <span>|</span>
                    <span><span class="material-symbols-outlined" style="font-size:10px;vertical-align:middle">schedule</span> Generated: 2 mins ago</span>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c,d){vscode.postMessage(d?{command:c,doc:d}:{command:c})}
            </script>
        </body>
        </html>`;
    }
}

// ==================== WORKFLOW EDITOR PANEL ====================

class WorkflowEditorPanel {
    public static currentPanel: WorkflowEditorPanel | undefined;
    private _panel: vscode.WebviewPanel;
    private static _onViewDocument: ((wfName: string, docName: string) => void) | undefined;
    private static _onExport: ((name: string) => void) | undefined;

    public static setOnViewDocument(cb: (wfName: string, docName: string) => void) { WorkflowEditorPanel._onViewDocument = cb; }
    public static setOnExport(cb: (name: string) => void) { WorkflowEditorPanel._onExport = cb; }

    private constructor(panel: vscode.WebviewPanel, name: string) {
        this._panel = panel;
        panel.webview.html = this._getHtml(name);
        this._panel.onDidDispose(() => { WorkflowEditorPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'back': this._panel.dispose(); break;
                case 'view-document': if (WorkflowEditorPanel._onViewDocument) WorkflowEditorPanel._onViewDocument(name, message.doc); break;
                case 'export': if (WorkflowEditorPanel._onExport) WorkflowEditorPanel._onExport(name); break;
                case 'run': vscode.window.showInformationMessage('Pipeline started for ' + name); break;
                case 'save': vscode.window.showInformationMessage('Workflow saved!'); break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri, name: string) {
        if (WorkflowEditorPanel.currentPanel) { WorkflowEditorPanel.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-workflow-editor', 'Editor: ' + name, vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        WorkflowEditorPanel.currentPanel = new WorkflowEditorPanel(panel, name);
    }

    private _getHtml(name: string): string {
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Editor - ${name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;font-family:'Material Symbols Outlined'}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;flex-direction:column;overflow:hidden}
                ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}

                /* BREADCRUMB HEADER */
                .breadcrumb-bar{height:56px;border-bottom:1px solid rgba(64,71,82,.1);display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:#1B1B1C;flex-shrink:0}
                .bc-left{display:flex;align-items:center;gap:16px}
                .bc-back{display:flex;align-items:center;gap:6px;padding:6px 12px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .bc-back:hover{background:#353535;color:#e5e2e1}
                .bc-back .material-symbols-outlined{font-size:16px}
                .bc-path{display:flex;align-items:center;gap:6px;font-size:.6875rem;font-weight:600;color:#C0C7D4;text-transform:uppercase;letter-spacing:.08em}
                .bc-path span{color:#8a919e}
                .bc-path .bc-active{color:#A3C9FF}
                .bc-editable{display:flex;align-items:center;gap:6px}
                .bc-editable input{background:transparent;border:none;outline:none;color:#e5e2e1;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.8125rem;width:280px}
                .bc-editable .material-symbols-outlined{font-size:14px;color:#8a919e}
                .bc-right{display:flex;align-items:center;gap:8px}
                .btn-run{display:flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(180deg,#A3C9FF,#0078D4);border:none;border-radius:6px;color:#fff;font-size:.6875rem;font-weight:700;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif;box-shadow:0 4px 12px rgba(0,120,212,.3)}
                .btn-run:hover{filter:brightness(1.1)}
                .btn-run:active{transform:scale(.97)}
                .btn-run .material-symbols-outlined{font-size:14px}
                .btn-sec{display:flex;align-items:center;gap:6px;padding:8px 16px;background:#2a2a2a;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:700;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .btn-sec:hover{background:#353535;color:#e5e2e1}
                .btn-sec .material-symbols-outlined{font-size:14px}

                /* SPLIT LAYOUT */
                .split{flex:1;display:flex;overflow:hidden}

                /* LEFT PANEL */
                .left-panel{width:50%;display:flex;flex-direction:column;border-right:1px solid rgba(64,71,82,.1);background:#131313}
                .panel-tabs{display:flex;border-bottom:1px solid rgba(64,71,82,.1)}
                .panel-tab{padding:12px 24px;font-size:.6875rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;color:#C0C7D4;transition:all .15s ease;display:flex;align-items:center;gap:8px}
                .panel-tab.active{color:#A3C9FF;border-bottom-color:#A3C9FF;background:#131313}
                .panel-tab:hover{color:#e5e2e1}
                .panel-tab .material-symbols-outlined{font-size:14px}
                .input-area{flex:1;padding:20px;display:flex;flex-direction:column;gap:12px}
                .input-area textarea{flex:1;background:#0E0E0E;border:1px solid rgba(64,71,82,.1);border-radius:8px;padding:20px;font-family:'Fira Code',monospace;font-size:.8125rem;line-height:1.7;color:#C0C7D4;resize:none;outline:none;transition:border-color .15s ease}
                .input-area textarea:focus{border-color:rgba(163,201,255,.3)}
                .input-actions{display:flex;align-items:center;justify-content:space-between}
                .input-actions-left{display:flex;gap:8px}
                .ia-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;background:#2a2a2a;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .ia-btn:hover{background:#353535;color:#e5e2e1}
                .ia-btn .material-symbols-outlined{font-size:14px}

                /* RIGHT PANEL */
                .right-panel{width:50%;display:flex;flex-direction:column;background:#0E0E0E}
                .right-header{padding:14px 24px;border-bottom:1px solid rgba(64,71,82,.1);display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
                .right-header h3{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.2em;color:#8a919e}
                .right-header h3 span{color:#A3C9FF}
                .doc-dots{display:flex;gap:4px}
                .doc-dot{width:6px;height:6px;border-radius:50%}
                .dd-done{background:#61dac1}
                .dd-active{background:#A3C9FF;animation:blink 2s infinite}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                .dd-pending{background:rgba(64,71,82,.3)}
                .right-content{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:10px}

                /* DOCUMENT CARDS */
                .doc-card{display:flex;align-items:center;justify-content:space-between;padding:16px;background:#202020;border:1px solid rgba(64,71,82,.1);border-radius:10px;cursor:pointer;transition:all .15s ease}
                .doc-card:hover{border-color:rgba(97,218,193,.3);background:#252525}
                .doc-card.active{border-color:rgba(163,201,255,.4);background:rgba(163,201,255,.04);box-shadow:0 4px 16px rgba(163,201,255,.08)}
                .doc-card.pending{opacity:.6;border-style:dashed}
                .dc-left{display:flex;align-items:center;gap:14px}
                .dc-icon{width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .dc-icon .material-symbols-outlined{font-size:18px}
                .di-done{background:rgba(97,218,193,.12);color:#61dac1}
                .di-active{background:rgba(163,201,255,.12);color:#A3C9FF}
                .di-pending{background:#353535;color:#8a919e}
                .dc-info h4{font-size:.8125rem;font-weight:600;color:#e5e2e1}
                .dc-info p{font-size:.6875rem;color:#8a919e;margin-top:2px}
                .doc-card.active .dc-info p{color:rgba(163,201,255,.8)}
                .dc-right{display:flex;align-items:center;gap:10px}
                .dc-status{font-family:'Fira Code',monospace;font-size:.5625rem;text-transform:uppercase;font-weight:700}
                .dc-status.green{color:#61dac1}
                .dc-status.blue{color:#A3C9FF;animation:blink 2s infinite}
                .dc-status.gray{color:#8a919e}
                .dc-check{color:#61dac1;font-size:18px}
                .dc-spinner{width:18px;height:18px;border:2px solid #A3C9FF;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}
                @keyframes spin{to{transform:rotate(360deg)}}
                .dc-pending-icon{color:#8a919e;font-size:18px}
            </style>
        </head>
        <body>
            <!-- BREADCRUMB BAR -->
            <div class="breadcrumb-bar">
                <div class="bc-left">
                    <button class="bc-back" onclick="handleAction('back')"><span class="material-symbols-outlined">arrow_back</span> Back</button>
                    <div class="bc-path"><span>Projects</span> / <span class="bc-active">${name}</span></div>
                    <div style="width:1px;height:16px;background:rgba(64,71,82,.2)"></div>
                    <div class="bc-editable">
                        <input type="text" value="Workflow: ${name}">
                        <span class="material-symbols-outlined">edit</span>
                    </div>
                </div>
                <div class="bc-right">
                    <button class="btn-run" onclick="handleAction('run')"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">play_arrow</span> Run</button>
                    <button class="btn-sec" onclick="handleAction('save')"><span class="material-symbols-outlined">save</span> Save</button>
                    <button class="btn-sec" onclick="handleAction('export')"><span class="material-symbols-outlined">ios_share</span> Export</button>
                </div>
            </div>

            <!-- SPLIT LAYOUT -->
            <div class="split">
                <!-- LEFT: INPUT -->
                <div class="left-panel">
                    <div class="panel-tabs">
                        <div class="panel-tab active"><span class="material-symbols-outlined">subject</span> Text Input</div>
                        <div class="panel-tab"><span class="material-symbols-outlined">upload_file</span> Upload Document</div>
                    </div>
                    <div class="input-area">
                        <textarea placeholder="Describe your workflow logic here...">Rewrite legacy PHP monolith to microservices.
Ensure event-driven architecture using Kafka.
Target GCP Cloud Run for deployment.
Apply Domain Driven Design (DDD) principles.

Required Outputs:
1. System Context Diagram
2. Data Flow Analysis
3. Infrastructure as Code (Terraform) templates
4. API Gateway Configuration
5. Service Mesh Networking</textarea>
                        <div class="input-actions">
                            <div class="input-actions-left">
                                <button class="ia-btn"><span class="material-symbols-outlined">attach_file</span> Attach File</button>
                                <button class="ia-btn"><span class="material-symbols-outlined">delete_sweep</span> Clear</button>
                            </div>
                            <button class="ia-btn"><span class="material-symbols-outlined">auto_awesome_motion</span> Templates</button>
                        </div>
                    </div>
                </div>

                <!-- RIGHT: DOCUMENTS -->
                <div class="right-panel">
                    <div class="right-header">
                        <h3>Documents <span>(4/20)</span></h3>
                        <div class="doc-dots"><div class="doc-dot dd-done"></div><div class="doc-dot dd-done"></div><div class="doc-dot dd-done"></div><div class="doc-dot dd-done"></div><div class="doc-dot dd-active"></div><div class="doc-dot dd-active"></div><div class="doc-dot dd-pending"></div></div>
                    </div>
                    <div class="right-content">
                        <div class="doc-card" onclick="handleAction('view-document','Vision & Strategy')">
                            <div class="dc-left">
                                <div class="dc-icon di-done"><span class="material-symbols-outlined">lightbulb</span></div>
                                <div class="dc-info"><h4>Vision & Strategy</h4><p>Strategic alignment & business goals</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status green">Done</span><span class="material-symbols-outlined dc-check" style="font-variation-settings:'FILL' 1">check_circle</span></div>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','User Personas')">
                            <div class="dc-left">
                                <div class="dc-icon di-done"><span class="material-symbols-outlined">groups</span></div>
                                <div class="dc-info"><h4>User Personas</h4><p>Target audience definitions</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status green">Done</span><span class="material-symbols-outlined dc-check" style="font-variation-settings:'FILL' 1">check_circle</span></div>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','Product Roadmap')">
                            <div class="dc-left">
                                <div class="dc-icon di-done"><span class="material-symbols-outlined">map</span></div>
                                <div class="dc-info"><h4>Product Roadmap</h4><p>Phase-wise delivery plan</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status green">Done</span><span class="material-symbols-outlined dc-check" style="font-variation-settings:'FILL' 1">check_circle</span></div>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','GTM Strategy')">
                            <div class="dc-left">
                                <div class="dc-icon di-done"><span class="material-symbols-outlined">trending_up</span></div>
                                <div class="dc-info"><h4>GTM Strategy</h4><p>Go-to-market positioning</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status green">Done</span><span class="material-symbols-outlined dc-check" style="font-variation-settings:'FILL' 1">check_circle</span></div>
                        </div>
                        <div class="doc-card active" onclick="handleAction('view-document','Strategic Use Cases')">
                            <div class="dc-left">
                                <div class="dc-icon di-active"><span class="material-symbols-outlined">account_tree</span></div>
                                <div class="dc-info"><h4>Strategic Use Cases</h4><p>Generating functional requirements...</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status blue">Running</span><div class="dc-spinner"></div></div>
                        </div>
                        <div class="doc-card active" onclick="handleAction('view-document','UI Flows & Navigation')">
                            <div class="dc-left">
                                <div class="dc-icon di-active"><span class="material-symbols-outlined">route</span></div>
                                <div class="dc-info"><h4>UI Flows & Navigation</h4><p>Generating navigation flows...</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status blue">Running</span><div class="dc-spinner"></div></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">dataset</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Synthetic Data Schema</h4><p>Data models & relationships</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">description</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Product Requirements Doc</h4><p>PRD with feature specifications</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">architecture</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Technical Architecture</h4><p>System design & components</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">database</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Database Design</h4><p>Entity relationship diagrams</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">api</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">API Specifications</h4><p>REST/GraphQL endpoint specs</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">security</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Security Specification</h4><p>Auth, encryption & compliance</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">bug_report</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Testing Strategy</h4><p>Test plans & coverage matrix</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">cloud</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">DevOps & Infrastructure</h4><p>CI/CD, containers & hosting</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">layers</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Interactive Mockup</h4><p>Clickable UI prototype</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">palette</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Brand Style Guide</h4><p>Colors, typography & assets</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">business_center</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Business Requirements Doc</h4><p>Stakeholder requirements</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">fact_check</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Functional Requirements</h4><p>Feature-level specifications</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">inventory_2</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Bill of Materials</h4><p>Infrastructure cost estimation</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">rocket_launch</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Implementation Plan</h4><p>Sprint plan & milestones</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                    </div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c,d){vscode.postMessage(d?{command:c,doc:d}:{command:c})}
                document.querySelectorAll('.panel-tab').forEach(tab=>{
                    tab.addEventListener('click',()=>{
                        document.querySelectorAll('.panel-tab').forEach(t=>t.classList.remove('active'));
                        tab.classList.add('active');
                    });
                });
            </script>
        </body>
        </html>`;
    }
}

// ==================== EXPORT DIALOG MODAL ====================

class ExportDialogModal {
    public static currentPanel: ExportDialogModal | undefined;
    private _panel: vscode.WebviewPanel;
    private static _onBack: (() => void) | undefined;

    public static setOnBack(cb: () => void) { ExportDialogModal._onBack = cb; }

    private constructor(panel: vscode.WebviewPanel, wfName: string) {
        this._panel = panel;
        panel.webview.html = this._getHtml(wfName);
        this._panel.onDidDispose(() => { ExportDialogModal.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'cancel': this._panel.dispose(); break;
                case 'export': vscode.window.showInformationMessage('Exporting documents for ' + wfName + '...'); break;
                case 'browse':
                    vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true }).then(uris => {
                        if (uris && uris.length > 0) this._panel.webview.postMessage({ command: 'update-path', value: uris[0].fsPath });
                    });
                    break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri, name: string) {
        if (ExportDialogModal.currentPanel) { ExportDialogModal.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-export', 'Export Documents', vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: false, localResourceRoots: [extensionUri]
        });
        ExportDialogModal.currentPanel = new ExportDialogModal(panel, name);
    }

    private _getHtml(wfName: string): string {
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Export Documents</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;font-family:'Material Symbols Outlined'}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;align-items:center;justify-content:center}
                .overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:24px}
                .modal{width:100%;max-width:640px;background:rgba(53,53,53,.8);backdrop-filter:blur(20px);border-radius:12px;border:1px solid rgba(64,71,82,.15);box-shadow:0 16px 48px rgba(0,0,0,.5);overflow:hidden;display:flex;flex-direction:column}

                /* HEADER */
                .modal-header{padding:32px 32px 24px;border-bottom:1px solid rgba(64,71,82,.1)}
                .modal-header-top{display:flex;justify-content:space-between;align-items:flex-start}
                .modal-header h2{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;color:#e5e2e1;letter-spacing:-.02em}
                .modal-header p{font-size:.8125rem;color:#C0C7D4;margin-top:6px}
                .close-btn{color:#8a919e;cursor:pointer;transition:color .15s ease;background:none;border:none;padding:4px}
                .close-btn:hover{color:#e5e2e1}
                .close-btn .material-symbols-outlined{font-size:20px}

                /* BODY */
                .modal-body{padding:28px 32px;display:flex;flex-direction:column;gap:28px;overflow-y:auto;max-height:55vh}
                .section-label{font-family:'Space Grotesk',sans-serif;font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#A3C9FF;margin-bottom:12px}

                /* FORMAT GRID */
                .format-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
                .format-card{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 12px;background:rgba(14,14,14,.8);border:1px solid rgba(64,71,82,.15);border-radius:6px;cursor:pointer;transition:all .15s ease;gap:8px}
                .format-card:hover{background:rgba(53,53,53,.4)}
                .format-card.selected{border-color:#A3C9FF;background:rgba(163,201,255,.05)}
                .format-card .material-symbols-outlined{font-size:22px;color:#C0C7D4}
                .format-card.selected .material-symbols-outlined{color:#A3C9FF}
                .format-card span{font-size:.6875rem;font-weight:500;color:#e5e2e1}

                /* OUTPUT PATH */
                .path-row{display:flex;gap:8px}
                .path-input{flex:1;background:rgba(14,14,14,.8);padding:10px 16px;border-radius:6px;border:1px solid rgba(64,71,82,.15);display:flex;align-items:center;overflow:hidden}
                .path-input span{font-family:'Fira Code',monospace;font-size:.8125rem;color:#C0C7D4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .browse-btn{padding:10px 16px;background:#2a2a2a;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#e5e2e1;font-size:.8125rem;font-weight:500;cursor:pointer;transition:all .15s ease;display:flex;align-items:center;gap:8px;font-family:'Inter',sans-serif;flex-shrink:0}
                .browse-btn:hover{background:#353535}
                .browse-btn .material-symbols-outlined{font-size:16px}

                /* SELECTION LIST */
                .selection-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
                .selection-header label{display:flex;align-items:center;gap:8px;cursor:pointer}
                .selection-header label span{font-size:.6875rem;font-weight:500;color:#C0C7D4}
                .custom-cb{width:16px;height:16px;border-radius:3px;background:rgba(14,14,14,.8);border:1px solid rgba(64,71,82,.3);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
                .custom-cb.checked{background:#0078D4;border-color:#0078D4}
                .custom-cb.checked::after{content:'✓';font-size:11px;color:#fff}
                .doc-list{background:rgba(14,14,14,.8);border-radius:6px;border:1px solid rgba(64,71,82,.15);overflow:hidden}
                .doc-row{display:flex;align-items:center;gap:14px;padding:12px 16px;transition:background .15s ease;cursor:pointer}
                .doc-row:hover{background:rgba(53,53,53,.3)}
                .doc-row+.doc-row{border-top:1px solid rgba(64,71,82,.08)}
                .doc-row .material-symbols-outlined{font-size:18px;color:#C0C7D4}

                /* FOOTER */
                .modal-footer{padding:24px 32px;border-top:1px solid rgba(64,71,82,.1);display:flex;flex-direction:column;gap:16px}
                .progress-section{}
                .progress-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
                .progress-row span{font-size:.5625rem;font-family:'Fira Code',monospace;text-transform:uppercase;letter-spacing:.1em;color:#8a919e}
                .progress-bar{height:4px;background:#353535;border-radius:9999px;overflow:hidden}
                .progress-fill{height:100%;background:#0078D4;border-radius:9999px;transition:width .5s ease}
                .footer-actions{display:flex;justify-content:flex-end;gap:12px}
                .btn{padding:10px 24px;font-family:'Inter',sans-serif;font-size:.8125rem;font-weight:600;border:none;border-radius:6px;cursor:pointer;transition:all .15s ease;display:flex;align-items:center;gap:8px}
                .btn:active{transform:scale(.97)}
                .btn-ghost{background:transparent;color:#C0C7D4}
                .btn-ghost:hover{color:#e5e2e1;background:rgba(53,53,53,.3)}
                .btn-primary{background:linear-gradient(180deg,#A3C9FF,#0078D4);color:#fff;box-shadow:0 4px 12px rgba(0,120,212,.3)}
                .btn-primary:hover{filter:brightness(1.1)}
                .btn .material-symbols-outlined{font-size:16px}
            </style>
        </head>
        <body>
            <div class="overlay">
                <div class="modal">
                    <div class="modal-header">
                        <div class="modal-header-top">
                            <div>
                                <h2>Export Documents</h2>
                                <p>Select format and source files for the architectural package.</p>
                            </div>
                            <button class="close-btn" onclick="handleAction('cancel')"><span class="material-symbols-outlined">close</span></button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <!-- FORMAT -->
                        <div>
                            <div class="section-label">Export Format</div>
                            <div class="format-grid">
                                <div class="format-card selected" onclick="selectFormat(this)">
                                    <span class="material-symbols-outlined">picture_as_pdf</span><span>PDF</span>
                                </div>
                                <div class="format-card" onclick="selectFormat(this)">
                                    <span class="material-symbols-outlined">markdown</span><span>Markdown</span>
                                </div>
                                <div class="format-card" onclick="selectFormat(this)">
                                    <span class="material-symbols-outlined">html</span><span>HTML</span>
                                </div>
                                <div class="format-card" onclick="selectFormat(this)">
                                    <span class="material-symbols-outlined">library_add_check</span><span>All</span>
                                </div>
                            </div>
                        </div>
                        <!-- OUTPUT PATH -->
                        <div>
                            <div class="section-label">Output Path</div>
                            <div class="path-row">
                                <div class="path-input"><span>/Users/user/Desktop/Genesis_Exports/${wfName}</span></div>
                                <button class="browse-btn" onclick="handleAction('browse')"><span class="material-symbols-outlined">folder_open</span> Browse</button>
                            </div>
                        </div>
                        <!-- SELECTION LIST -->
                        <div>
                            <div class="selection-header">
                                <div class="section-label" style="margin-bottom:0">Selection List</div>
                                <label>
                                    <div class="custom-cb checked" onclick="this.classList.toggle('checked')"></div>
                                    <span>All Documents</span>
                                </label>
                            </div>
                            <div class="doc-list">
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb checked"></div>
                                    <span class="material-symbols-outlined">lightbulb</span>
                                    <span style="font-size:.8125rem;font-weight:500">Vision & Strategy</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb checked"></div>
                                    <span class="material-symbols-outlined">groups</span>
                                    <span style="font-size:.8125rem;font-weight:500">User Personas</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb checked"></div>
                                    <span class="material-symbols-outlined">map</span>
                                    <span style="font-size:.8125rem;font-weight:500">Product Roadmap</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb checked"></div>
                                    <span class="material-symbols-outlined">trending_up</span>
                                    <span style="font-size:.8125rem;font-weight:500">GTM Strategy</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb checked"></div>
                                    <span class="material-symbols-outlined">account_tree</span>
                                    <span style="font-size:.8125rem;font-weight:500">Strategic Use Cases</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">route</span>
                                    <span style="font-size:.8125rem;font-weight:500">UI Flows & Navigation</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">dataset</span>
                                    <span style="font-size:.8125rem;font-weight:500">Synthetic Data Schema</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">description</span>
                                    <span style="font-size:.8125rem;font-weight:500">Product Requirements Document</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">architecture</span>
                                    <span style="font-size:.8125rem;font-weight:500">Technical Architecture</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">database</span>
                                    <span style="font-size:.8125rem;font-weight:500">Database Design</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">api</span>
                                    <span style="font-size:.8125rem;font-weight:500">API Specifications</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">security</span>
                                    <span style="font-size:.8125rem;font-weight:500">Security Specification</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">bug_report</span>
                                    <span style="font-size:.8125rem;font-weight:500">Testing Strategy</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">cloud</span>
                                    <span style="font-size:.8125rem;font-weight:500">DevOps & Infrastructure</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">layers</span>
                                    <span style="font-size:.8125rem;font-weight:500">Interactive Mockup</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">palette</span>
                                    <span style="font-size:.8125rem;font-weight:500">Brand Style Guide</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">business_center</span>
                                    <span style="font-size:.8125rem;font-weight:500">Business Requirements Document</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">fact_check</span>
                                    <span style="font-size:.8125rem;font-weight:500">Functional Requirements</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">inventory_2</span>
                                    <span style="font-size:.8125rem;font-weight:500">Bill of Materials</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">rocket_launch</span>
                                    <span style="font-size:.8125rem;font-weight:500">Implementation Plan</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <div class="progress-section">
                            <div class="progress-row"><span>Export Status</span><span>Waiting...</span></div>
                            <div class="progress-bar"><div class="progress-fill" id="export-progress" style="width:0%"></div></div>
                        </div>
                        <div class="footer-actions">
                            <button class="btn btn-ghost" onclick="handleAction('cancel')">Cancel</button>
                            <button class="btn btn-primary" onclick="startExport()"><span class="material-symbols-outlined">ios_share</span> Export</button>
                        </div>
                    </div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c){vscode.postMessage({command:c})}
                function selectFormat(el){document.querySelectorAll('.format-card').forEach(c=>c.classList.remove('selected'));el.classList.add('selected')}
                function toggleCheck(row){var cb=row.querySelector('.custom-cb');if(cb)cb.classList.toggle('checked')}
                function startExport(){
                    var bar=document.getElementById('export-progress');
                    if(bar){bar.style.width='0%';var p=0;var iv=setInterval(function(){p+=Math.random()*15;if(p>=100){p=100;clearInterval(iv)}bar.style.width=p+'%'},200)}
                    vscode.postMessage({command:'export'});
                }
                window.addEventListener('message',function(e){if(e.data.command==='update-path'){var el=document.querySelector('.path-input span');if(el)el.textContent=e.data.value}});
            </script>
        </body>
        </html>`;
    }
}
