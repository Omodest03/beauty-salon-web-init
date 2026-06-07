const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

router.use(authenticateToken);
router.use(isAdmin);

// GET /api/clients - получить всех клиентов
router.get('/', async (req, res) => {
    const { search } = req.query;
    
    try {
        let query = `
            SELECT 
                client_id as id,
                full_name as name,
                phone_number as phone
            FROM client
        `;
        let params = [];
        
        if (search) {
            query += ` WHERE full_name ILIKE $1`;
            params.push(`%${search}%`);
        }
        
        query += ` ORDER BY full_name`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/clients/:id - получить одного клиента
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(
            `SELECT client_id as id, full_name as name, phone_number as phone
             FROM client WHERE client_id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Клиент не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/clients - добавить клиента
router.post('/', async (req, res) => {
    const { name, phone } = req.body;
    
    if (!name || !phone) {
        return res.status(400).json({ error: 'Имя и телефон обязательны' });
    }
    
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
        return res.status(400).json({ error: 'Телефон должен содержать 10 цифр' });
    }
    
    try {
        const result = await db.query(
            `INSERT INTO client (full_name, phone_number)
             VALUES ($1, $2) RETURNING client_id`,
            [name, phone]
        );
        res.json({ id: result.rows[0].client_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/clients/:id - обновить клиента
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone } = req.body;
    
    if (!name || !phone) {
        return res.status(400).json({ error: 'Имя и телефон обязательны' });
    }
    
    try {
        await db.query(
            `UPDATE client SET full_name = $1, phone_number = $2 WHERE client_id = $3`,
            [name, phone, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/clients/:id - удалить клиента
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await db.query('DELETE FROM client WHERE client_id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;