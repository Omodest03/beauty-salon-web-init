const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin, isStorekeeper } = require('../middleware/auth');

// Все эндпоинты требуют аутентификации
router.use(authenticateToken);

// GET /api/supplies - получить все поставки (для администратора)
router.get('/', isAdmin, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                s.supply_id as id,
                s.date,
                p.provider_name as provider,
                COALESCE(e1.full_name, '—') as administrator,
                COALESCE(e2.full_name, '—') as storekeeper,
                s.total_sum as total_sum,
                s.status
            FROM supply s
            LEFT JOIN provider p ON p.provider_id = s.provider_id
            LEFT JOIN employee e1 ON e1.employee_id = s.administrator_id
            LEFT JOIN employee e2 ON e2.employee_id = s.storekeeper_id
            ORDER BY s.date DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/supplies/draft - получить поставки для приёмки (для кладовщика)
router.get('/draft', isStorekeeper, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                s.supply_id as id,
                s.date,
                p.provider_name as provider,
                COALESCE(e1.full_name, '—') as administrator,
                s.total_sum as total_sum,
                s.status
            FROM supply s
            LEFT JOIN provider p ON p.provider_id = s.provider_id
            LEFT JOIN employee e1 ON e1.employee_id = s.administrator_id
            WHERE s.status = 'оформлено'
            ORDER BY s.date DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/supplies/:id - получить содержимое поставки
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(`
            SELECT 
                m.material_name as material,
                sc.position_incount as quantity,
                sc.position_price as price,
                (sc.position_incount * sc.position_price) as total
            FROM supply_content sc
            JOIN material m ON m.material_id = sc.material_id
            WHERE sc.supply_id = $1
            ORDER BY m.material_name
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/supplies - оформить новую поставку (администратор)
router.post('/', isAdmin, async (req, res) => {
    const { date, provider_id, administrator_id, storekeeper_id, items } = req.body;
    const client = await db.pool.connect();
    
    if (!date || !provider_id || !items || items.length === 0) {
        return res.status(400).json({ error: 'Не заполнены обязательные поля' });
    }
    
    try {
        await client.query('BEGIN');
        
        const supplyResult = await client.query(
            `INSERT INTO supply (administrator_id, provider_id, storekeeper_id, date, total_sum, status)
             VALUES ($1, $2, $3, $4, 0, 'оформлено')
             RETURNING supply_id`,
            [administrator_id || null, provider_id, storekeeper_id || null, date]
        );
        const supplyId = supplyResult.rows[0].supply_id;
        
        for (const item of items) {
            if (!item.material_id || !item.quantity || !item.price) continue;
            await client.query(
                `INSERT INTO supply_content (supply_id, material_id, position_incount, position_price)
                 VALUES ($1, $2, $3, $4)`,
                [supplyId, item.material_id, item.quantity, item.price]
            );
        }
        
        await client.query('COMMIT');
        res.json({ id: supplyId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// PUT /api/supplies/:id/confirm - подтвердить поставку (кладовщик)
router.put('/:id/confirm', isStorekeeper, async (req, res) => {
    const { id } = req.params;
    const storekeeperId = req.user.employee_id;  // ← ДОБАВИТЬ
    
    try {
        const result = await db.query(
            `UPDATE supply 
             SET status = 'принято', storekeeper_id = $2
             WHERE supply_id = $1 AND status = 'оформлено'
             RETURNING supply_id`,
            [id, storekeeperId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Поставка не найдена или уже обработана' });
        }
        
        res.json({ success: true, message: 'Поставка подтверждена, материалы добавлены на склад' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/supplies/:id/reject - отклонить поставку (кладовщик)
router.put('/:id/reject', isStorekeeper, async (req, res) => {
    const { id } = req.params;
    const storekeeperId = req.user.employee_id;  // ← ДОБАВИТЬ
    
    try {
        const result = await db.query(
            `UPDATE supply 
             SET status = 'отклонено', storekeeper_id = $2
             WHERE supply_id = $1 AND status = 'оформлено'
             RETURNING supply_id`,
            [id, storekeeperId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Поставка не найдена или уже обработана' });
        }
        
        res.json({ success: true, message: 'Поставка отклонена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;