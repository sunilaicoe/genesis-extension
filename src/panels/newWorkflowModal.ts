import * as vscode from 'vscode';
import { WorkflowService } from '../services/workflowService';

export class NewWorkflowModal {
    public static currentPanel: NewWorkflowModal | undefined;
    private _panel: vscode.WebviewPanel;
    private _service: WorkflowService;
    private static _onCreate: ((workflowId: string, name: string) => void) | undefined;

    public static setOnCreate(cb: (workflowId: string, name: string) => void) { NewWorkflowModal._onCreate = cb; }

    constructor(panel: vscode.WebviewPanel, service: WorkflowService) {
        this._panel = panel;
        this._service = service;
        panel.webview.html = this._getHtml();
        this._panel.onDidDispose(() => { NewWorkflowModal.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'create': this._handleCreate(message); break;
                case 'cancel': this._panel.dispose(); break;
                case 'pick-folder': this._handlePickFolder(); break;
            }
        });
    }

    private async _handlePickFolder() {
        const result = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            title: 'Select Project Folder for Document Output',
            openLabel: 'Select Folder',
        });
        if (result && result.length > 0) {
            const folderPath = result[0].fsPath;
            this._panel.webview.postMessage({ command: 'folder-selected', path: folderPath });
        }
    }

    private async _handleCreate(message: any) {
        const name = (message.name || '').trim();
        const productName = (message.productName || name || '').trim();
        const transcript = (message.transcript || '').trim();
        const outputFolder = (message.outputFolder || '').trim();
        const autoStart = message.autoStart !== false;

        if (!name) {
            vscode.window.showErrorMessage('Please enter a workflow name.');
            return;
        }
        if (!outputFolder) {
            vscode.window.showErrorMessage('Please select a project folder where documents will be saved.');
            return;
        }
        if (!transcript || transcript.length < 50) {
            vscode.window.showErrorMessage('Please enter a transcript with at least 50 characters describing your project requirements.');
            return;
        }

        if (!this._service.isAuthenticated()) {
            vscode.window.showErrorMessage('No API key configured. Please set your Genesis API key in Settings first.');
            return;
        }

        // ─── SINGLE PATH: Genesis Cloud Pipeline → Save to Local Folder ───────
        // Same AI output is stored both in the cloud AND saved locally.
        // The detail panel opens IMMEDIATELY and shows live pipeline progress.
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Genesis Pipeline: "${name}"`,
            cancellable: false,
        }, async (progress) => {
            const result = await this._service.createCloudToLocalWorkflow(
                name, productName, transcript, outputFolder, autoStart,
                (step, total, msg) => {
                    progress.report({ message: msg, increment: (100 / total) });
                }
            );
            if (result) {
                // Close the modal and open the detail panel immediately
                // The panel will show live progress and auto-update when done
                this._panel.dispose();
                if (NewWorkflowModal._onCreate) NewWorkflowModal._onCreate(result.workflowId, name);
            }
        });
    }

    public static open(extensionUri: vscode.Uri, service: WorkflowService) {
        if (NewWorkflowModal.currentPanel) { NewWorkflowModal.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-new-workflow', 'Create New Workflow', vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: false, localResourceRoots: [extensionUri]
        });
        NewWorkflowModal.currentPanel = new NewWorkflowModal(panel, service);
    }

    private _getHtml(): string {
        const connected = this._service.isAuthenticated();
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Create New Workflow</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;align-items:center;justify-content:center}
                .overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px}
                .modal{width:100%;max-width:680px;background:rgba(53,53,53,.85);backdrop-filter:blur(20px);border-radius:12px;border:1px solid rgba(64,71,82,.15);box-shadow:0 16px 48px rgba(0,0,0,.5);overflow:hidden;display:flex;flex-direction:column}
                .modal-header{padding:32px 32px 24px;border-bottom:1px solid rgba(64,71,82,.1)}
                .modal-header h2{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;color:#e5e2e1;letter-spacing:-.02em}
                .modal-header p{font-size:.8125rem;color:#C0C7D4;margin-top:6px}
                .modal-body{padding:28px 32px;display:flex;flex-direction:column;gap:24px;overflow-y:auto;max-height:60vh}
                .field-group{display:flex;flex-direction:column;gap:8px}
                .field-label{font-family:'Space Grotesk',sans-serif;font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#A3C9FF}
                .field-hint{font-size:.625rem;color:#8a919e;font-style:italic}
                .field-input{width:100%;background:rgba(14,14,14,.8);border:1px solid rgba(64,71,82,.2);color:#e5e2e1;font-family:'Inter',sans-serif;font-size:.8125rem;padding:12px 16px;border-radius:6px;outline:none;transition:border-color .15s ease}
                .field-input:focus{border-color:rgba(163,201,255,.5)}
                .field-input::placeholder{color:#8a919e}
                textarea.field-input{resize:vertical;min-height:120px;line-height:1.6}
                .char-count{text-align:right;font-size:.5625rem;color:#8a919e;font-family:'Fira Code',monospace}

                /* Folder picker */
                .folder-row{display:flex;gap:10px;align-items:stretch}
                .folder-row .field-input{flex:1;cursor:default}
                .folder-row .field-input.has-path{color:#61dac1;border-color:rgba(97,218,193,.3)}
                .folder-btn{display:flex;align-items:center;gap:6px;padding:10px 18px;background:linear-gradient(180deg,#A3C9FF,#0078D4);color:#fff;border:none;border-radius:6px;font-size:.75rem;font-weight:700;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif;white-space:nowrap}
                .folder-btn:hover{filter:brightness(1.1)}
                .folder-btn:active{transform:scale(.97)}
                .folder-btn .material-symbols-outlined{font-size:16px}
                .folder-info{display:flex;gap:12px;margin-top:8px;flex-wrap:wrap}
                .folder-tag{display:flex;align-items:center;gap:4px;padding:3px 10px;background:rgba(97,218,193,.06);border:1px solid rgba(97,218,193,.15);border-radius:9999px;font-size:.5625rem;font-weight:600;color:#61dac1;text-transform:uppercase;letter-spacing:.04em}
                .folder-tag .material-symbols-outlined{font-size:12px}

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
                .btn-primary:disabled{opacity:.4;cursor:not-allowed;filter:none}
                .btn .material-symbols-outlined{font-size:18px}
                .info-box{padding:14px 16px;background:rgba(163,201,255,.06);border:1px solid rgba(163,201,255,.15);border-radius:8px;display:flex;gap:12px;align-items:flex-start}
                .info-box .material-symbols-outlined{font-size:18px;color:#A3C9FF;flex-shrink:0;margin-top:1px}
                .info-box p{font-size:.75rem;color:#C0C7D4;line-height:1.6}
                .status-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:8px;font-size:.75rem;font-weight:600;margin-bottom:4px}
                .status-ok{background:rgba(97,218,193,.08);border:1px solid rgba(97,218,193,.2);color:#61dac1}
                .status-err{background:rgba(255,180,171,.08);border:1px solid rgba(255,180,171,.2);color:#ffb4ab}
                .status-bar .material-symbols-outlined{font-size:16px}
            </style>
        </head>
        <body>
            <div class="overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h2>Create New Workflow <span style="font-size:.5625rem;font-weight:700;color:#61dac1;text-transform:uppercase;letter-spacing:.06em;margin-left:8px;padding:3px 10px;background:rgba(97,218,193,.1);border:1px solid rgba(97,218,193,.2);border-radius:9999px">Cloud + Local</span></h2>
                        <p>Genesis AI generates 20 SDLC documents via the cloud pipeline → saved to your local folder</p>
                    </div>
                    <div class="modal-body">
                        ${connected
                            ? '<div class="status-bar status-ok"><span class="material-symbols-outlined">cloud_done</span> Connected to Genesis Cloud API — AI pipeline ready</div>'
                            : '<div class="status-bar status-err"><span class="material-symbols-outlined">cloud_off</span> Not connected — Set your API key in Settings first</div>'
                        }
                        <div class="info-box">
                            <span class="material-symbols-outlined">auto_awesome</span>
                            <p>Your transcript is analyzed by <strong>20 specialized AI agents</strong> (powered by Google Gemini). Every document is <strong>saved to your local folder</strong> AND stored in the cloud — same output everywhere.</p>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Workflow Name *</label>
                            <input class="field-input" type="text" id="wf-name" placeholder="e.g. E-Commerce Re-platform">
                        </div>
                        <div class="field-group">
                            <label class="field-label">Product Name</label>
                            <input class="field-input" type="text" id="wf-product" placeholder="e.g. ShopFast (defaults to workflow name)">
                        </div>
                        <div class="field-group">
                            <label class="field-label">Project Output Folder *</label>
                            <div class="folder-row">
                                <input class="field-input" type="text" id="wf-folder" placeholder="Click Browse to select a folder..." readonly>
                                <button class="folder-btn" onclick="handleAction('pick-folder')"><span class="material-symbols-outlined">folder_open</span> Browse</button>
                            </div>
                            <div class="folder-info" id="folder-info" style="display:none">
                                <div class="folder-tag"><span class="material-symbols-outlined">description</span> markdown/</div>
                                <div class="folder-tag"><span class="material-symbols-outlined">data_object</span> json/</div>
                                <div class="folder-tag"><span class="material-symbols-outlined">html</span> html/</div>
                                <div class="folder-tag"><span class="material-symbols-outlined">picture_as_pdf</span> pdf/</div>
                            </div>
                            <span class="field-hint">All 20 AI-generated documents will be saved here in organized subfolders.</span>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Meeting Transcript / Requirements *</label>
                            <textarea class="field-input" id="wf-transcript" placeholder="Describe your project requirements, goals, features, and constraints in detail. This is the content the AI agents will use to generate all 20 SDLC documents...

Example: We want to build a healthcare app where patients can book appointments, view medical records, and consult doctors via video call. Doctors should manage their schedules and send electronic prescriptions. The app needs user authentication, chat messaging, email notifications, and secure payment processing." oninput="updateCharCount()"></textarea>
                            <div class="char-count"><span id="char-count">0</span> / 50 min characters</div>
                        </div>
                        <div class="toggle-row" onclick="toggleSwitch(this)" id="auto-start-row">
                            <span class="toggle-label">Start AI pipeline automatically after creation</span>
                            <div class="toggle-switch on"><div class="toggle-knob"></div></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-ghost" onclick="handleAction('cancel')">Cancel</button>
                        <button class="btn btn-primary" id="create-btn" onclick="handleCreate()" ${connected ? '' : 'disabled'}>
                            <span class="material-symbols-outlined">rocket_launch</span>
                            <span>Create & Run Pipeline</span>
                        </button>
                    </div>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                window.addEventListener('message', event => {
                    const msg = event.data;
                    if (msg.command === 'folder-selected') {
                        var folderInput = document.getElementById('wf-folder');
                        folderInput.value = msg.path;
                        folderInput.classList.add('has-path');
                        document.getElementById('folder-info').style.display = 'flex';
                    }
                });

                function handleAction(c){vscode.postMessage({command:c})}
                function handleCreate(){
                    var name=document.getElementById('wf-name').value.trim();
                    var product=document.getElementById('wf-product').value.trim();
                    var transcript=document.getElementById('wf-transcript').value.trim();
                    var outputFolder=document.getElementById('wf-folder').value.trim();
                    var autoStart=document.querySelector('#auto-start-row .toggle-switch').classList.contains('on');
                    vscode.postMessage({command:'create',name:name,productName:product,transcript:transcript,outputFolder:outputFolder,autoStart:autoStart});
                }
                function toggleSwitch(el){var t=el.querySelector('.toggle-switch');if(t)t.classList.toggle('on')}
                function updateCharCount(){
                    var len=document.getElementById('wf-transcript').value.length;
                    var el=document.getElementById('char-count');
                    if(el){el.textContent=len;el.style.color=len>=50?'#61dac1':'#ffb4ab'}
                }
            </script>
        </body>
        </html>`;
    }
}
