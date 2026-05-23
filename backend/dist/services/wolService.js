"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WoLService = void 0;
const dgram_1 = __importDefault(require("dgram"));
class WoLService {
    /**
     * Send Wake on LAN magic packet
     */
    static async sendWoL(request) {
        try {
            const macAddress = this.normalizeMacAddress(request.mac_address);
            const magicPacket = this.createMagicPacket(macAddress);
            return new Promise((resolve, reject) => {
                const socket = dgram_1.default.createSocket('udp4');
                socket.on('error', (err) => {
                    socket.close();
                    reject(err);
                });
                socket.on('listening', () => {
                    socket.setBroadcast(true);
                    const targetAddress = request.ip_address || this.BROADCAST_ADDRESS;
                    socket.send(magicPacket, this.WOL_PORT, targetAddress, (err) => {
                        socket.close();
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve({
                                success: true,
                                message: `Wake on LAN packet sent to ${macAddress}`
                            });
                        }
                    });
                });
                socket.bind();
            });
        }
        catch (error) {
            return {
                success: false,
                message: `Failed to send WoL packet: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Normalize MAC address to format: AA:BB:CC:DD:EE:FF
     */
    static normalizeMacAddress(mac) {
        // Remove all non-hex characters
        const cleaned = mac.replace(/[^a-fA-F0-9]/g, '');
        if (cleaned.length !== 12) {
            throw new Error('Invalid MAC address format');
        }
        // Insert colons every 2 characters
        return cleaned.match(/.{1,2}/g)?.join(':').toUpperCase() || '';
    }
    /**
     * Create magic packet for WoL
     * Format: 6 bytes of 0xFF followed by 16 repetitions of MAC address
     */
    static createMagicPacket(macAddress) {
        const macBytes = macAddress.split(':').map((octet) => parseInt(octet, 16));
        if (macBytes.length !== 6) {
            throw new Error('Invalid MAC address');
        }
        const magicPacket = Buffer.alloc(102);
        // First 6 bytes: 0xFF
        for (let i = 0; i < 6; i++) {
            magicPacket[i] = 0xFF;
        }
        // Next 96 bytes: MAC address repeated 16 times
        for (let i = 0; i < 16; i++) {
            for (let j = 0; j < 6; j++) {
                magicPacket[6 + (i * 6) + j] = macBytes[j];
            }
        }
        return magicPacket;
    }
}
exports.WoLService = WoLService;
WoLService.WOL_PORT = 9;
WoLService.BROADCAST_ADDRESS = '255.255.255.255';
