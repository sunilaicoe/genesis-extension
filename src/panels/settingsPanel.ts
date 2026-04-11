import * as vscode from 'vscode';
import { WorkflowService } from '../services/workflowService';

export class SettingsPanel {
    public static currentPanel: SettingsPanel | undefined;
    private _panel: vscode.WebviewPanel;
    private _service: WorkflowService;
    private _context: vscode.ExtensionContext;

    constructor(panel: vscode.WebviewPanel, service: WorkflowService, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._service = service;
        this._context = context;
        this._update();
        this._panel.onDidDispose(() => { SettingsPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'save-api-key': {
                    const key = (message.apiKey || '').trim();
                    if (!key) { vscode.window.showErrorMessage('Please enter an API key.'); return; }
                    vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Validating API key...', cancellable: false }, async () => {
                        const ok = await this._service.setApiKey(this._context.secrets, key);
                        if (ok) {
                            vscode.window.showInformationMessage('✅ API key validated and saved!');
                            await Promise.all([this._service.fetchUser(), this._service.fetchWorkflows()]);
                            this._update();
                        } else {
                            vscode.window.showErrorMessage('❌ Invalid API key. Please check and try again.');
                        }
                    });
                    break;
                }
                case 'test-connection': {
                    const connected = this._service.isConnected();
                    if (connected) {
                        try {
                            await this._service.fetchUser();
                            vscode.window.showInformationMessage('✅ Connection successful!');
                            this._update();
                        } catch (e: any) {
                            vscode.window.showErrorMessage(`Connection failed: ${e.message}`);
                        }
                    } else {
                        vscode.window.showErrorMessage('No API key configured. Please set your API key first.');
                    }
                    break;
                }
                case 'clear-api-key': {
                    await this._context.secrets.delete('genesis.apiKey');
                    this._service.getApi().setApiKey(this._context.secrets, '');
                    vscode.window.showInformationMessage('API key removed.');
                    this._update();
                    break;
                }
                case 'open-api-keys-page': {
                    vscode.env.openExternal(vscode.Uri.parse('https://jovial-marmot-891.convex.site/home/api-keys'));
                    break;
                }
            }
        });
    }

    public static open(extensionUri: vscode.Uri, service: WorkflowService, context: vscode.ExtensionContext) {
        if (SettingsPanel.currentPanel) { SettingsPanel.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-settings', 'Settings', vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        SettingsPanel.currentPanel = new SettingsPanel(panel, service, context);
    }

    private _update() { this._panel.webview.html = this._getHtml(); }

    private _getHtml(): string {
        const connected = this._service.isConnected();
        const user = this._service.getUserProfile();
        const hasKey = this._service.getApi().isAuthenticated();
        const initials = user?.email ? user.email.split('@')[0].substring(0, 2).toUpperCase() : '?';

        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Genesis Settings</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
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
                .btn{padding:10px 20px;font-family:'Inter',sans-serif;font-size:.75rem;font-weight:600;border:none;border-radius:4px;cursor:pointer;transition:all .15s ease;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap}
                .btn:active{transform:scale(.97)}
                .btn-primary{background:linear-gradient(180deg,#A3C9FF 0%,#0078D4 100%);color:#131313;box-shadow:0 4px 12px rgba(0,120,212,.3)}
                .btn-primary:hover{filter:brightness(1.1)}
                .btn-secondary{background-color:#353535;color:#C0C7D4}
                .btn-secondary:hover{background-color:#404752;color:#e5e2e1}
                .btn-danger{background-color:#93000a;color:#ffdad6}
                .btn-danger:hover{opacity:.9}
                .btn .material-symbols-outlined{font-size:16px}
                .connection-status{display:flex;align-items:center;gap:12px;padding:12px 16px;background-color:#1B1B1C;border-radius:4px;max-width:420px}
                .status-indicator{width:8px;height:8px;border-radius:50%;background-color:#61dac1;box-shadow:0 0 8px rgba(97,218,193,.5)}
                .status-indicator.off{background-color:#ffb4ab;box-shadow:0 0 8px rgba(255,180,171,.5)}
                .status-text{font-size:.75rem;font-weight:500;color:#e5e2e1;flex:1}
                .status-version{font-size:.6875rem;color:#8a919e}
                .user-card{display:flex;align-items:center;gap:14px;padding:16px;background:#1B1B1C;border-radius:6px;max-width:420px}
                .user-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(180deg,#A3C9FF 0%,#0078D4 100%);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#131313;flex-shrink:0}
                .user-details h3{font-size:.875rem;font-weight:600;color:#e5e2e1}
                .user-details p{font-size:.6875rem;color:#C0C7D4;margin-top:2px}
                .role-badge{display:inline-block;padding:2px 8px;background:rgba(163,201,255,.1);color:#A3C9FF;border-radius:9999px;font-size:.5625rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-top:6px}
                .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;max-width:420px}
                .detail-item label{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a919e;display:block;margin-bottom:4px}
                .detail-item span{font-size:.8125rem;color:#C0C7D4;display:block}
                .save-bar{position:sticky;bottom:20px;margin:0 auto;max-width:480px;width:100%;padding:16px 24px;background:rgba(53,53,53,.8);backdrop-filter:blur(20px);border-radius:8px;border:1px solid rgba(64,71,82,.1);box-shadow:0 8px 32px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:space-between;z-index:50;margin-top:40px}
                .save-bar-left{display:flex;align-items:center;gap:8px}
                .save-bar-dot{width:8px;height:8px;border-radius:50%;background-color:#61dac1;animation:pulse 2s infinite}
                .save-bar-dot.off{background-color:#ffb4ab;animation:none}
                .save-bar-text{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#C0C7D4}
                .save-bar-actions{display:flex;gap:12px}
            </style>
        </head>
        <body>
            <div class="settings-layout">
                <nav class="settings-nav">
                    <div class="settings-nav-header"><span>Configuration</span></div>
                    <div class="settings-nav-group">
                        <button class="settings-nav-item active" onclick="switchSection('connection',this)"><span class="material-symbols-outlined">vpn_key</span>Connection</button>
                        <button class="settings-nav-item" onclick="switchSection('account',this)"><span class="material-symbols-outlined">person</span>Account</button>
                        <button class="settings-nav-item" onclick="switchSection('api-info',this)"><span class="material-symbols-outlined">info</span>API Info</button>
                    </div>
                    <div class="settings-nav-divider"></div>
                    <div class="settings-nav-group">
                        <button class="settings-nav-item" onclick="switchSection('about',this)"><span class="material-symbols-outlined">help</span>About</button>
                    </div>
                </nav>
                <div class="settings-content">
                    <div class="settings-content-inner">
                        <div class="page-header"><h1 class="font-headline">Genesis Settings</h1><p>Configure your API connection and manage your Genesis account.</p></div>

                        <!-- CONNECTION -->
                        <div class="settings-section" id="section-connection">
                            <div class="section-info"><h2>CONNECTION</h2><p>Configure your Genesis Voice Agent API key for backend access.</p></div>
                            <div class="section-fields">
                                <div class="field-group"><span class="field-label">API Key</span>
                                    <div class="field-row">
                                        <input class="field-input" type="password" id="api-key-input" placeholder="${hasKey ? '••••••••••••••••' : 'Enter your Genesis API key...'}" value="${hasKey ? '••••••••••••••••' : ''}">
                                        <button class="btn btn-primary" onclick="saveKey()"><span class="material-symbols-outlined">check</span>Save</button>
                                    </div>
                                    <span class="field-hint">Get your API key from the Genesis web app API Keys page.</span>
                                </div>
                                <div class="connection-status">
                                    <div class="status-indicator ${connected ? '' : 'off'}"></div>
                                    <span class="status-text">${connected ? 'Connected to Genesis Cloud' : 'Not connected'}</span>
                                    <span class="status-version">${connected ? 'v2.0' : '—'}</span>
                                </div>
                                <div style="display:flex;gap:12px;flex-wrap:wrap">
                                    <button class="btn btn-secondary" onclick="handleAction('test-connection')"><span class="material-symbols-outlined">link</span>Test Connection</button>
                                    <button class="btn btn-secondary" onclick="handleAction('open-api-keys-page')"><span class="material-symbols-outlined">open_in_new</span>Get API Key</button>
                                    ${hasKey ? '<button class="btn btn-danger" onclick="handleAction(\'clear-api-key\')"><span class="material-symbols-outlined">delete</span>Remove Key</button>' : ''}
                                </div>
                            </div>
                        </div>

                        <!-- ACCOUNT -->
                        <div class="settings-section" id="section-account">
                            <div class="section-info"><h2>ACCOUNT</h2><p>Your Genesis Voice Agent account information.</p></div>
                            <div class="section-fields">
                                ${user ? `
                                <div class="user-card">
                                    <div class="user-avatar">${initials}</div>
                                    <div class="user-details">
                                        <h3>${user.name || 'Unknown'}</h3>
                                        <p>${user.email || ''}</p>
                                        <span class="role-badge">${(user.role || 'user').toUpperCase()}</span>
                                    </div>
                                </div>
                                ${user.organisation || user.jobTitle ? `
                                <div class="detail-grid">
                                    ${user.organisation ? '<div class="detail-item"><label>Organisation</label><span>' + user.organisation + '</span></div>' : ''}
                                    ${user.jobTitle ? '<div class="detail-item"><label>Job Title</label><span>' + user.jobTitle + '</span></div>' : ''}
                                </div>` : ''}
                                ` : '<div style="color:#8a919e;font-size:.75rem">Connect your API key to view account details.</div>'}
                            </div>
                        </div>

                        <!-- API INFO -->
                        <div class="settings-section" id="section-api-info">
                            <div class="section-info"><h2>API INFORMATION</h2><p>Details about the Genesis Voice Agent backend endpoints.</p></div>
                            <div class="section-fields">
                                <div class="field-group"><span class="field-label">Base URL</span><input class="field-input field-input-light" type="text" value="https://jovial-marmot-891.convex.site/api" readonly></div>
                                <div class="field-group"><span class="field-label">Version</span><input class="field-input field-input-light" type="text" value="v2.0.0" readonly></div>
                                <div class="field-group"><span class="field-label">Document Types</span><input class="field-input field-input-light" type="text" value="20 SDLC documents" readonly></div>
                                <div class="field-group"><span class="field-label">Auth Method</span><input class="field-input field-input-light" type="text" value="Bearer Token" readonly></div>
                                <div class="field-group"><span class="field-label">Endpoints</span><input class="field-input field-input-light" type="text" value="32+ HTTP endpoints" readonly></div>
                            </div>
                        </div>

                        <!-- ABOUT -->
                        <div class="settings-section" id="section-about">
                            <div class="section-info"><h2>ABOUT</h2><p>Genesis VS Code Extension information.</p></div>
                            <div class="section-fields">
                                <div class="field-group"><span class="field-label">Extension Name</span><input class="field-input field-input-light" type="text" value="Genesis Voice Agent" readonly></div>
                                <div class="field-group"><span class="field-label">Version</span><input class="field-input field-input-light" type="text" value="2.0.0" readonly></div>
                                <div class="field-group"><span class="field-label">Publisher</span><input class="field-input field-input-light" type="text" value="AI Centre of Excellence" readonly></div>
                                <div class="field-group"><span class="field-label">Storage</span><input class="field-input field-input-light" type="text" value="VS Code SecretStorage (encrypted)" readonly></div>
                            </div>
                        </div>

                        <div class="save-bar">
                            <div class="save-bar-left">
                                <div class="save-bar-dot ${connected ? '' : 'off'}"></div>
                                <span class="save-bar-text">${connected ? 'Connected & Synced' : 'Not Connected'}</span>
                            </div>
                            <div class="save-bar-actions">
                                <button class="btn btn-secondary" onclick="handleAction('clear-api-key')" style="padding:8px 16px;font-size:.6875rem">Reset</button>
                                <button class="btn btn-primary" onclick="handleAction('test-connection')" style="padding:8px 24px"><span class="material-symbols-outlined" style="font-size:14px">link</span>Test Connection</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function switchSection(id,el){
                    document.querySelectorAll('.settings-nav-item').forEach(i=>i.classList.remove('active'));
                    el.classList.add('active');
                    document.querySelectorAll('.settings-section').forEach(s=>s.style.display='none');
                    var t=document.getElementById('section-'+id);
                    if(t){t.style.display='grid';t.scrollIntoView({behavior:'smooth',block:'start'})}
                }
                function handleAction(cmd){vscode.postMessage({command:cmd})}
                function saveKey(){
                    var input=document.getElementById('api-key-input');
                    var key=input?input.value.trim():'';
                    if(key&&key!=='••••••••••••••••'){
                        vscode.postMessage({command:'save-api-key',apiKey:key});
                    }
                }
            </script>
        </body>
        </html>`;
    }
}
