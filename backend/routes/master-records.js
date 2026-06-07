const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isMaster } = require('../middleware/auth');

router.use(authenticateToken);
router.use(isMaster);

// GET /api/master/records - получить записи текущего мастера со статусом "В процессе"
router.get('/records', async (req, res) => {
    const masterId = req.user.employee_id;
    
    try {
        const result = await db.query(`
            SELECT 
                r.record_id as id,
                r.date_and_time as datetime,
                r.status,
                r.price,
                c.full_name as client_name,
                s.service_name as service_name,
                s.duration
            FROM record r
            LEFT JOIN client c ON c.client_id = r.client_id
            LEFT JOIN service s ON s.service_id = r.service_id
            WHERE r.master_id = $1 AND r.status = 'В процессе'
            ORDER BY r.date_and_time ASC
        `, [masterId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/master/records/:id/complete - отметить запись как выполненную
router.put('/records/:id/complete', async (req, res) => {
    const { id } = req.params;
    const { payment_method } = req.body;
    const masterId = req.user.employee_id;
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Проверяем, что запись принадлежит мастеру и имеет статус "В процессе"
        const recordCheck = await client.query(`
            SELECT r.record_id, r.price, r.service_id, r.client_id
            FROM record r
            WHERE r.record_id = $1 AND r.master_id = $2 AND r.status = 'В процессе'
        `, [id, masterId]);
        
        if (recordCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Запись не найдена или уже обработана' });
        }
        
        const record = recordCheck.rows[0];
        
        // Создаём транзакцию
        const transactionResult = await client.query(`
            INSERT INTO transaction (sum, date_and_time, payment_method)
            VALUES ($1, CURRENT_TIMESTAMP, $2)
            RETURNING transaction_id
        `, [record.price, payment_method || 'Наличные']);
        
        const transactionId = transactionResult.rows[0].transaction_id;
        
        // Обновляем запись
        await client.query(`
            UPDATE record 
            SET status = 'Выполнено', transaction_id = $1
            WHERE record_id = $2
        `, [transactionId, id]);
        
        // Триггеры сами спишут материалы и обновят расписание
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'Услуга выполнена' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// PUT /api/master/records/:id/reject - отклонить запись
router.put('/records/:id/reject', async (req, res) => {
    const { id } = req.params;
    const masterId = req.user.employee_id;
    
    try {
        const result = await db.query(`
            UPDATE record 
            SET status = 'Отменено'
            WHERE record_id = $1 AND master_id = $2 AND status = 'В процессе'
            RETURNING record_id
        `, [id, masterId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Запись не найдена или уже обработана' });
        }
        
        res.json({ success: true, message: 'Запись отклонена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;