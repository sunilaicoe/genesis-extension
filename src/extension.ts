import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Genesis extension is now active!');

    const sidebarProvider = new SidebarProvider(context.extensionUri, {
        onOpenSettings: () => SettingsPanel.open(context.extensionUri),
        onOpenHome: () => HomePage.open(context.extensionUri),
        onOpenWorkflow: () => WorkflowPanel.open(context.extensionUri),
    });

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('helloWorldSidebarView', sidebarProvider)
    );
}

// ==================== SIDEBAR ====================

interface SidebarCallbacks {
    onOpenSettings: () => void;
    onOpenHome: () => void;
    onOpenWorkflow: () => void;
}

class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'helloWorldSidebarView';
    private _callbacks: SidebarCallbacks;

    constructor(private readonly _extensionUri: vscode.Uri, callbacks: SidebarCallbacks) {
        this._callbacks = callbacks;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
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
                case 'new-project': vscode.window.showInformationMessage('New Project clicked!'); break;
                case 'profile': vscode.window.showInformationMessage('Profile clicked!'); break;
                case 'run-pipeline': vscode.window.showInformationMessage('Run Pipeline clicked!'); break;
                case 'export-all': vscode.window.showInformationMessage('Export All clicked!'); break;
                case 'view-logs': vscode.window.showInformationMessage('View Logs clicked!'); break;
                case 'help': vscode.window.showInformationMessage('Help clicked!'); break;
                case 'status': vscode.window.showInformationMessage('Status clicked!'); break;
            }
        });
    }

    private _getHtmlForWebview(): string {
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
                        <button class="nav-item active" onclick="handleClick('home',this)"><span class="material-symbols-outlined">home</span><span>Home</span></button>
                        <button class="nav-item" onclick="handleClick('workflow',this)"><span class="material-symbols-outlined">account_tree</span><span>My Workflows</span></button>
                        <button class="nav-item" onclick="handleClick('settings',this)"><span class="material-symbols-outlined">settings</span><span>Settings</span></button>
                    </div>
                    <div class="workflow-section">
                        <div class="section-label">Workflows</div>
                        <div class="workflow-item" onclick="handleClick('workflow',this)">
                            <div class="wf-top"><span class="wf-name">E-Commerce Re-platform</span><div class="wf-status-running"></div></div>
                            <div class="wf-bottom"><span>Status: Running</span><span>2h ago</span></div>
                        </div>
                        <div class="workflow-item" onclick="handleClick('workflow',this)">
                            <div class="wf-top"><span class="wf-name">FinTech Wallet API</span><div class="wf-status-completed"><span class="material-symbols-outlined">check_circle</span></div></div>
                            <div class="wf-bottom"><span>Status: Completed</span><span>Yesterday</span></div>
                        </div>
                        <div class="workflow-item" onclick="handleClick('workflow',this)">
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
                function handleClick(command,element){vscode.postMessage({command:command});if(element&&element.classList.contains('nav-item')){document.querySelectorAll('.nav-item').forEach(i=>{i.classList.remove('active')});element.classList.add('active')}}
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

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        panel.webview.html = this._getHtml();
        panel.iconPath = vscode.Uri.joinPath(vscode.Uri.file('/tmp'), 'media', 'icon.svg');
        this._panel.onDidDispose(() => { WorkflowPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'open-workflow': vscode.window.showInformationMessage('Open workflow: ' + message.name); break;
                case 'new-workflow': vscode.window.showInformationMessage('New workflow created!'); break;
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
