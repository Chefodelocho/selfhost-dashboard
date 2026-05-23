"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const hosts_1 = __importDefault(require("./routes/hosts"));
const schedules_1 = __importDefault(require("./routes/schedules"));
const events_1 = __importStar(require("./routes/events"));
const schedulerService_1 = require("./services/schedulerService");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/hosts', hosts_1.default);
app.use('/api/schedules', schedules_1.default);
app.use('/api/events', events_1.default);
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Start status monitoring with SSE broadcast
schedulerService_1.SchedulerService.startStatusMonitoring((statuses) => {
    (0, events_1.broadcastEvent)({ type: 'status', data: statuses });
});
// Start scheduler
schedulerService_1.SchedulerService.start();
// Start server
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});
// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    schedulerService_1.SchedulerService.stop();
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    schedulerService_1.SchedulerService.stop();
    process.exit(0);
});
