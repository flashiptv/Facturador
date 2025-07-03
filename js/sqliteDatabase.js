// Base de datos SQLite para la aplicación Facturador
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class SQLiteDatabase {
    constructor() {
        this.dbPath = path.join(app?.getPath('userData') || require('os').homedir(), 'facturador.db');
        this.db = null;
        this.init();
    }

    async init() {
        try {
            // Asegurar que el directorio existe
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Conectar a la base de datos
            this.db = new Database(this.dbPath, { verbose: console.log });

            // Habilitar foreign keys
            this.db.pragma('foreign_keys = ON');

            // Crear tablas
            await this.createTables();
            
            console.log('Base de datos inicializada correctamente');
        } catch (error) {
            console.error('Error al inicializar la base de datos:', error);
            throw error;
        }
    }

    async createTables() {
        const createTablesSQL = [
            // Tabla de usuarios
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabla de clientes
            `CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                email TEXT,
                telefono TEXT,
                direccion TEXT,
                ciudad TEXT,
                codigo_postal TEXT,
                nif_cif TEXT,
                notas TEXT,
                activo BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabla de productos/servicios
            `CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT UNIQUE,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                precio DECIMAL(10,2) NOT NULL,
                categoria TEXT,
                unidad TEXT DEFAULT 'ud',
                iva_percentage DECIMAL(5,2) DEFAULT 21.00,
                activo BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabla de facturas
            `CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero TEXT UNIQUE NOT NULL,
                client_id INTEGER NOT NULL,
                fecha_emision DATE NOT NULL,
                fecha_vencimiento DATE,
                subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
                total_iva DECIMAL(10,2) NOT NULL DEFAULT 0,
                total DECIMAL(10,2) NOT NULL DEFAULT 0,
                descuento DECIMAL(10,2) DEFAULT 0,
                estado TEXT DEFAULT 'borrador' CHECK(estado IN ('borrador', 'enviada', 'pagada', 'vencida', 'cancelada')),
                notas TEXT,
                condiciones_pago TEXT,
                metodo_pago TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients (id)
            )`,

            // Tabla de líneas de factura
            `CREATE TABLE IF NOT EXISTS invoice_lines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER NOT NULL,
                product_id INTEGER,
                concepto TEXT NOT NULL,
                descripcion TEXT,
                cantidad DECIMAL(10,3) NOT NULL DEFAULT 1,
                precio_unitario DECIMAL(10,2) NOT NULL,
                descuento DECIMAL(5,2) DEFAULT 0,
                iva_percentage DECIMAL(5,2) DEFAULT 21.00,
                subtotal DECIMAL(10,2) NOT NULL,
                total_iva DECIMAL(10,2) NOT NULL,
                total DECIMAL(10,2) NOT NULL,
                orden INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`,

            // Tabla de archivos adjuntos
            `CREATE TABLE IF NOT EXISTS file_attachments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_name TEXT NOT NULL,
                stored_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                mime_type TEXT,
                file_extension TEXT,
                related_type TEXT CHECK(related_type IN ('invoice', 'client', 'general')),
                related_id INTEGER,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabla de configuración
            `CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                category TEXT DEFAULT 'general',
                description TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabla de log de actividades
            `CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                entity_type TEXT,
                entity_id INTEGER,
                description TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`
        ];

        for (const sql of createTablesSQL) {
            await this.run(sql);
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
            await this.run(sql);
        }
    }

    // Wrapper para convertir callbacks a promises
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            try {
                const stmt = this.db.prepare(sql);
                const result = stmt.run(params);
                resolve(result);
            } catch (err) {
                console.error('Error running SQL:', sql, params, err);
                reject(err);
            }
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            try {
                const stmt = this.db.prepare(sql);
                const result = stmt.get(params);
                resolve(result);
            } catch (err) {
                console.error('Error getting SQL:', sql, params, err);
                reject(err);
            }
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            try {
                const stmt = this.db.prepare(sql);
                const result = stmt.all(params);
                resolve(result);
            } catch (err) {
                console.error('Error getting all SQL:', sql, params, err);
                reject(err);
            }
        });
    }

    // Métodos específicos para cada entidad

    // USUARIOS
    async createUser(userData) {
        const sql = `INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)`;
        const result = await this.run(sql, [userData.email, userData.name, userData.password, userData.role || 'user']);
        return this.getUserById(result.lastInsertRowid); // Corrected to use lastInsertRowid
    }

    async getUserByEmail(email) {
        const query = `SELECT * FROM users WHERE email = ?`; // Removed 'AND activo = 1' as 'activo' column doesn't exist in schema
        return await this.get(query, [email]);
    }

    async getUserById(id) {
        const query = `SELECT * FROM users WHERE id = ?`; // Removed 'AND activo = 1' as 'activo' column doesn't exist in schema
        return await this.get(query, [id]);
    }

    async updateUserLastLogin(userId) {
        const query = `UPDATE users SET fecha_ultimo_acceso = datetime('now') WHERE id = ?`;
        const result = await this.run(query, [userId]);
        return result.changes > 0;
    }

    async updateUserPassword(userId, newPasswordHash) {
        const query = `UPDATE users SET password_hash = ?, fecha_actualizacion = datetime('now') WHERE id = ?`;
        const result = await this.run(query, [newPasswordHash, userId]);
        return result.changes > 0;
    }

    async deactivateUser(userId) {
        const query = `UPDATE users SET activo = 0, fecha_actualizacion = datetime('now') WHERE id = ?`;
        const result = await this.run(query, [userId]);
        return result.changes > 0;
    }

    async getAllUsers() {
        const sql = `SELECT id, email, name, role, created_at FROM users ORDER BY name`;
        return await this.all(sql);
    }

    // CLIENTES
    async createClient(clientData) {
        const sql = `INSERT INTO clients (nombre, email, telefono, direccion, ciudad, codigo_postal, nif_cif, notas) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const result = await this.run(sql, [
            clientData.nombre,
            clientData.email,
            clientData.telefono,
            clientData.direccion,
            clientData.ciudad,
            clientData.codigo_postal,
            clientData.nif_cif,
            clientData.notas
        ]);
        return this.getClientById(result.id);
    }

    async getClientById(id) {
        const sql = `SELECT * FROM clients WHERE id = ?`;
        return await this.get(sql, [id]);
    }

    async getAllClients() {
        const sql = `SELECT * FROM clients WHERE activo = 1 ORDER BY nombre`;
        return await this.all(sql);
    }

    async updateClient(id, clientData) {
        const sql = `UPDATE clients SET nombre = ?, email = ?, telefono = ?, direccion = ?, 
                     ciudad = ?, codigo_postal = ?, nif_cif = ?, notas = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`;
        await this.run(sql, [
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
        return this.getClientById(id);
    }

    async deleteClient(id) {
        const sql = `UPDATE clients SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        return await this.run(sql, [id]);
    }

    async searchClients(searchTerm) {
        const sql = `SELECT * FROM clients WHERE activo = 1 AND 
                     (nombre LIKE ? OR email LIKE ? OR telefono LIKE ?) 
                     ORDER BY nombre`;
        const term = `%${searchTerm}%`;
        return await this.all(sql, [term, term, term]);
    }

    // PRODUCTOS
    async createProduct(productData) {
        const sql = `INSERT INTO products (codigo, nombre, descripcion, precio, categoria, unidad, iva_percentage) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const result = await this.run(sql, [
            productData.codigo,
            productData.nombre,
            productData.descripcion,
            productData.precio,
            productData.categoria,
            productData.unidad || 'ud',
            productData.iva_percentage || 21.00
        ]);
        return this.getProductById(result.id);
    }

    async getProductById(id) {
        const sql = `SELECT * FROM products WHERE id = ?`;
        return await this.get(sql, [id]);
    }

    async getAllProducts() {
        const sql = `SELECT * FROM products WHERE activo = 1 ORDER BY nombre`;
        return await this.all(sql);
    }

    // FACTURAS
    async createInvoice(invoiceData) {
        const sql = `INSERT INTO invoices (numero, client_id, fecha_emision, fecha_vencimiento, 
                     subtotal, total_iva, total, descuento, estado, notas, condiciones_pago, metodo_pago) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const result = await this.run(sql, [
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
        return this.getInvoiceById(result.id);
    }

    async getInvoiceById(id) {
        const sql = `SELECT i.*, c.nombre as client_name, c.email as client_email 
                     FROM invoices i 
                     LEFT JOIN clients c ON i.client_id = c.id 
                     WHERE i.id = ?`;
        return await this.get(sql, [id]);
    }

    async getAllInvoices() {
        const sql = `SELECT i.*, c.nombre as client_name 
                     FROM invoices i 
                     LEFT JOIN clients c ON i.client_id = c.id 
                     ORDER BY i.fecha_emision DESC`;
        return await this.all(sql);
    }

    async getInvoices() {
        const query = `
            SELECT 
                i.*,
                c.nombre as cliente_nombre,
                c.email as cliente_email
            FROM invoices i
            LEFT JOIN clients c ON i.cliente_id = c.id
            ORDER BY i.fecha_emision DESC
        `;
        return await this.all(query);
    }

    async updateInvoiceStatus(id, status) {
        const query = `UPDATE invoices SET estado = ?, fecha_actualizacion = datetime('now') WHERE id = ?`;
        const result = await this.run(query, [status, id]);
        return result.changes > 0;
    }

    async getInvoiceLines(invoiceId) {
        const sql = `SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY orden, id`;
        return await this.all(sql, [invoiceId]);
    }

    async addInvoiceLine(invoiceId, lineData) {
        const sql = `INSERT INTO invoice_lines (invoice_id, product_id, concepto, descripcion, 
                     cantidad, precio_unitario, descuento, iva_percentage, subtotal, total_iva, total, orden) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        return await this.run(sql, [
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
        const sql = `SELECT COUNT(*) as count FROM invoices WHERE numero LIKE ?`;
        const result = await this.get(sql, [`FAC-${year}-%`]);
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
        const sql = `SELECT * FROM file_attachments WHERE id = ?`;
        return await this.get(sql, [id]);
    }

    async getAllFileAttachments() {
        const sql = `SELECT * FROM file_attachments ORDER BY created_at DESC`;
        return await this.all(sql);
    }

    async getFileAttachmentsByRelated(relatedType, relatedId) {
        const sql = `SELECT * FROM file_attachments WHERE related_type = ? AND related_id = ? ORDER BY created_at`;
        return await this.all(sql, [relatedType, relatedId]);
    }

    async deleteFileAttachment(id) {
        const sql = `DELETE FROM file_attachments WHERE id = ?`;
        return await this.run(sql, [id]);
    }

    async saveFileAttachment(invoiceId, fileName, filePath, fileSize, mimeType) {
        const query = `
            INSERT INTO file_attachments (invoice_id, file_name, file_path, file_size, mime_type, fecha_subida)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `;
        const result = await this.run(query, [invoiceId, fileName, filePath, fileSize, mimeType]);
        return result.lastID;
    }

    async getFileAttachments(invoiceId) {
        const query = `SELECT * FROM file_attachments WHERE invoice_id = ? ORDER BY fecha_subida DESC`;
        return await this.all(query, [invoiceId]);
    }

    async deleteFileAttachment(id) {
        const query = `DELETE FROM file_attachments WHERE id = ?`;
        const result = await this.run(query, [id]);
        return result.changes > 0;
    }

    // CONFIGURACIÓN
    async setSetting(key, value, category = 'general', description = null) {
        const sql = `INSERT OR REPLACE INTO settings (key, value, category, description, updated_at) 
                     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
        return await this.run(sql, [key, value, category, description]);
    }

    async getSetting(key) {
        const sql = `SELECT value FROM settings WHERE key = ?`;
        const result = await this.get(sql, [key]);
        return result ? result.value : null;
    }

    async getAllSettings(category = null) {
        let sql = `SELECT * FROM settings`;
        let params = [];
        
        if (category) {
            sql += ` WHERE category = ?`;
            params.push(category);
        }
        
        sql += ` ORDER BY category, key`;
        return await this.all(sql, params);
    }

    // LOG DE ACTIVIDADES
    async logActivity(userId, action, entityType = null, entityId = null, description = null) {
        const sql = `INSERT INTO activity_log (user_id, action, entity_type, entity_id, description) 
                     VALUES (?, ?, ?, ?, ?)`;
        return await this.run(sql, [userId, action, entityType, entityId, description]);
    }

    async getActivityLog(limit = 100) {
        const sql = `SELECT al.*, u.name as user_name 
                     FROM activity_log al 
                     LEFT JOIN users u ON al.user_id = u.id 
                     ORDER BY al.created_at DESC 
                     LIMIT ?`;
        return await this.all(sql, [limit]);
    }

    // ESTADÍSTICAS
    async getDashboardStats() {
        const stats = {};
        
        // Total de clientes
        const clientsResult = await this.get(`SELECT COUNT(*) as count FROM clients WHERE activo = 1`);
        stats.totalClients = clientsResult.count;
        
        // Total de facturas
        const invoicesResult = await this.get(`SELECT COUNT(*) as count FROM invoices`);
        stats.totalInvoices = invoicesResult.count;
        
        // Facturas pendientes
        const pendingResult = await this.get(`SELECT COUNT(*) as count FROM invoices WHERE estado = 'enviada'`);
        stats.pendingInvoices = pendingResult.count;
        
        // Ingresos totales
        const revenueResult = await this.get(`SELECT SUM(total) as total FROM invoices WHERE estado = 'pagada'`);
        stats.totalRevenue = revenueResult.total || 0;
        
        // Facturas este mes
        const thisMonthResult = await this.get(`
            SELECT COUNT(*) as count FROM invoices 
            WHERE strftime('%Y-%m', fecha_emision) = strftime('%Y-%m', 'now')
        `);
        stats.invoicesThisMonth = thisMonthResult.count;
        
        return stats;
    }

    // Cerrar conexión
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error al cerrar la base de datos:', err);
                } else {
                    console.log('Conexión a la base de datos cerrada');
                }
            });
        }
    }
}

module.exports = SQLiteDatabase;
