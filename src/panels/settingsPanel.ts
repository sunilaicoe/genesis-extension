import * as vscode from 'vscode';

export class SettingsPanel {
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
