"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSHService = void 0;
const node_ssh_1 = require("node-ssh");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
class SSHService {
    /**
     * Attach an error listener to the underlying ssh2 Client so that socket
     * errors (e.g. EPIPE when the remote host shuts down/reboots, or any network
     * blip) are handled instead of crashing the whole backend.
     *
     * In Node.js, an EventEmitter that emits an 'error' event with NO listener
     * throws synchronously — this was the exact root cause of the backend dying
     * (see container log: "throw er; // Unhandled 'error' event", "Error: write
     * EPIPE", "Emit'ted 'error' event on Client instance"). The try/catch in
     * executeCommand/testConnection only catches awaited promise rejections, not
     * this asynchronous socket 'error' event.
     */
    static attachConnectionErrorHandler(ssh) {
        try {
            const client = ssh.getConnection?.();
            client?.on?.('error', (err) => {
                console.error(`[SSH] Client socket error (suppressed): ${err.message}`);
            });
        }
        catch {
            // getConnection() unavailable in this node-ssh version — the global
            // error handlers in index.ts act as a backstop.
        }
    }
    /**
     * Execute SSH command on remote host
     */
    static async executeCommand(host, port, username, authType, request, password) {
        const ssh = new node_ssh_1.NodeSSH();
        this.attachConnectionErrorHandler(ssh);
        const timestamp = new Date().toISOString();
        console.log(`\n[${timestamp}] [SSH] executeCommand called`);
        console.log(`[SSH] Host: ${host}:${port}, User: ${username}, AuthType: ${authType}`);
        console.log(`[SSH] Request: command=${request.command}, custom_command=${request.custom_command || '(none)'}`);
        console.log(`[SSH] Environment: SSH_AUTH_SOCK=${process.env.SSH_AUTH_SOCK || '(not set)'}, SSH_PRIVATE_KEY_PATH=${process.env.SSH_PRIVATE_KEY_PATH || '(not set)'}`);
        console.log(`[SSH] HOME=${os_1.default.homedir()}, resolved default key path=${path_1.default.join(os_1.default.homedir(), '.ssh', 'id_ed25519')}`);
        try {
            const connectConfig = {
                host,
                port,
                username,
                readyTimeout: 10000,
            };
            if (authType === 'password') {
                if (!password) {
                    throw new Error('SSH password not configured for password authentication');
                }
                connectConfig.password = password;
            }
            else if (authType === 'key') {
                // Try SSH agent first, fall back to private key file
                if (process.env.SSH_AUTH_SOCK) {
                    console.log(`[SSH] Using SSH agent (SSH_AUTH_SOCK=${process.env.SSH_AUTH_SOCK})`);
                    connectConfig.agent = process.env.SSH_AUTH_SOCK;
                    connectConfig.agentForward = true;
                }
                else {
                    // Fallback: read private key from file
                    const keyPath = process.env.SSH_PRIVATE_KEY_PATH || path_1.default.join(os_1.default.homedir(), '.ssh', 'id_ed25519');
                    console.log(`[SSH] SSH_AUTH_SOCK not set, falling back to private key: ${keyPath}`);
                    console.log(`[SSH] Checking key file existence at: ${keyPath}`);
                    if (!fs_1.default.existsSync(keyPath)) {
                        console.error(`[SSH] Key file NOT found at: ${keyPath}`);
                        throw new Error(`Private key file not found at ${keyPath}. Set SSH_AUTH_SOCK or SSH_PRIVATE_KEY_PATH.`);
                    }
                    console.log(`[SSH] Key file found, reading...`);
                    const keyContent = fs_1.default.readFileSync(keyPath, 'utf-8');
                    console.log(`[SSH] Key read successfully, format: ${keyContent.split('\n')[0]}, size: ${keyContent.length} bytes`);
                    connectConfig.privateKey = keyContent;
                }
            }
            console.log(`[SSH] Connect config: host=${connectConfig.host}, port=${connectConfig.port}, username=${connectConfig.username}, authMethod=${connectConfig.privateKey ? 'privateKey' : connectConfig.agent ? 'agent' : 'password'}`);
            console.log(`[SSH] Attempting connection to ${host}:${port}...`);
            await ssh.connect(connectConfig);
            console.log(`[SSH] Connected successfully to ${host}:${port}`);
            let command;
            if (request.custom_command) {
                command = request.custom_command;
                console.log(`[SSH] Using custom command: ${command}`);
            }
            else {
                switch (request.command) {
                    case 'shutdown':
                        command = 'sudo shutdown -h now';
                        break;
                    case 'reboot':
                        command = 'sudo reboot';
                        break;
                    default:
                        throw new Error(`Unknown command: ${request.command}`);
                }
                console.log(`[SSH] Using default command: ${command}`);
            }
            console.log(`[SSH] Executing command: "${command}" on ${host}`);
            const result = await ssh.execCommand(command);
            console.log(`[SSH] Command execution completed`);
            console.log(`[SSH]   stdout: ${result.stdout || '(empty)'}`);
            console.log(`[SSH]   stderr: ${result.stderr || '(empty)'}`);
            console.log(`[SSH]   exit code: ${result.code ?? '(not available)'}`);
            await ssh.dispose();
            console.log(`[SSH] Connection disposed`);
            if (result.stderr && !result.stdout) {
                console.log(`[SSH] Command considered FAILED (stderr present, no stdout)`);
                return {
                    success: false,
                    message: `Command failed: ${result.stderr}`
                };
            }
            console.log(`[SSH] Command considered SUCCESS`);
            return {
                success: true,
                message: `${request.command} command executed successfully`
            };
        }
        catch (error) {
            console.error(`[SSH] ERROR during executeCommand: ${error instanceof Error ? error.message : 'Unknown error'}`);
            if (error instanceof Error && error.stack) {
                console.error(`[SSH] Stack trace: ${error.stack}`);
            }
            await ssh.dispose();
            return {
                success: false,
                message: `SSH error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Test SSH connection
     */
    static async testConnection(host, port, username, authType, password) {
        const ssh = new node_ssh_1.NodeSSH();
        this.attachConnectionErrorHandler(ssh);
        const timestamp = new Date().toISOString();
        console.log(`\n[${timestamp}] [SSH] testConnection called`);
        console.log(`[SSH] Host: ${host}:${port}, User: ${username}, AuthType: ${authType}`);
        try {
            const connectConfig = {
                host,
                port,
                username,
                readyTimeout: 10000,
            };
            if (authType === 'password') {
                if (!password) {
                    throw new Error('SSH password not configured for password authentication');
                }
                connectConfig.password = password;
            }
            else if (authType === 'key') {
                // Try SSH agent first, fall back to private key file
                if (process.env.SSH_AUTH_SOCK) {
                    console.log(`[SSH] Using SSH agent (SSH_AUTH_SOCK=${process.env.SSH_AUTH_SOCK})`);
                    connectConfig.agent = process.env.SSH_AUTH_SOCK;
                    connectConfig.agentForward = true;
                }
                else {
                    // Fallback: read private key from file
                    const keyPath = process.env.SSH_PRIVATE_KEY_PATH || path_1.default.join(os_1.default.homedir(), '.ssh', 'id_ed25519');
                    console.log(`[SSH] SSH_AUTH_SOCK not set, falling back to private key: ${keyPath}`);
                    if (!fs_1.default.existsSync(keyPath)) {
                        throw new Error(`Private key file not found at ${keyPath}. Set SSH_AUTH_SOCK or SSH_PRIVATE_KEY_PATH.`);
                    }
                    connectConfig.privateKey = fs_1.default.readFileSync(keyPath, 'utf-8');
                }
            }
            console.log(`[SSH] Attempting connection to ${host}:${port}...`);
            await ssh.connect(connectConfig);
            console.log(`[SSH] Test connection successful`);
            await ssh.dispose();
            return {
                success: true,
                message: 'SSH connection successful'
            };
        }
        catch (error) {
            console.error(`[SSH] Test connection FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
            await ssh.dispose();
            return {
                success: false,
                message: `SSH connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
exports.SSHService = SSHService;
