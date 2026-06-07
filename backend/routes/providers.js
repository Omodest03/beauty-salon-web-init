const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

router.use(authenticateToken);
router.use(isAdmin);

// GET /api/providers - получить всех поставщиков
router.get('/', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                provider_id as id,
                provider_name as name,
                contact_person as contact_person,
                phone_number as phone,
                adress as address
            FROM provider
            ORDER BY provider_name
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/providers - добавить поставщика
router.post('/', async (req, res) => {
    const { name, contact_person, phone, address } = req.body;
    
    if (!name || !contact_person || !phone) {
        return res.status(400).json({ error: 'Не заполнены обязательные поля' });
    }
    
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
        return res.status(400).json({ error: 'Телефон должен содержать 10 цифр' });
    }
    
    try {
        const result = await db.query(
            `INSERT INTO provider (provider_name, contact_person, phone_number, adress)
             VALUES ($1, $2, $3, $4) RETURNING provider_id`,
            [name, contact_person, phone, address || null]
        );
        res.json({ id: result.rows[0].provider_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/providers/:id - обновить поставщика
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, contact_person, phone, address } = req.body;
    
    try {
        await db.query(
            `UPDATE provider 
             SET provider_name = $1, contact_person = $2, phone_number = $3, adress = $4
             WHERE provider_id = $5`,
            [name, contact_person, phone, address, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/providers/:id - удалить поставщика
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await db.query('DELETE FROM provider WHERE provider_id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;