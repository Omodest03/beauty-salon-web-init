-- ============================================================
-- БАЗА ДАННЫХ: Шалфей (Салон красоты) - ПОЛНАЯ ВЕРСИЯ
-- ============================================================

-- Включаем расширение для криптографии
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========== 1. ТАБЛИЦЫ ==========

CREATE TABLE IF NOT EXISTS client (
    client_id SERIAL NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number CHAR(10) NOT NULL,
    CONSTRAINT PK_CLIENT PRIMARY KEY (client_id)
);

CREATE TABLE IF NOT EXISTS employee (
    employee_id SERIAL NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    post VARCHAR(30) NOT NULL,
    login VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    CONSTRAINT PK_EMPLOYEE PRIMARY KEY (employee_id)
);

CREATE TABLE IF NOT EXISTS material (
    material_id SERIAL NOT NULL,
    material_name VARCHAR(100) NOT NULL,
    unit_of_measure VARCHAR(3) NOT NULL,
    remains DECIMAL(5,1) NOT NULL,
    min_stock DECIMAL(5,1) NOT NULL,
    CONSTRAINT PK_MATERIAL PRIMARY KEY (material_id)
);

CREATE TABLE IF NOT EXISTS provider (
    provider_id SERIAL NOT NULL,
    provider_name VARCHAR(100) NULL,
    contact_person VARCHAR(100) NOT NULL,
    phone_number CHAR(10) NOT NULL,
    adress VARCHAR(200) NULL,
    CONSTRAINT PK_PROVIDER PRIMARY KEY (provider_id)
);

CREATE TABLE IF NOT EXISTS service (
    service_id SERIAL NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    service_category VARCHAR(100) NOT NULL,
    price DECIMAL(6) NOT NULL,
    duration DECIMAL(3) NOT NULL,
    CONSTRAINT PK_SERVICE PRIMARY KEY (service_id)
);

CREATE TABLE IF NOT EXISTS transaction (
    transaction_id SERIAL NOT NULL,
    sum DECIMAL(6) NOT NULL,
    date_and_time TIMESTAMP NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    CONSTRAINT PK_TRANSACTION PRIMARY KEY (transaction_id)
);

CREATE TABLE IF NOT EXISTS consumes (
    service_id INT4 NOT NULL,
    material_id INT4 NOT NULL,
    CONSTRAINT PK_CONSUMES PRIMARY KEY (service_id, material_id)
);

CREATE TABLE IF NOT EXISTS performs (
    service_id INT4 NOT NULL,
    master_id INT4 NOT NULL,
    CONSTRAINT PK_PERFORMS PRIMARY KEY (service_id, master_id)
);

CREATE TABLE IF NOT EXISTS record (
    record_id SERIAL NOT NULL,
    service_id INT4 NULL,
    transaction_id INT4 NULL,
    master_id INT4 NULL,
    administrator_id INT4 NULL,
    client_id INT4 NULL,
    date_and_time TIMESTAMP NOT NULL,
    status VARCHAR(30) NOT NULL,
    price DECIMAL(6) NOT NULL,
    CONSTRAINT PK_RECORD PRIMARY KEY (record_id)
);

