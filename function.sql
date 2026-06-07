-- ========== 1. ТРИГГЕР ==========
CREATE OR REPLACE FUNCTION check_minimum_stock() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.remains < NEW.min_stock THEN
        RAISE WARNING 'МАТЕРИАЛ "%" ТРЕБУЕТ ЗАКАЗА! ID: %, Осталось: % %, Минимум: % %',
            NEW.material_name, NEW.material_id,
            NEW.remains, NEW.unit_of_measure,
            NEW.min_stock, NEW.unit_of_measure;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_min_stock
    AFTER UPDATE OF remains ON material
    FOR EACH ROW
    EXECUTE FUNCTION check_minimum_stock();

-- ========== 2. ХРАНИМАЯ ПРОЦЕДУРА ==========

CREATE OR REPLACE FUNCTION get_free_slots(
    p_master_id INTEGER,
    p_date DATE,
    p_duration INTEGER
)
RETURNS TABLE(slot_start TIME, slot_end TIME) AS $$
DECLARE
    v_current_start TIME;
    v_current_end TIME;
BEGIN
    CREATE TEMP TABLE busy_slots AS
    SELECT 
        start_time, end_time
    FROM work_schedule
    WHERE employee_id = p_master_id AND date = p_date;
    
    FOR v_current_start, v_current_end IN 
        SELECT start_time, end_time FROM busy_slots ORDER BY start_time
    LOOP
        WHILE v_current_start + (p_duration || ' minutes')::INTERVAL <= v_current_end LOOP
            IF NOT EXISTS (
                SELECT 1 FROM record r
                JOIN service s ON s.service_id = r.service_id
                WHERE r.master_id = p_master_id
                  AND r.date_and_time::DATE = p_date
                  AND r.status IN ('В процессе', 'Выполнено')
                  AND (r.date_and_time::TIME, r.date_and_time::TIME + (s.duration || ' minutes')::INTERVAL)
                      OVERLAPS (v_current_start, v_current_start + (p_duration || ' minutes')::INTERVAL)
            ) THEN
                slot_start := v_current_start;
                slot_end := v_current_start + (p_duration || ' minutes')::INTERVAL;
                RETURN NEXT;
            END IF;
            v_current_start := v_current_start + INTERVAL '15 minutes';
        END LOOP;
    END LOOP;
    
    DROP TABLE busy_slots;
END;
$$ LANGUAGE plpgsql;