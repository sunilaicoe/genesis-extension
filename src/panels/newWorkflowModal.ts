import * as vscode from 'vscode';

export class NewWorkflowModal {
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
