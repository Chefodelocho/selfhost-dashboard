"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSHService = void 0;
const node_ssh_1 = require("node-ssh");
class SSHService {
    /**
     * Execute SSH command on remote host
     */
    static async executeCommand(host, port, username, authType, request, password) {
        const ssh = new node_ssh_1.NodeSSH();
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
                // Use SSH agent for key authentication
                // The SSH agent will handle the key automatically
                connectConfig.agentForward = true;
            }
            await ssh.connect(connectConfig);
            let command;
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
            const result = await ssh.execCommand(command);
            await ssh.dispose();
            if (result.stderr && !result.stdout) {
                return {
                    success: false,
                    message: `Command failed: ${result.stderr}`
                };
            }
            return {
                success: true,
                message: `${request.command} command executed successfully`
            };
        }
        catch (error) {
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
                // Use SSH agent for key authentication
                connectConfig.agentForward = true;
            }
            await ssh.connect(connectConfig);
            await ssh.dispose();
            return {
                success: true,
                message: 'SSH connection successful'
            };
        }
        catch (error) {
            await ssh.dispose();
            return {
                success: false,
                message: `SSH connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
exports.SSHService = SSHService;
