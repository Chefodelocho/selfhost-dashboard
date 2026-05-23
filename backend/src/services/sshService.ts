import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SSHCommandRequest } from '../types';

export class SSHService {
  /**
   * Execute SSH command on remote host
   */
  static async executeCommand(
    host: string,
    port: number,
    username: string,
    authType: 'password' | 'key',
    request: SSHCommandRequest,
    password?: string
  ): Promise<{ success: boolean; message: string }> {
    const ssh = new NodeSSH();
    const timestamp = new Date().toISOString();

    console.log(`\n[${timestamp}] [SSH] executeCommand called`);
    console.log(`[SSH] Host: ${host}:${port}, User: ${username}, AuthType: ${authType}`);
    console.log(`[SSH] Request: command=${request.command}, custom_command=${request.custom_command || '(none)'}`);
    console.log(`[SSH] Environment: SSH_AUTH_SOCK=${process.env.SSH_AUTH_SOCK || '(not set)'}, SSH_PRIVATE_KEY_PATH=${process.env.SSH_PRIVATE_KEY_PATH || '(not set)'}`);
    console.log(`[SSH] HOME=${os.homedir()}, resolved default key path=${path.join(os.homedir(), '.ssh', 'id_ed25519')}`);

    try {
      const connectConfig: any = {
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
      } else if (authType === 'key') {
        // Try SSH agent first, fall back to private key file
        if (process.env.SSH_AUTH_SOCK) {
          console.log(`[SSH] Using SSH agent (SSH_AUTH_SOCK=${process.env.SSH_AUTH_SOCK})`);
          connectConfig.agent = process.env.SSH_AUTH_SOCK;
          connectConfig.agentForward = true;
        } else {
          // Fallback: read private key from file
          const keyPath = process.env.SSH_PRIVATE_KEY_PATH || path.join(os.homedir(), '.ssh', 'id_ed25519');
          console.log(`[SSH] SSH_AUTH_SOCK not set, falling back to private key: ${keyPath}`);
          console.log(`[SSH] Checking key file existence at: ${keyPath}`);
          if (!fs.existsSync(keyPath)) {
            console.error(`[SSH] Key file NOT found at: ${keyPath}`);
            throw new Error(`Private key file not found at ${keyPath}. Set SSH_AUTH_SOCK or SSH_PRIVATE_KEY_PATH.`);
          }
          console.log(`[SSH] Key file found, reading...`);
          const keyContent = fs.readFileSync(keyPath, 'utf-8');
          console.log(`[SSH] Key read successfully, format: ${keyContent.split('\n')[0]}, size: ${keyContent.length} bytes`);
          connectConfig.privateKey = keyContent;
        }
      }

      console.log(`[SSH] Connect config: host=${connectConfig.host}, port=${connectConfig.port}, username=${connectConfig.username}, authMethod=${connectConfig.privateKey ? 'privateKey' : connectConfig.agent ? 'agent' : 'password'}`);
      console.log(`[SSH] Attempting connection to ${host}:${port}...`);
      await ssh.connect(connectConfig);
      console.log(`[SSH] Connected successfully to ${host}:${port}`);

      let command: string;
      if (request.custom_command) {
        command = request.custom_command;
        console.log(`[SSH] Using custom command: ${command}`);
      } else {
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
    } catch (error) {
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
  static async testConnection(
    host: string,
    port: number,
    username: string,
    authType: 'password' | 'key',
    password?: string
  ): Promise<{ success: boolean; message: string }> {
    const ssh = new NodeSSH();
    const timestamp = new Date().toISOString();

    console.log(`\n[${timestamp}] [SSH] testConnection called`);
    console.log(`[SSH] Host: ${host}:${port}, User: ${username}, AuthType: ${authType}`);

    try {
      const connectConfig: any = {
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
      } else if (authType === 'key') {
        // Try SSH agent first, fall back to private key file
        if (process.env.SSH_AUTH_SOCK) {
          console.log(`[SSH] Using SSH agent (SSH_AUTH_SOCK=${process.env.SSH_AUTH_SOCK})`);
          connectConfig.agent = process.env.SSH_AUTH_SOCK;
          connectConfig.agentForward = true;
        } else {
          // Fallback: read private key from file
          const keyPath = process.env.SSH_PRIVATE_KEY_PATH || path.join(os.homedir(), '.ssh', 'id_ed25519');
          console.log(`[SSH] SSH_AUTH_SOCK not set, falling back to private key: ${keyPath}`);
          if (!fs.existsSync(keyPath)) {
            throw new Error(`Private key file not found at ${keyPath}. Set SSH_AUTH_SOCK or SSH_PRIVATE_KEY_PATH.`);
          }
          connectConfig.privateKey = fs.readFileSync(keyPath, 'utf-8');
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
    } catch (error) {
      console.error(`[SSH] Test connection FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
      await ssh.dispose();
      return {
        success: false,
        message: `SSH connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}