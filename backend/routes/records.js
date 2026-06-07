const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

router.use(authenticateToken);
router.use(isAdmin);

// GET /api/records?year=2025 - получить записи за год
router.get('/', async (req, res) => {
    const { year, date } = req.query;
    
    try {
        let query = `
            SELECT 
                r.record_id as id,
                r.date_and_time as datetime,
                r.status,
                r.price,
                c.full_name as client_name,
                s.service_name as service_name,
                e.full_name as master_name,
                adm.full_name as admin_name
            FROM record r
            LEFT JOIN client c ON c.client_id = r.client_id
            LEFT JOIN service s ON s.service_id = r.service_id
            LEFT JOIN employee e ON e.employee_id = r.master_id
            LEFT JOIN employee adm ON adm.employee_id = r.administrator_id
        `;
        
        let conditions = [];
        let params = [];
        
        // Фильтр по году
        if (year && year !== 'undefined' && year !== 'null') {
            const yearNum = parseInt(year);
            if (!isNaN(yearNum)) {
                conditions.push(`EXTRACT(YEAR FROM r.date_and_time) = $${params.length + 1}`);
                params.push(yearNum);
            }
        }
        
        // Фильтр по конкретной дате (если нужно)
        if (date) {
            conditions.push(`r.date_and_time::DATE = $${params.length + 1}`);
            params.push(date);
        }
        
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        query += ` ORDER BY r.date_and_time DESC`;
        
        console.log('Executing query with params:', params);
        const result = await db.query(query, params);
        console.log(`Found ${result.rows.length} records`);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Records error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/records/:id - получить одну запись
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(`
            SELECT 
                r.record_id as id,
                r.date_and_time as datetime,
                r.status,
                r.price,
                r.transaction_id,
                r.client_id,
                r.service_id,
                r.master_id,
                r.administrator_id,
                c.full_name as client_name,
                s.service_name as service_name,
                s.duration,
                e.full_name as master_name,
                adm.full_name as admin_name
            FROM record r
            LEFT JOIN client c ON c.client_id = r.client_id
            LEFT JOIN service s ON s.service_id = r.service_id
            LEFT JOIN employee e ON e.employee_id = r.master_id
            LEFT JOIN employee adm ON adm.employee_id = r.administrator_id
            WHERE r.record_id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Запись не найдена' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/records/masters/:masterId/free-slots - получить свободные слоты мастера
router.get('/masters/:masterId/free-slots', async (req, res) => {
    const { masterId } = req.params;
    const { date, duration } = req.query;
    
    if (!date || !duration) {
        return res.status(400).json({ error: 'Дата и длительность обязательны' });
    }
    
    try {
        const result = await db.query(
            `SELECT * FROM get_free_slots($1, $2, $3)`,
            [masterId, date, parseInt(duration)]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/records - создать запись
router.post('/', async (req, res) => {
    const { client_id, service_id, master_id, administrator_id, datetime, price } = req.body;
    
    if (!client_id || !service_id || !master_id || !datetime) {
        return res.status(400).json({ error: 'Не заполнены обязательные поля' });
    }
    
    try {
        const durationResult = await db.query('SELECT duration FROM service WHERE service_id = $1', [service_id]);
        if (durationResult.rows.length === 0) {
            return res.status(400).json({ error: 'Услуга не найдена' });
        }
        
        const duration = durationResult.rows[0].duration;
        const startTime = datetime;
        const endTime = new Date(new Date(datetime).getTime() + duration * 60000);
        
        const conflict = await db.query(`
            SELECT 1 FROM record r
            JOIN service s ON s.service_id = r.service_id
            WHERE r.master_id = $1
              AND r.date_and_time::DATE = $2::DATE
              AND r.status IN ('В процессе', 'Выполнено')
              AND (r.date_and_time, r.date_and_time + (s.duration || ' minutes')::INTERVAL)
                  OVERLAPS ($3, $4)
        `, [master_id, datetime, startTime, endTime]);
        
        if (conflict.rows.length > 0) {
            return res.status(409).json({ error: 'Выбранное время уже занято' });
        }
        
        const result = await db.query(`
            INSERT INTO record (client_id, service_id, master_id, administrator_id, date_and_time, status, price)
            VALUES ($1, $2, $3, $4, $5, 'В процессе', $6)
            RETURNING record_id as id
        `, [client_id, service_id, master_id, administrator_id, datetime, price || 0]);
        
        res.status(201).json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/records/:id/cancel - отменить запись
router.put('/:id/cancel', async (req, res) => {
    const { id } = req.params;
    
    try {
        await db.query(
            `UPDATE record SET status = 'Отменено' WHERE record_id = $1 AND status = 'В процессе'`,
            [id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;