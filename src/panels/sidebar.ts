import * as vscode from 'vscode';

// ==================== SIDEBAR ====================

export interface SidebarCallbacks {
    onOpenSettings: () => void;
    onOpenHome: () => void;
    onOpenWorkflow: () => void;
    onOpenWorkflowDetail: (name: string) => void;
    onBackToWorkflows: () => void;
    onNewProject: () => void;
}

export class SidebarProvider implements vscode.WebviewViewProvider {
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
                                This ensures HIPAA/PCI-DSS compliance constraints are captured before technical implementation begins.<br><br>
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
