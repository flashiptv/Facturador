// Base de datos PostgreSQL para la aplicación Facturador
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class PostgreSQLDatabase {
    constructor() {
        // Configuración de conexión PostgreSQL
        this.pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'facturador',
            password: process.env.DB_PASSWORD || 'postgres',
            port: process.env.DB_PORT || 5432,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        this.init();
    }

    async init() {
        try {
            // Probar la conexión con timeout
            const client = await Promise.race([
                this.pool.connect(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout de conexión')), 5000)
                )
            ]);
            console.log('Conectado a PostgreSQL exitosamente');
            client.release();

            // Crear tablas
            await this.createTables();

            console.log('Base de datos PostgreSQL inicializada correctamente');
        } catch (error) {
            console.error('Error al inicializar la base de datos PostgreSQL:', error);
            console.log('Sugerencia: Asegúrese de que PostgreSQL esté ejecutándose en localhost:5432');
            console.log('O ejecute: docker run --name facturador-postgres -e POSTGRES_DB=facturador -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:13');
            throw error;
        }
    }

    async createTables() {
        const createTablesSQL = [
            // Tabla de usuarios
            `CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabla de clientes
            `CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                telefono VARCHAR(50),
                direccion TEXT,
                ciudad VARCHAR(100),
                codigo_postal VARCHAR(20),
                nif_cif VARCHAR(50),
                notas TEXT,
                activo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabla de productos/servicios
            `CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                codigo VARCHAR(100) UNIQUE,
                nombre VARCHAR(255) NOT NULL,
                descripcion TEXT,
                precio DECIMAL(10,2) NOT NULL,
                categoria VARCHAR(100),
                unidad VARCHAR(20) DEFAULT 'ud',
                iva_percentage DECIMAL(5,2) DEFAULT 21.00,
                activo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabla de facturas
            `CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                numero VARCHAR(100) UNIQUE NOT NULL,
                client_id INTEGER NOT NULL,
                fecha_emision DATE NOT NULL,
                fecha_vencimiento DATE,
                subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
                total_iva DECIMAL(10,2) NOT NULL DEFAULT 0,
                total DECIMAL(10,2) NOT NULL DEFAULT 0,
                descuento DECIMAL(10,2) DEFAULT 0,
                estado VARCHAR(20) DEFAULT 'borrador' CHECK(estado IN ('borrador', 'enviada', 'pagada', 'vencida', 'cancelada')),
                notas TEXT,
                condiciones_pago TEXT,
                metodo_pago VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients (id)
            )`,

            // Tabla de líneas de factura
            `CREATE TABLE IF NOT EXISTS invoice_lines (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER NOT NULL,
                product_id INTEGER,
                concepto VARCHAR(255) NOT NULL,
                descripcion TEXT,
                cantidad DECIMAL(10,3) NOT NULL DEFAULT 1,
                precio_unitario DECIMAL(10,2) NOT NULL,
                descuento DECIMAL(5,2) DEFAULT 0,
                iva_percentage DECIMAL(5,2) DEFAULT 21.00,
                subtotal DECIMAL(10,2) NOT NULL,
                total_iva DECIMAL(10,2) NOT NULL,
                total DECIMAL(10,2) NOT NULL,
                orden INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`,

            // Tabla de archivos adjuntos
            `CREATE TABLE IF NOT EXISTS file_attachments (
                id SERIAL PRIMARY KEY,
                original_name VARCHAR(255) NOT NULL,
                stored_name VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                file_size BIGINT NOT NULL,
                mime_type VARCHAR(100),
                file_extension VARCHAR(20),
                related_type VARCHAR(20) CHECK(related_type IN ('invoice', 'client', 'general')),
                related_id INTEGER,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabla de configuración
            `CREATE TABLE IF NOT EXISTS settings (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT,
                category VARCHAR(50) DEFAULT 'general',
                description TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabla de log de actividades
            `CREATE TABLE IF NOT EXISTS activity_log (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50),
                entity_id INTEGER,
                description TEXT,
                ip_address INET,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`
        ];

        for (const sql of createTablesSQL) {
            await this.query(sql);
        }

        // Crear índices para mejorar el rendimiento
        const createIndexesSQL = [
            'CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email)',
            'CREATE INDEX IF NOT EXISTS idx_invoices_numero ON invoices(numero)',
            'CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id)',
            'CREATE INDEX IF NOT EXISTS idx_invoices_fecha_emision ON invoices(fecha_emision)',
            'CREATE INDEX IF NOT EXISTS idx_invoices_estado ON invoices(estado)',
            'CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id)',
            'CREATE INDEX IF NOT EXISTS idx_file_attachments_related ON file_attachments(related_type, related_id)',
            'CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at)'
        ];

        for (const sql of createIndexesSQL) {
            await this.query(sql);
        }
    }

    // Métodos para ejecutar consultas PostgreSQL
    async query(text, params = []) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(text, params);
            return result;
        } catch (err) {
            console.error('Error executing query:', text, params, err);
            throw err;
        } finally {
            client.release();
        }
    }

    async queryOne(text, params = []) {
        const result = await this.query(text, params);
        return result.rows[0] || null;
    }

    async queryMany(text, params = []) {
        const result = await this.query(text, params);
        return result.rows;
    }

    // Métodos específicos para cada entidad

    // USUARIOS
    async createUser(userData) {
        const { name, email, password } = userData;
        const sql = `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *`;
        try {
            const result = await this.queryOne(sql, [name, email, password]);
            return result;
        } catch (error) {
            console.error('Error al crear usuario:', error);
            throw error;
        }
    }

    async getUserByEmail(email) {
        const query = `SELECT * FROM users WHERE email = $1`;
        return await this.queryOne(query, [email]);
    }

    async getUserById(id) {
        const query = `SELECT * FROM users WHERE id = $1`;
        return await this.queryOne(query, [id]);
    }

    async updateUserLastLogin(userId) {
        const query = `UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
        const result = await this.query(query, [userId]);
        return result.rowCount > 0;
    }

    async updateUserPassword(userId, newPasswordHash) {
        const query = `UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        const result = await this.query(query, [newPasswordHash, userId]);
        return result.rowCount > 0;
    }

    async deactivateUser(userId) {
        const query = `UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
        const result = await this.query(query, [userId]);
        return result.rowCount > 0;
    }

    async getAllUsers() {
        const sql = `SELECT id, email, name, role, created_at FROM users ORDER BY name`;
        return await this.queryMany(sql);
    }

    // CLIENTES
    async createClient(clientData) {
        const sql = `INSERT INTO clients (nombre, email, telefono, direccion, ciudad, codigo_postal, nif_cif, notas)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
        const result = await this.queryOne(sql, [
            clientData.nombre,
            clientData.email,
            clientData.telefono,
            clientData.direccion,
            clientData.ciudad,
            clientData.codigo_postal,
            clientData.nif_cif,
            clientData.notas
        ]);
        return result;
    }

    async getClientById(id) {
        const sql = `SELECT * FROM clients WHERE id = $1`;
        return await this.queryOne(sql, [id]);
    }

    async getAllClients() {
        const sql = `SELECT * FROM clients WHERE activo = true ORDER BY nombre`;
        return await this.queryMany(sql);
    }

    async updateClient(id, clientData) {
        const sql = `UPDATE clients SET nombre = $1, email = $2, telefono = $3, direccion = $4,
                     ciudad = $5, codigo_postal = $6, nif_cif = $7, notas = $8, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $9 RETURNING *`;
        const result = await this.queryOne(sql, [
            clientData.nombre,
            clientData.email,
            clientData.telefono,
            clientData.direccion,
            clientData.ciudad,
            clientData.codigo_postal,
            clientData.nif_cif,
            clientData.notas,
            id
        ]);
        return result;
    }

    async deleteClient(id) {
        const sql = `UPDATE clients SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
        const result = await this.query(sql, [id]);
        return result.rowCount > 0;
    }

    async searchClients(searchTerm) {
        const sql = `SELECT * FROM clients WHERE activo = true AND
                     (nombre ILIKE $1 OR email ILIKE $2 OR telefono ILIKE $3)
                     ORDER BY nombre`;
        const term = `%${searchTerm}%`;
        return await this.queryMany(sql, [term, term, term]);
    }

    // PRODUCTOS
    async createProduct(productData) {
        const sql = `INSERT INTO products (codigo, nombre, descripcion, precio, categoria, unidad, iva_percentage)
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
        const result = await this.queryOne(sql, [
            productData.codigo,
            productData.nombre,
            productData.descripcion,
            productData.precio,
            productData.categoria,
            productData.unidad || 'ud',
            productData.iva_percentage || 21.00
        ]);
        return result;
    }

    async getProductById(id) {
        const sql = `SELECT * FROM products WHERE id = $1`;
        return await this.queryOne(sql, [id]);
    }

    async getAllProducts() {
        const sql = `SELECT * FROM products WHERE activo = true ORDER BY nombre`;
        return await this.queryMany(sql);
    }

    async updateProduct(id, productData) {
        const sql = `UPDATE products
                     SET codigo = $1, nombre = $2, descripcion = $3, precio = $4,
                         categoria = $5, unidad = $6, iva_percentage = $7, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $8 RETURNING *`;
        const result = await this.queryOne(sql, [
            productData.codigo,
            productData.nombre,
            productData.descripcion,
            productData.precio,
            productData.categoria,
            productData.unidad || 'ud',
            productData.iva_percentage || 21.00,
            id
        ]);
        return result;
    }

    async deleteProduct(id) {
        const sql = `UPDATE products SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
        const result = await this.query(sql, [id]);
        return result.rowCount > 0;
    }

    // FACTURAS
    async createInvoice(invoiceData) {
        const sql = `INSERT INTO invoices (numero, client_id, fecha_emision, fecha_vencimiento,
                     subtotal, total_iva, total, descuento, estado, notas, condiciones_pago, metodo_pago)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`;
        const result = await this.queryOne(sql, [
            invoiceData.numero,
            invoiceData.client_id,
            invoiceData.fecha_emision,
            invoiceData.fecha_vencimiento,
            invoiceData.subtotal || 0,
            invoiceData.total_iva || 0,
            invoiceData.total || 0,
            invoiceData.descuento || 0,
            invoiceData.estado || 'borrador',
            invoiceData.notas,
            invoiceData.condiciones_pago,
            invoiceData.metodo_pago
        ]);
        return result;
    }

    async getInvoiceById(id) {
        const sql = `SELECT i.*, c.nombre as client_name, c.email as client_email
                     FROM invoices i
                     LEFT JOIN clients c ON i.client_id = c.id
                     WHERE i.id = $1`;
        return await this.queryOne(sql, [id]);
    }

    async getAllInvoices() {
        const sql = `SELECT i.*, c.nombre as client_name
                     FROM invoices i
                     LEFT JOIN clients c ON i.client_id = c.id
                     ORDER BY i.fecha_emision DESC`;
        return await this.queryMany(sql);
    }

    async getInvoices() {
        const query = `
            SELECT
                i.*,
                c.nombre as cliente_nombre,
                c.email as cliente_email
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            ORDER BY i.fecha_emision DESC
        `;
        return await this.queryMany(query);
    }

    async updateInvoiceStatus(id, status) {
        const query = `UPDATE invoices SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        const result = await this.query(query, [status, id]);
        return result.rowCount > 0;
    }

    async getInvoiceLines(invoiceId) {
        const sql = `SELECT * FROM invoice_lines WHERE invoice_id = $1 ORDER BY orden, id`;
        return await this.queryMany(sql, [invoiceId]);
    }

    async addInvoiceLine(invoiceId, lineData) {
        const sql = `INSERT INTO invoice_lines (invoice_id, product_id, concepto, descripcion,
                     cantidad, precio_unitario, descuento, iva_percentage, subtotal, total_iva, total, orden)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`;
        return await this.queryOne(sql, [
            invoiceId,
            lineData.product_id,
            lineData.concepto,
            lineData.descripcion,
            lineData.cantidad,
            lineData.precio_unitario,
            lineData.descuento || 0,
            lineData.iva_percentage || 21.00,
            lineData.subtotal,
            lineData.total_iva,
            lineData.total,
            lineData.orden || 0
        ]);
    }

    async generateNextInvoiceNumber() {
        const year = new Date().getFullYear();
        const sql = `SELECT COUNT(*) as count FROM invoices WHERE numero LIKE $1`;
        const result = await this.queryOne(sql, [`FAC-${year}-%`]);
        const nextNumber = (result.count + 1).toString().padStart(4, '0');
        return `FAC-${year}-${nextNumber}`;
    }

    // ARCHIVOS
    async saveFileAttachment(fileData) {
        const sql = `INSERT INTO file_attachments (original_name, stored_name, file_path, file_size, 
                     mime_type, file_extension, related_type, related_id, description) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const result = await this.run(sql, [
            fileData.original_name,
            fileData.stored_name,
            fileData.file_path,
            fileData.file_size,
            fileData.mime_type,
            fileData.file_extension,
            fileData.related_type,
            fileData.related_id,
            fileData.description
        ]);
        return this.getFileAttachmentById(result.id);
    }

    async getFileAttachmentById(id) {
        const sql = `SELECT * FROM file_attachments WHERE id = $1`;
        return await this.queryOne(sql, [id]);
    }

    async getAllFileAttachments() {
        const sql = `SELECT * FROM file_attachments ORDER BY created_at DESC`;
        return await this.queryMany(sql);
    }

    async getFileAttachmentsByRelated(relatedType, relatedId) {
        const sql = `SELECT * FROM file_attachments WHERE related_type = $1 AND related_id = $2 ORDER BY created_at`;
        return await this.queryMany(sql, [relatedType, relatedId]);
    }

    async saveFileAttachment(invoiceId, fileName, filePath, fileSize, mimeType) {
        const query = `
            INSERT INTO file_attachments (invoice_id, file_name, file_path, file_size, mime_type, created_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING id
        `;
        const result = await this.queryOne(query, [invoiceId, fileName, filePath, fileSize, mimeType]);
        return result ? result.id : null;
    }

    async getFileAttachments(invoiceId) {
        const query = `SELECT * FROM file_attachments WHERE invoice_id = $1 ORDER BY created_at DESC`;
        return await this.queryMany(query, [invoiceId]);
    }

    async deleteFileAttachment(id) {
        const query = `DELETE FROM file_attachments WHERE id = $1`;
        const result = await this.query(query, [id]);
        return result.rowCount > 0;
    }

    // CONFIGURACIÓN
    async setSetting(key, value, category = 'general', description = null) {
        const sql = `INSERT INTO settings (key, value, category, description, updated_at)
                     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                     ON CONFLICT (key) DO UPDATE SET
                     value = EXCLUDED.value,
                     category = EXCLUDED.category,
                     description = EXCLUDED.description,
                     updated_at = CURRENT_TIMESTAMP`;
        const result = await this.query(sql, [key, value, category, description]);
        return result.rowCount > 0;
    }

    async getSetting(key) {
        const sql = `SELECT value FROM settings WHERE key = $1`;
        const result = await this.queryOne(sql, [key]);
        return result ? result.value : null;
    }

    async getAllSettings(category = null) {
        let sql = `SELECT * FROM settings`;
        let params = [];

        if (category) {
            sql += ` WHERE category = $1`;
            params.push(category);
        }

        sql += ` ORDER BY category, key`;
        return await this.queryMany(sql, params);
    }

    // LOG DE ACTIVIDADES
    async logActivity(userId, action, entityType = null, entityId = null, description = null) {
        const sql = `INSERT INTO activity_log (user_id, action, entity_type, entity_id, description)
                     VALUES ($1, $2, $3, $4, $5)`;
        const result = await this.query(sql, [userId, action, entityType, entityId, description]);
        return result.rowCount > 0;
    }

    async getActivityLog(limit = 100) {
        const sql = `SELECT al.*, u.name as user_name
                     FROM activity_log al
                     LEFT JOIN users u ON al.user_id = u.id
                     ORDER BY al.created_at DESC
                     LIMIT $1`;
        return await this.queryMany(sql, [limit]);
    }

    // ESTADÍSTICAS
    async getDashboardStats() {
        const stats = {};

        // Total de clientes
        const clientsResult = await this.queryOne(`SELECT COUNT(*) as count FROM clients WHERE activo = true`);
        stats.totalClients = clientsResult.count;

        // Total de facturas
        const invoicesResult = await this.queryOne(`SELECT COUNT(*) as count FROM invoices`);
        stats.totalInvoices = invoicesResult.count;

        // Facturas pendientes
        const pendingResult = await this.queryOne(`SELECT COUNT(*) as count FROM invoices WHERE estado = 'enviada'`);
        stats.pendingInvoices = pendingResult.count;

        // Ingresos totales
        const revenueResult = await this.queryOne(`SELECT SUM(total) as total FROM invoices WHERE estado = 'pagada'`);
        stats.totalRevenue = revenueResult.total || 0;

        // Facturas este mes
        const thisMonthResult = await this.queryOne(`
            SELECT COUNT(*) as count FROM invoices
            WHERE DATE_TRUNC('month', fecha_emision) = DATE_TRUNC('month', CURRENT_DATE)
        `);
        stats.invoicesThisMonth = thisMonthResult.count;

        return stats;
    }

    // Settings methods
    async saveCompanySettings(companyData) {
        try {
            for (const [key, value] of Object.entries(companyData)) {
                await this.setSetting(key, value, 'company');
            }
            return { success: true };
        } catch (error) {
            console.error('Error saving company settings:', error);
            throw error;
        }
    }

    async saveInvoiceSettings(invoiceSettings) {
        try {
            for (const [key, value] of Object.entries(invoiceSettings)) {
                await this.setSetting(key, value, 'invoice');
            }
            return { success: true };
        } catch (error) {
            console.error('Error saving invoice settings:', error);
            throw error;
        }
    }

    async getAppSettings() {
        try {
            const settings = await this.getAllSettings();

            const result = {
                company: {},
                invoice: {}
            };

            settings.forEach(setting => {
                if (setting.key.startsWith('company_')) {
                    result.company[setting.key] = setting.value;
                } else if (setting.key.startsWith('invoice_') || setting.key.startsWith('default_')) {
                    result.invoice[setting.key] = setting.value;
                }
            });

            // Si no hay configuración de empresa, crear valores por defecto
            if (Object.keys(result.company).length === 0) {
                await this.setDefaultCompanySettings();
                return this.getAppSettings(); // Recursively call to get the new defaults
            }

            return result;
        } catch (error) {
            console.error('Error getting app settings:', error);
            return {};
        }
    }

    async setDefaultCompanySettings() {
        try {
            const defaultSettings = [
                { key: 'company_name', value: 'MI EMPRESA S.L.' },
                { key: 'company_address', value: 'Calle Principal, 123 - 28001 Madrid' },
                { key: 'company_nif', value: 'B12345678' },
                { key: 'company_phone', value: '+34 91 123 45 67' },
                { key: 'company_email', value: 'contacto@miempresa.com' }
            ];

            for (const setting of defaultSettings) {
                await this.setSetting(setting.key, setting.value, 'company');
            }

            console.log('Default company settings created');
        } catch (error) {
            console.error('Error setting default company settings:', error);
        }
    }

    // Cerrar conexión
    async close() {
        if (this.pool) {
            try {
                await this.pool.end();
                console.log('Pool de conexiones PostgreSQL cerrado');
            } catch (err) {
                console.error('Error al cerrar el pool de conexiones:', err);
            }
        }
    }
}

module.exports = PostgreSQLDatabase;
