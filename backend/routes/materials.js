const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Все эндпоинты требуют аутентификации и прав администратора
router.use(authenticateToken);
router.use(isAdmin);

// GET /api/materials - получить все материалы
router.get('/', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                material_id as id,
                material_name as name,
                unit_of_measure as unit,
                min_stock as min_stock,
                remains,
                remains < min_stock as is_deficit
            FROM material
            ORDER BY material_name
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/materials - добавить материал
router.post('/', async (req, res) => {
    const { name, unit, min_stock, remains } = req.body;
    
    if (!name || !unit || min_stock === undefined) {
        return res.status(400).json({ error: 'Не заполнены обязательные поля' });
    }
    
    try {
        const result = await db.query(
            `INSERT INTO material (material_name, unit_of_measure, min_stock, remains)
             VALUES ($1, $2, $3, $4) RETURNING material_id`,
            [name, unit, min_stock, remains || 0]
        );
        res.json({ id: result.rows[0].material_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/materials/:id - обновить материал
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, unit, min_stock, remains } = req.body;
    
    try {
        await db.query(
            `UPDATE material 
             SET material_name = $1, unit_of_measure = $2, min_stock = $3, remains = $4
             WHERE material_id = $5`,
            [name, unit, min_stock, remains, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/materials/:id - удалить материал
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await db.query('DELETE FROM material WHERE material_id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;