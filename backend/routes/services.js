const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/services/:id/materials-check - проверить доступность материалов для услуги
router.get('/:id/materials-check', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Получаем список материалов для услуги и их остатки
        const result = await db.query(`
            SELECT 
                m.material_id,
                m.material_name,
                m.unit_of_measure,
                m.remains,
                CASE 
                    WHEN m.unit_of_measure = 'шт' THEN 1
                    ELSE 100
                END as required_amount
            FROM consumes c
            JOIN material m ON m.material_id = c.material_id
            WHERE c.service_id = $1
        `, [id]);
        
        const missingMaterials = [];
        for (const material of result.rows) {
            const required = parseInt(material.required_amount);
            const remains = parseFloat(material.remains);
            if (remains < required) {
                missingMaterials.push({
                    name: material.material_name,
                    required: required,
                    available: remains,
                    unit: material.unit_of_measure
                });
            }
        }
        
        if (missingMaterials.length > 0) {
            res.json({
                available: false,
                missing: missingMaterials
            });
        } else {
            res.json({
                available: true,
                missing: []
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.use(authenticateToken);
router.use(isAdmin);

// GET /api/services - получить все услуги
router.get('/', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                service_id as id,
                service_name as name,
                service_category as category,
                price,
                duration
            FROM service
            ORDER BY service_name
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/services - добавить услугу
router.post('/', async (req, res) => {
    const { name, category, price, duration } = req.body;
    
    if (!name || !category || !price || !duration) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    try {
        const result = await db.query(
            `INSERT INTO service (service_name, service_category, price, duration)
             VALUES ($1, $2, $3, $4) RETURNING service_id`,
            [name, category, price, duration]
        );
        res.json({ id: result.rows[0].service_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/services/:id - обновить услугу
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, category, price, duration } = req.body;
    
    try {
        await db.query(
            `UPDATE service 
             SET service_name = $1, service_category = $2, price = $3, duration = $4
             WHERE service_id = $5`,
            [name, category, price, duration, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/services/:id - удалить услугу
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await db.query('DELETE FROM service WHERE service_id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;