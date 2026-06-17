"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scheduleService_1 = require("../services/scheduleService");
const router = (0, express_1.Router)();
/**
 * GET /api/schedules
 * Get all schedules
 */
router.get('/', (req, res) => {
    try {
        const schedules = scheduleService_1.ScheduleService.getAllSchedules();
        res.json(schedules);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});
/**
 * GET /api/schedules/:id
 * Get schedule by ID
 */
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const schedule = scheduleService_1.ScheduleService.getScheduleById(id);
        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        res.json(schedule);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch schedule' });
    }
});
/**
 * POST /api/schedules
 * Create new schedule
 */
router.post('/', (req, res) => {
    try {
        const data = req.body;
        // Validate required fields
        if (data.host_id === undefined || data.day_of_week === undefined) {
            return res.status(400).json({ error: 'Missing required fields: host_id, day_of_week' });
        }
        // Validate day_of_week (0-6 = Sunday-Saturday, 7 = Daily)
        if (data.day_of_week < 0 || data.day_of_week > 7) {
            return res.status(400).json({ error: 'day_of_week must be between 0 and 7' });
        }
        const schedule = scheduleService_1.ScheduleService.createSchedule(data);
        res.status(201).json(schedule);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create schedule' });
    }
});
/**
 * PUT /api/schedules/:id
 * Update schedule
 */
router.put('/:id', (req, res) => {
    try {
        const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const data = req.body;
        // Validate day_of_week if provided (0-6 = Sunday-Saturday, 7 = Daily)
        if (data.day_of_week !== undefined && (data.day_of_week < 0 || data.day_of_week > 7)) {
            return res.status(400).json({ error: 'day_of_week must be between 0 and 7' });
        }
        const schedule = scheduleService_1.ScheduleService.updateSchedule(id, data);
        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        res.json(schedule);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update schedule' });
    }
});
/**
 * DELETE /api/schedules/:id
 * Delete schedule
 */
router.delete('/:id', (req, res) => {
    try {
        const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const success = scheduleService_1.ScheduleService.deleteSchedule(id);
        if (!success) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});
exports.default = router;