CREATE TABLE IF NOT EXISTS supply (
    supply_id SERIAL NOT NULL,
    administrator_id INT4 NULL,
    provider_id INT4 NULL,
    storekeeper_id INT4 NULL,
    date DATE NOT NULL,
    total_sum DECIMAL(7,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'оформлено' NOT NULL,
    CONSTRAINT PK_SUPPLY PRIMARY KEY (supply_id)
);

CREATE TABLE IF NOT EXISTS supply_content (
    supply_id INT4 NOT NULL,
    material_id INT4 NOT NULL,
    position_incount DECIMAL(3) NOT NULL,
    position_price DECIMAL(7,2) NOT NULL,
    CONSTRAINT PK_SUPPLY_CONTENT PRIMARY KEY (supply_id, material_id)
);

CREATE TABLE IF NOT EXISTS work_schedule (
    period_id SERIAL NOT NULL,
    employee_id INT4 NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CONSTRAINT PK_WORK_SCHEDULE PRIMARY KEY (period_id)
);

-- ========== 2. ИНДЕКСЫ ==========

CREATE UNIQUE INDEX client_PK ON client (client_id);
CREATE UNIQUE INDEX employee_PK ON employee (employee_id);
CREATE UNIQUE INDEX employee_login_idx ON employee (login);
CREATE UNIQUE INDEX material_PK ON material (material_id);
CREATE INDEX material_remains_idx ON material (remains);
CREATE UNIQUE INDEX provider_PK ON provider (provider_id);
CREATE UNIQUE INDEX service_PK ON service (service_id);
CREATE UNIQUE INDEX transaction_PK ON transaction (transaction_id);
CREATE UNIQUE INDEX consumes_PK ON consumes (service_id, material_id);
CREATE INDEX consumes_FK ON consumes (service_id);
CREATE INDEX consumed_FK ON consumes (material_id);
CREATE UNIQUE INDEX performs_PK ON performs (service_id, master_id);
CREATE INDEX executes_FK ON performs (service_id);
CREATE INDEX performs_FK ON performs (master_id);
CREATE UNIQUE INDEX record_PK ON record (record_id);
CREATE INDEX record_date_idx ON record (date_and_time);
CREATE INDEX possesses_FK ON record (client_id);
CREATE INDEX create_FK ON record (administrator_id);
CREATE INDEX involves_FK ON record (master_id);
CREATE INDEX triggers_FK ON record (transaction_id);
CREATE INDEX include_FK ON record (service_id);
CREATE UNIQUE INDEX supply_PK ON supply (supply_id);
CREATE INDEX supply_status_idx ON supply (status);
CREATE INDEX realize_FK ON supply (provider_id);
CREATE INDEX register_FK ON supply (administrator_id);
CREATE INDEX accepts_FK ON supply (storekeeper_id);
CREATE UNIQUE INDEX supply_content_PK ON supply_content (supply_id, material_id);
CREATE INDEX consists_FK ON supply_content (supply_id);
CREATE INDEX contains_FK ON supply_content (material_id);
CREATE UNIQUE INDEX work_schedule_PK ON work_schedule (period_id);
CREATE INDEX have_FK ON work_schedule (employee_id);
CREATE INDEX work_schedule_date_idx ON work_schedule (date, employee_id);

-- ========== 3. ТРИГГЕРЫ ==========

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

CREATE OR REPLACE FUNCTION update_total_supply_sum() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE supply 
        SET total_sum = COALESCE(total_sum, 0) + (NEW.position_incount * NEW.position_price)
        WHERE supply_id = NEW.supply_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE supply 
        SET total_sum = total_sum - (OLD.position_incount * OLD.position_price) +
                       (NEW.position_incount * NEW.position_price)
        WHERE supply_id = NEW.supply_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE supply 
        SET total_sum = total_sum - (OLD.position_incount * OLD.position_price)
        WHERE supply_id = OLD.supply_id;
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_supply_total
    AFTER INSERT OR DELETE OR UPDATE ON supply_content
    FOR EACH ROW
    EXECUTE FUNCTION update_total_supply_sum();

CREATE OR REPLACE FUNCTION update_material_remains_on_supply_complete() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'оформлено' AND NEW.status = 'принято' THEN
        UPDATE material m
        SET remains = m.remains + sc.position_incount
        FROM supply_content sc
        WHERE sc.supply_id = NEW.supply_id AND sc.material_id = m.material_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_material_remains_on_supply_complete
    AFTER UPDATE OF status ON supply
    FOR EACH ROW
    EXECUTE FUNCTION update_material_remains_on_supply_complete();

CREATE OR REPLACE FUNCTION update_work_schedule_on_record_complete() RETURNS TRIGGER AS $$
DECLARE
    v_duration INTEGER;
    v_start_time TIME;
    v_end_time TIME;
BEGIN
    IF OLD.status = 'В процессе' AND NEW.status = 'Выполнено' THEN
        SELECT duration INTO v_duration FROM service WHERE service_id = NEW.service_id;
        v_start_time := NEW.date_and_time::TIME;
        v_end_time := v_start_time + (v_duration || ' minutes')::INTERVAL;
        
        DELETE FROM work_schedule 
        WHERE employee_id = NEW.master_id 
          AND date = NEW.date_and_time::DATE
          AND start_time >= v_start_time
          AND end_time <= v_end_time;
        
        IF v_start_time > '10:00:00' THEN
            INSERT INTO work_schedule (employee_id, date, start_time, end_time)
            VALUES (NEW.master_id, NEW.date_and_time::DATE, '10:00:00', v_start_time);
        END IF;
        
        IF v_end_time < '20:00:00' THEN
            INSERT INTO work_schedule (employee_id, date, start_time, end_time)
            VALUES (NEW.master_id, NEW.date_and_time::DATE, v_end_time, '20:00:00');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_work_schedule_on_record_complete
    AFTER UPDATE OF status ON record
    FOR EACH ROW
    EXECUTE FUNCTION update_work_schedule_on_record_complete();

CREATE OR REPLACE FUNCTION consume_materials_on_record_complete() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'В процессе' AND NEW.status = 'Выполнено' THEN
        UPDATE material m
        SET remains = CASE 
            WHEN m.unit_of_measure = 'шт' THEN GREATEST(0, m.remains - 1)
            ELSE GREATEST(0, m.remains - 100)
        END
        FROM consumes c
        WHERE c.service_id = NEW.service_id AND c.material_id = m.material_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_consume_materials_on_record_complete
    AFTER UPDATE OF status ON record
    FOR EACH ROW
    EXECUTE FUNCTION consume_materials_on_record_complete();

-- ========== 4. ХРАНИМАЯ ПРОЦЕДУРА ==========

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

-- ========== 5. VIEW ==========

CREATE OR REPLACE VIEW vw_materials_with_deficit AS
SELECT 
    material_id,
    material_name,
    unit_of_measure,
    remains,
    min_stock,
    CASE 
        WHEN remains < min_stock THEN 'Дефицит'
        WHEN remains = min_stock THEN 'На грани'
        ELSE 'В норме'
    END AS stock_status,
    ROUND(remains / NULLIF(min_stock, 0), 2) AS coverage_ratio
FROM material
ORDER BY coverage_ratio ASC;

CREATE OR REPLACE VIEW vw_supplies_summary AS
SELECT 
    s.supply_id,
    s.date,
    p.provider_name,
    s.total_sum,
    s.status,
    COALESCE(e.full_name, 'Не назначен') AS administrator_name
FROM supply s
LEFT JOIN provider p ON s.provider_id = p.provider_id
LEFT JOIN employee e ON s.administrator_id = e.employee_id
ORDER BY s.date DESC;

CREATE OR REPLACE VIEW vw_monthly_profit AS
SELECT 
    TO_CHAR(r.date_and_time, 'YYYY-MM') AS month,
    COUNT(r.record_id) AS services_count,
    SUM(r.price) AS total_revenue,
    ROUND(AVG(r.price), 2) AS avg_receipt
FROM record r
WHERE r.status = 'Выполнено'
GROUP BY TO_CHAR(r.date_and_time, 'YYYY-MM')
ORDER BY month DESC;

-- ========== 6. ВНЕШНИЕ КЛЮЧИ ==========

ALTER TABLE consumes ADD CONSTRAINT FK_CONSUMES_CONSUMED_MATERIAL FOREIGN KEY (material_id) REFERENCES material(material_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE consumes ADD CONSTRAINT FK_CONSUMES_CONSUMES_SERVICE FOREIGN KEY (service_id) REFERENCES service(service_id) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE performs ADD CONSTRAINT FK_PERFORMS_EXECUTES_SERVICE FOREIGN KEY (service_id) REFERENCES service(service_id) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE performs ADD CONSTRAINT FK_PERFORMS_PERFORMS_EMPLOYEE FOREIGN KEY (master_id) REFERENCES employee(employee_id) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE record ADD CONSTRAINT FK_RECORD_CREATE_EMPLOYEE FOREIGN KEY (administrator_id) REFERENCES employee(employee_id) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE record ADD CONSTRAINT FK_RECORD_INCLUDE_SERVICE FOREIGN KEY (service_id) REFERENCES service(service_id) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE record ADD CONSTRAINT FK_RECORD_INVOLVES_EMPLOYEE FOREIGN KEY (master_id) REFERENCES employee(employee_id) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE record ADD CONSTRAINT FK_RECORD_POSSESSES_CLIENT FOREIGN KEY (client_id) REFERENCES client(client_id) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE record ADD CONSTRAINT FK_RECORD_TRIGGERS_TRANSACT FOREIGN KEY (transaction_id) REFERENCES transaction(transaction_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE supply ADD CONSTRAINT FK_SUPPLY_ACCEPTS_EMPLOYEE FOREIGN KEY (storekeeper_id) REFERENCES employee(employee_id) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE supply ADD CONSTRAINT FK_SUPPLY_REALIZE_PROVIDER FOREIGN KEY (provider_id) REFERENCES provider(provider_id) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE supply ADD CONSTRAINT FK_SUPPLY_REGISTER_EMPLOYEE FOREIGN KEY (administrator_id) REFERENCES employee(employee_id) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE supply_content ADD CONSTRAINT FK_SUPPLY_C_CONSISTS_SUPPLY FOREIGN KEY (supply_id) REFERENCES supply(supply_id) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE supply_content ADD CONSTRAINT FK_SUPPLY_C_CONTAINS_MATERIAL FOREIGN KEY (material_id) REFERENCES material(material_id) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE work_schedule ADD CONSTRAINT FK_WORK_SCH_HAVE_EMPLOYEE FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE ON UPDATE RESTRICT;

-- ========== 7. ДАННЫЕ ==========

TRUNCATE TABLE work_schedule, supply_content, supply, record, performs, consumes, transaction, service, provider, material, employee, client RESTART IDENTITY CASCADE;

INSERT INTO client (full_name, phone_number) VALUES
('Иванова Мария Сергеевна', '9151234567'),
('Петров Алексей Владимирович', '9262345678'),
('Сидорова Анна Дмитриевна', '9373456789'),
('Кузнецова Елена Игоревна', '9484567890'),
('Васильев Денис Петрович', '9595678901'),
('Николаева Ольга Андреевна', '9606789012'),
('Александров Иван Кириллович', '9717890123'),
('Морозова Татьяна Викторовна', '9828901234'),
('Семенов Павел Олегович', '9939012345'),
('Федорова Юлия Романовна', '9040123456'),
('Любанов Вадим Владимирович', '9158579067'),
('Жуков Максим Сергеевич', '9005920757'),
('Шацкий Матвей', '9204864345'),
('Путин Владимир Владимирович', '8005353535');

-- Пароль для всех (кроме супер-админа): "123"
-- Хеш сгенерирован через pgcrypto: crypt('123', gen_salt('bf'))
INSERT INTO employee (full_name, post, login, password_hash) VALUES
('Супер Администратор', 'СуперАдмин', 'superadmin', crypt('admin123', gen_salt('bf'))),
('Смирнова Анастасия Петровна', 'Администратор', 'admin1', crypt('123', gen_salt('bf'))),
('Волкова Ирина Сергеевна', 'Администратор', 'admin2', crypt('123', gen_salt('bf'))),
('Козлов Михаил Андреевич', 'Кладовщик', 'storekeeper1', crypt('123', gen_salt('bf'))),
('Орлова Светлана Дмитриевна', 'Парикмахер', 'master1', crypt('123', gen_salt('bf'))),
('Лебедев Артем Викторович', 'Парикмахер', 'master2', crypt('123', gen_salt('bf'))),
('Новикова Екатерина Игоревна', 'Мастер маникюра', 'master3', crypt('123', gen_salt('bf'))),
('Зайцева Марина Александровна', 'Визажист', 'master4', crypt('123', gen_salt('bf'))),
('Соколов Денис Олегович', 'Массажист', 'master5', crypt('123', gen_salt('bf'))),
('Попова Юлия', 'Администратор', 'admin3', crypt('123', gen_salt('bf'))),
('Кулакова Мария', 'Администратор', 'admin4', crypt('123', gen_salt('bf')));

INSERT INTO material (material_name, unit_of_measure, remains, min_stock) VALUES
('Шампунь для волос', 'л', 2.1, 2.5),
('Краска для волос Estel', 'л', 4.5, 1.0),
('Окислитель 6%', 'л', 3.0, 1.5),
('Лак для ногтей', 'шт', 27.0, 5.0),
('Гель-лак', 'шт', 20.0, 5.0),
('База под гель-лак', 'мл', 1200.0, 200.0),
('Топ для гель-лака', 'мл', 650.0, 200.0),
('Крем для лица', 'л', 3.0, 1.1),
('Тоник для лица', 'л', 1.8, 1.1),
('Масло для массажа', 'л', 2.3, 2.3),
('Одноразовые полотенца', 'шт', 503.0, 150.0),
('Перчатки нитриловые', 'шт', 142.0, 100.0),
('Салфетки косметические', 'шт', 999.0, 300.0),
('Фольга для мелирования', 'шт', 5.0, 1.0),
('Кондиционер для волос', 'л', 17.0, 1.5),
('Квас (для мастера)', 'л', 102.0, 1.0),
('Водичка', 'л', 110.0, 10.0);

INSERT INTO provider (provider_name, contact_person, phone_number, adress) VALUES
('ООО "ПрофБьюти"', 'Ковалева Анна', '9101234567', 'г. Липецк, ул. Шевченко, д. 15'),
('ИП "EcoStyle"', 'Попов Сергей', '9202345678', 'г. Липецк, ул. Космонавтов, д. 42'),
('ООО "ЧистыеРучки"', 'Медведева Ольга', '4953456789', 'г. Москва, ул. Новый Арбат, д. 21'),
('ООО "Эстель Рус"', 'Фролов Иван', '4954567890', 'г. Москва, Ленинградский пр-т, д. 68'),
('ИП "LorenaProfessional"', 'Григорьева Татьяна', '4955678901', 'г. Москва, ул. Правды, д. 24'),
('ООО "BeautyMask"', 'Шевченко Екатерина', '9154056849', 'г.Липецк, ул. Семашко, д. 29');

INSERT INTO service (service_name, service_category, price, duration) VALUES
('Стрижка длинных волос', 'Парикмахерские услуги', 1700, 90),
('Стрижка коротких волос', 'Парикмахерские услуги', 500, 40),
('Окрашивание волос', 'Парикмахерские услуги', 4500, 180),
('Мелирование', 'Парикмахерские услуги', 4500, 180),
('Классический маникюр', 'Ногтевой сервис', 2000, 90),
('Покрытие гель-лаком', 'Ногтевой сервис', 2500, 120),
('Массаж спины', 'Массаж', 3000, 60),
('Дневной макияж', 'Визаж', 2000, 60),
('Вечерний макияж', 'Визаж', 3500, 90);

INSERT INTO consumes (service_id, material_id) VALUES
(1,1),(1,11),
(2,1),(2,11),
(3,1),(3,2),(3,3),(3,11),(3,12),(3,14),
(4,1),(4,2),(4,3),(4,11),(4,12),(4,14),
(5,4),(5,13),(5,12),
(6,5),(6,6),(6,7),(6,12),(6,13),
(7,10),(7,11),
(8,8),(8,9),(8,13),
(9,8),(9,13);

INSERT INTO performs (service_id, master_id) VALUES
(1,5),(1,6),
(2,5),(2,6),
(3,5),(3,6),
(4,5),(4,6),
(5,7),
(6,7),
(7,9),
(8,8),
(9,8);

INSERT INTO transaction (sum, date_and_time, payment_method) VALUES
(2500, '2024-01-01 10:30:00', 'Наличные'),
(4500, '2024-01-01 14:15:00', 'Карта'),
(2000, '2024-02-02 11:00:00', 'Карта'),
(5500, '2024-02-02 15:45:00', 'Наличные'),
(1500, '2024-03-03 09:30:00', 'Карта'),
(3000, '2024-04-03 12:00:00', 'Карта'),
(2500, '2024-06-04 10:15:00', 'Наличные'),
(3500, '2024-07-04 16:30:00', 'Карта'),
(4500, '2024-08-05 13:20:00', 'Наличные'),
(2000, '2024-09-05 17:00:00', 'Карта'),
(5500, '2024-09-06 10:45:00', 'Карта'),
(1500, '2024-10-06 14:30:00', 'Наличные'),
(2500, '2024-11-07 11:15:00', 'Карта'),
(3000, '2025-01-07 15:00:00', 'Наличные'),
(2000, '2025-01-08 12:45:00', 'Карта'),
(4500, '2025-02-09 09:30:00', 'Наличные'),
(3500, '2025-04-09 13:15:00', 'Карта'),
(2500, '2025-07-10 10:00:00', 'Наличные'),
(5500, '2025-09-10 14:30:00', 'Карта'),
(1500, '2025-11-10 16:45:00', 'Карта'),
(3000, '2025-12-11 11:30:00', 'Карта'),
(1800, '2025-12-11 15:20:00', 'Наличные'),
(5500, '2025-12-12 10:15:00', 'Карта'),
(2500, '2025-12-12 14:45:00', 'Наличные'),
(2500, '2025-12-25 12:19:14.941755', 'Карта');

INSERT INTO record (service_id, transaction_id, master_id, administrator_id, client_id, date_and_time, status, price) VALUES
(1,1,5,2,1,'2024-01-01 10:00:00','Выполнено',2500),
(3,2,5,2,2,'2024-01-01 14:00:00','Выполнено',4500),
(5,3,7,3,3,'2024-02-02 11:00:00','Выполнено',2000),
(4,4,6,2,4,'2024-02-02 15:30:00','Выполнено',5500),
(2,5,6,3,5,'2024-03-03 09:00:00','Выполнено',1500),
(7,6,9,2,6,'2024-04-03 12:00:00','Выполнено',3000),
(6,7,7,3,7,'2024-06-04 10:00:00','Выполнено',2500),
(9,8,8,2,8,'2024-07-04 16:00:00','Выполнено',3500),
(3,9,6,3,9,'2024-08-05 13:00:00','Выполнено',4500),
(8,10,8,2,10,'2024-09-05 16:30:00','Выполнено',2000),
(4,11,5,3,1,'2024-09-06 10:30:00','Выполнено',5500),
(2,12,5,2,2,'2024-10-06 14:00:00','Выполнено',1500),
(1,13,6,3,3,'2024-11-07 11:00:00','Выполнено',2500),
(7,14,9,2,4,'2025-01-07 14:30:00','Выполнено',3000),
(5,15,7,3,5,'2025-01-08 12:30:00','Выполнено',2000),
(3,16,5,2,6,'2025-02-09 09:00:00','Выполнено',4500),
(9,17,8,3,7,'2025-04-09 13:00:00','Выполнено',3500),
(6,18,7,2,8,'2025-07-10 09:30:00','Выполнено',2500),
(4,19,6,3,9,'2025-09-10 14:00:00','Выполнено',5500),
(2,20,5,2,10,'2025-11-10 16:30:00','Выполнено',1500),
(1,21,5,2,3,'2025-12-11 11:00:00','В процессе',3000),
(6,25,7,3,5,'2025-12-11 15:00:00','Выполнено',2500),
(4,23,6,2,7,'2025-12-12 10:00:00','В процессе',5500),
(8,24,8,3,2,'2025-12-12 14:30:00','В процессе',2000);

INSERT INTO supply (administrator_id, provider_id, storekeeper_id, date, total_sum, status) VALUES
(2,1,4,'2024-01-15',25000.00,'принято'),
(3,2,4,'2024-05-20',18000.00,'принято'),
(2,3,4,'2024-10-25',27500.00,'принято'),
(3,4,4,'2025-03-30',15000.00,'принято'),
(2,5,4,'2025-09-05',10900.00,'принято'),
(3,5,4,'2025-12-29',504.00,'принято'),
(2,5,4,'2025-12-29',534.00,'принято'),
(3,5,4,'2025-12-29',634.00,'принято'),
(2,3,4,'2025-12-29',200.00,'оформлено'),
(2,1,4,'2025-12-30',100.00,'оформлено'),
(3,5,4,'2025-12-10',1800.00,'принято'),
(2,6,4,'2025-12-20',1600.00,'принято'),
(3,2,4,'2025-12-11',1.00,'отклонено'),
(2,2,4,'2025-10-29',100.00,'принято');

INSERT INTO supply_content (supply_id, material_id, position_incount, position_price) VALUES
(1,1,20,500.00),(1,2,15,800.00),(1,3,25,300.00),
(2,4,100,150.00),(2,5,80,200.00),(2,6,10,700.00),
(3,7,10,650.00),(3,9,12,750.00),(3,8,10,900.00),
(4,10,20,450.00),(4,11,500,5.00),(4,12,800,3.00),
(5,13,900,2.00),(5,14,200,8.00),(5,1,25,520.00),(5,10,20,470.00),(5,9,3,900.00),
(6,5,1,100.00),(6,15,1,200.00),(6,4,1,200.00),(6,11,1,1.00),(6,12,1,3.00),
(7,5,1,100.00),(7,15,1,200.00),(7,4,1,200.00),(7,11,1,1.00),(7,12,1,3.00),(7,2,1,30.00),
(8,5,1,100.00),(8,15,1,200.00),(8,4,1,200.00),(8,11,1,1.00),(8,12,1,3.00),(8,2,1,30.00),(8,6,1,100.00),
(9,6,1,200.00),(10,16,1,100.00),(11,15,9,200.00),(12,6,8,200.00),(13,16,1,1.00),(14,15,1,100.00);

-- Генерация work_schedule на 17.05.2026 — 20.06.2026
DO $$
DECLARE
    master_ids INTEGER[] := ARRAY[5,6,7,8,9];
    v_date DATE := '2026-05-17';
    v_end_date DATE := '2026-06-20';
    m INTEGER;
BEGIN
    WHILE v_date <= v_end_date LOOP
        FOREACH m IN ARRAY master_ids LOOP
            INSERT INTO work_schedule (employee_id, date, start_time, end_time)
            VALUES (m, v_date, '10:00:00', '20:00:00');
        END LOOP;
        v_date := v_date + 1;
    END LOOP;
END $$;

-- Сброс последовательностей
SELECT setval('client_client_id_seq', (SELECT MAX(client_id) FROM client));
SELECT setval('employee_employee_id_seq', (SELECT MAX(employee_id) FROM employee));
SELECT setval('material_material_id_seq', (SELECT MAX(material_id) FROM material));
SELECT setval('provider_provider_id_seq', (SELECT MAX(provider_id) FROM provider));
SELECT setval('service_service_id_seq', (SELECT MAX(service_id) FROM service));
SELECT setval('transaction_transaction_id_seq', (SELECT MAX(transaction_id) FROM transaction));
SELECT setval('record_record_id_seq', (SELECT MAX(record_id) FROM record));
SELECT setval('supply_supply_id_seq', (SELECT MAX(supply_id) FROM supply));
SELECT setval('work_schedule_period_id_seq', (SELECT MAX(period_id) FROM work_schedule));