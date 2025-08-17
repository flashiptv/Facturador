// Base de datos JSON temporal para la aplicación Facturador
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class JSONDatabase {
    constructor() {
        this.dataPath = path.join(app?.getPath('userData') || require('os').homedir(), 'facturador-data.json');
        this.data = {
            users: [],
            clients: [],
            products: [],
            invoices: [],
            invoice_lines: [],
            file_attachments: [],
            settings: [],
            activity_log: []
        };
        this.nextIds = {
            users: 1,
            clients: 1,
            products: 1,
            invoices: 1,
            invoice_lines: 1,
            file_attachments: 1,
            activity_log: 1
        };
        this.init();
    }

    async init() {
        try {
            // Cargar datos existentes si existen
            if (fs.existsSync(this.dataPath)) {
                const fileContent = fs.readFileSync(this.dataPath, 'utf-8');
                const loadedData = JSON.parse(fileContent);
                this.data = { ...this.data, ...loadedData.data };
                this.nextIds = { ...this.nextIds, ...loadedData.nextIds };
            }
            
            // Crear datos de demostración si no existen usuarios
            if (this.data.users.length === 0) {
                await this.createDemoData();
            }
            
            console.log('Base de datos JSON inicializada correctamente');
        } catch (error) {
            console.error('Error al inicializar la base de datos JSON:', error);
            throw error;
        }
    }

    async createDemoData() {
        // Crear usuario administrador por defecto
        const adminUser = {
            id: this.getNextId('users'),
            email: 'admin@facturador.com',
            name: 'Administrador',
            password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        this.data.users.push(adminUser);

        // Crear algunos clientes de demostración
        const demoClients = [
            {
                id: this.getNextId('clients'),
                nombre: 'Empresa Demo S.L.',
                email: 'contacto@empresademo.com',
                telefono: '91 123 45 67',
                direccion: 'Calle Principal, 123',
                ciudad: 'Madrid',
                codigo_postal: '28001',
                nif_cif: 'B12345678',
                notas: 'Cliente de demostración',
                activo: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: this.getNextId('clients'),
                nombre: 'Juan Pérez',
                email: 'juan.perez@email.com',
                telefono: '91 987 65 43',
                direccion: 'Avenida Secundaria, 456',
                ciudad: 'Barcelona',
                codigo_postal: '08001',
                nif_cif: '12345678A',
                notas: 'Cliente particular',
                activo: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
        this.data.clients.push(...demoClients);

        // Crear algunos productos de demostración
        const demoProducts = [
            {
                id: this.getNextId('products'),
                codigo: 'SERV001',
                nombre: 'Consultoría IT',
                descripcion: 'Servicios de consultoría en tecnología',
                precio: 75.00,
                categoria: 'Servicios',
                unidad: 'hora',
                iva_percentage: 21.00,
                activo: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: this.getNextId('products'),
                codigo: 'PROD001',
                nombre: 'Desarrollo Web',
                descripcion: 'Desarrollo de aplicaciones web',
                precio: 1200.00,
                categoria: 'Desarrollo',
                unidad: 'proyecto',
                iva_percentage: 21.00,
                activo: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
        this.data.products.push(...demoProducts);

        // Guardar datos
        await this.saveData();
    }

    getNextId(table) {
        return this.nextIds[table]++;
    }

    // Función de validación de email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async saveData() {
        try {
            const dataToSave = {
                data: this.data,
                nextIds: this.nextIds,
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(this.dataPath, JSON.stringify(dataToSave, null, 2));
        } catch (error) {
            console.error('Error al guardar datos:', error);
        }
    }

    // Métodos de consulta simulando PostgreSQL

    async query(text, params = []) {
        // Simulación básica de consultas SQL
        return { rows: [], rowCount: 0 };
    }

    async queryOne(text, params = []) {
        return null;
    }

    async queryMany(text, params = []) {
        return [];
    }

    // USUARIOS
    async createUser(userData) {
        // Validar datos requeridos
        if (!userData || typeof userData !== 'object') {
            throw new Error('Los datos del usuario son requeridos');
        }

        const { name, email, password } = userData;

        if (!name || name.trim() === '') {
            throw new Error('El nombre del usuario es requerido');
        }

        if (!email || email.trim() === '') {
            throw new Error('El email del usuario es requerido');
        }

        if (!this.isValidEmail(email)) {
            throw new Error('El formato del email no es válido');
        }

        if (!password || password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        // Verificar que el email no esté en uso
        const existingUser = this.data.users.find(user => user.email === email.trim());
        if (existingUser) {
            throw new Error('Ya existe un usuario con este email');
        }

        const user = {
            id: this.getNextId('users'),
            name: name.trim(),
            email: email.trim(),
            password,
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        this.data.users.push(user);
        await this.saveData();
        return user;
    }

    async getUserByEmail(email) {
        return this.data.users.find(user => user.email === email) || null;
    }

    async getUserById(id) {
        return this.data.users.find(user => user.id === parseInt(id)) || null;
    }

    async updateUserLastLogin(userId) {
        const user = this.data.users.find(u => u.id === parseInt(userId));
        if (user) {
            user.updated_at = new Date().toISOString();
            await this.saveData();
            return true;
        }
        return false;
    }

    async updateUserPassword(userId, newPasswordHash) {
        const user = this.data.users.find(u => u.id === parseInt(userId));
        if (user) {
            user.password = newPasswordHash;
            user.updated_at = new Date().toISOString();
            await this.saveData();
            return true;
        }
        return false;
    }

    async deactivateUser(userId) {
        const user = this.data.users.find(u => u.id === parseInt(userId));
        if (user) {
            user.updated_at = new Date().toISOString();
            await this.saveData();
            return true;
        }
        return false;
    }

    async getAllUsers() {
        return this.data.users.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            created_at: user.created_at
        }));
    }

    // CLIENTES
    async createClient(clientData) {
        // Validar datos requeridos
        if (!clientData || typeof clientData !== 'object') {
            throw new Error('Los datos del cliente son requeridos');
        }

        if (!clientData.nombre || clientData.nombre.trim() === '') {
            throw new Error('El nombre del cliente es requerido');
        }

        // Validar email si se proporciona
        if (clientData.email && !this.isValidEmail(clientData.email)) {
            throw new Error('El formato del email no es válido');
        }

        const client = {
            id: this.getNextId('clients'),
            ...clientData,
            nombre: clientData.nombre.trim(),
            email: clientData.email ? clientData.email.trim() : null,
            telefono: clientData.telefono ? clientData.telefono.trim() : null,
            activo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        this.data.clients.push(client);
        await this.saveData();
        return client;
    }

    async getClientById(id) {
        return this.data.clients.find(client => client.id === parseInt(id)) || null;
    }

    async getAllClients() {
        return this.data.clients.filter(client => client.activo).sort((a, b) => {
            const nameA = (a && a.nombre && typeof a.nombre === 'string') ? a.nombre : '';
            const nameB = (b && b.nombre && typeof b.nombre === 'string') ? b.nombre : '';
            return nameA.localeCompare(nameB);
        });
    }

    async updateClient(id, clientData) {
        const clientIndex = this.data.clients.findIndex(client => client.id === parseInt(id));
        if (clientIndex !== -1) {
            this.data.clients[clientIndex] = {
                ...this.data.clients[clientIndex],
                ...clientData,
                updated_at: new Date().toISOString()
            };
            await this.saveData();
            return this.data.clients[clientIndex];
        }
        return null;
    }

    async deleteClient(id) {
        const client = this.data.clients.find(client => client.id === parseInt(id));
        if (client) {
            client.activo = false;
            client.updated_at = new Date().toISOString();
            await this.saveData();
            return true;
        }
        return false;
    }

    async searchClients(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            return this.data.clients.filter(client => client.activo);
        }

        const term = searchTerm.toLowerCase();
        return this.data.clients.filter(client =>
            client.activo && (
                (client.nombre && typeof client.nombre === 'string' && client.nombre.toLowerCase().includes(term)) ||
                (client.email && typeof client.email === 'string' && client.email.toLowerCase().includes(term)) ||
                (client.telefono && typeof client.telefono === 'string' && client.telefono.includes(term)) ||
                (client.nif_cif && typeof client.nif_cif === 'string' && client.nif_cif.toLowerCase().includes(term))
            )
        ).sort((a, b) => {
            // Asegurar que ambos valores son strings válidos
            const nameA = (a && a.nombre && typeof a.nombre === 'string') ? a.nombre : '';
            const nameB = (b && b.nombre && typeof b.nombre === 'string') ? b.nombre : '';
            return nameA.localeCompare(nameB);
        });
    }

    // Métodos adicionales que necesita la aplicación
    async getAllProducts() {
        return this.data.products.filter(product => product.activo);
    }

    async createProduct(productData) {
        // Validar datos requeridos
        if (!productData || typeof productData !== 'object') {
            throw new Error('Los datos del producto son requeridos');
        }

        if (!productData.nombre || productData.nombre.trim() === '') {
            throw new Error('El nombre del producto es requerido');
        }

        if (!productData.precio || isNaN(productData.precio) || productData.precio <= 0) {
            throw new Error('El precio del producto debe ser un número mayor a 0');
        }

        const product = {
            id: this.getNextId('products'),
            ...productData,
            nombre: productData.nombre.trim(),
            precio: parseFloat(productData.precio),
            activo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        this.data.products.push(product);
        await this.saveData();
        return product;
    }

    async createInvoice(invoiceData) {
        // Validar datos requeridos
        if (!invoiceData || typeof invoiceData !== 'object') {
            throw new Error('Los datos de la factura son requeridos');
        }

        if (!invoiceData.numero || invoiceData.numero.trim() === '') {
            throw new Error('El número de factura es requerido');
        }

        if (!invoiceData.client_id || isNaN(invoiceData.client_id)) {
            throw new Error('El ID del cliente es requerido y debe ser un número');
        }

        // Verificar que el cliente existe
        const client = this.data.clients.find(c => c.id === parseInt(invoiceData.client_id));
        if (!client) {
            throw new Error('El cliente especificado no existe');
        }

        const invoice = {
            id: this.getNextId('invoices'),
            numero: invoiceData.numero.trim(),
            client_id: parseInt(invoiceData.client_id),
            fecha_emision: invoiceData.fecha_emision || new Date().toISOString().split('T')[0],
            fecha_vencimiento: invoiceData.fecha_vencimiento,
            subtotal: parseFloat(invoiceData.subtotal) || 0,
            total_iva: parseFloat(invoiceData.total_iva) || 0,
            total: parseFloat(invoiceData.total) || 0,
            descuento: parseFloat(invoiceData.descuento) || 0,
            estado: invoiceData.estado || 'borrador',
            notas: invoiceData.notas,
            condiciones_pago: invoiceData.condiciones_pago,
            metodo_pago: invoiceData.metodo_pago,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.data.invoices.push(invoice);
        await this.saveData();
        return invoice;
    }

    async getInvoices() {
        return this.data.invoices.map(invoice => {
            const client = this.data.clients.find(c => c.id === invoice.client_id);
            return {
                ...invoice,
                cliente_nombre: client ? client.nombre : 'Cliente no encontrado',
                cliente_email: client ? client.email : ''
            };
        }).sort((a, b) => new Date(b.fecha_emision) - new Date(a.fecha_emision));
    }

    async getAllInvoices() {
        return this.data.invoices.map(invoice => {
            const client = this.data.clients.find(c => c.id === invoice.client_id);
            return {
                ...invoice,
                client_name: client ? client.nombre : 'Cliente no encontrado',
                client_email: client ? client.email : ''
            };
        }).sort((a, b) => new Date(b.fecha_emision) - new Date(a.fecha_emision));
    }

    async getInvoiceById(id) {
        const invoice = this.data.invoices.find(inv => inv.id === parseInt(id));
        if (!invoice) return null;

        const client = this.data.clients.find(c => c.id === invoice.client_id);
        return {
            ...invoice,
            client_name: client ? client.nombre : 'Cliente no encontrado',
            client_email: client ? client.email : ''
        };
    }

    async updateInvoiceStatus(id, status) {
        const invoiceIndex = this.data.invoices.findIndex(inv => inv.id === parseInt(id));
        if (invoiceIndex === -1) return false;

        this.data.invoices[invoiceIndex].estado = status;
        this.data.invoices[invoiceIndex].updated_at = new Date().toISOString();
        await this.saveData();
        return true;
    }

    async getInvoiceLines(invoiceId) {
        return this.data.invoice_lines.filter(line => line.invoice_id === parseInt(invoiceId))
            .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    }

    async addInvoiceLine(invoiceId, lineData) {
        const line = {
            id: this.getNextId('invoice_lines'),
            invoice_id: parseInt(invoiceId),
            product_id: lineData.product_id ? parseInt(lineData.product_id) : null,
            concepto: lineData.concepto,
            descripcion: lineData.descripcion,
            cantidad: parseFloat(lineData.cantidad) || 1,
            precio_unitario: parseFloat(lineData.precio_unitario) || 0,
            descuento: parseFloat(lineData.descuento) || 0,
            iva_percentage: parseFloat(lineData.iva_percentage) || 21.00,
            subtotal: parseFloat(lineData.subtotal) || 0,
            total_iva: parseFloat(lineData.total_iva) || 0,
            total: parseFloat(lineData.total) || 0,
            orden: parseInt(lineData.orden) || 0,
            created_at: new Date().toISOString()
        };

        this.data.invoice_lines.push(line);
        await this.saveData();
        return line;
    }

    async generateNextInvoiceNumber() {
        const year = new Date().getFullYear();
        const invoicesThisYear = this.data.invoices.filter(inv =>
            inv.numero && inv.numero.startsWith(`FAC-${year}-`)
        );

        // Encontrar el número más alto usado este año
        let maxNumber = 0;
        invoicesThisYear.forEach(inv => {
            const match = inv.numero.match(/FAC-\d{4}-(\d{4})/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxNumber) {
                    maxNumber = num;
                }
            }
        });

        const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
        return `FAC-${year}-${nextNumber}`;
    }

    async getDashboardStats() {
        const totalClients = this.data.clients.filter(c => c.activo).length;
        const totalInvoices = this.data.invoices.length;
        const pendingInvoices = this.data.invoices.filter(inv => inv.estado === 'enviada').length;
        const totalRevenue = this.data.invoices
            .filter(inv => inv.estado === 'pagada')
            .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
        
        const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const invoicesThisMonth = this.data.invoices.filter(inv => 
            inv.fecha_emision.startsWith(thisMonth)
        ).length;

        return {
            totalClients,
            totalInvoices,
            pendingInvoices,
            totalRevenue,
            invoicesThisMonth
        };
    }

    // Configuración
    async getAppSettings() {
        const settings = {};
        this.data.settings.forEach(setting => {
            if (setting.key.startsWith('company_')) {
                if (!settings.company) settings.company = {};
                settings.company[setting.key] = setting.value;
            } else if (setting.category === 'invoice' || setting.key.startsWith('invoice_') || setting.key.startsWith('default_')) {
                if (!settings.invoice) settings.invoice = {};
                settings.invoice[setting.key] = setting.value;
            }
        });

        // Valores por defecto si no hay configuración
        if (!settings.company || Object.keys(settings.company).length === 0) {
            settings.company = {
                company_name: 'MI EMPRESA S.L.',
                company_address: 'Calle Principal, 123 - 28001 Madrid',
                company_nif: 'B12345678',
                company_phone: '+34 91 123 45 67',
                company_email: 'contacto@miempresa.com'
            };
        }

        return settings;
    }

    async saveCompanySettings(companyData) {
        for (const [key, value] of Object.entries(companyData)) {
            const existingIndex = this.data.settings.findIndex(s => s.key === key);
            if (existingIndex !== -1) {
                this.data.settings[existingIndex].value = value;
                this.data.settings[existingIndex].updated_at = new Date().toISOString();
            } else {
                this.data.settings.push({
                    key,
                    value,
                    category: 'company',
                    updated_at: new Date().toISOString()
                });
            }
        }
        await this.saveData();
        return { success: true };
    }

    async saveFileAttachment(invoiceId, fileName, filePath, fileSize, mimeType) {
        const attachment = {
            id: this.getNextId('file_attachments'),
            invoice_id: parseInt(invoiceId),
            file_name: fileName,
            file_path: filePath,
            file_size: fileSize,
            mime_type: mimeType,
            created_at: new Date().toISOString()
        };

        this.data.file_attachments.push(attachment);
        await this.saveData();
        return attachment.id;
    }

    async getFileAttachments(invoiceId) {
        return this.data.file_attachments.filter(att => att.invoice_id === parseInt(invoiceId))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    async deleteFileAttachment(id) {
        const index = this.data.file_attachments.findIndex(att => att.id === parseInt(id));
        if (index === -1) return false;

        this.data.file_attachments.splice(index, 1);
        await this.saveData();
        return true;
    }

    async saveInvoiceSettings(invoiceData) {
        for (const [key, value] of Object.entries(invoiceData)) {
            const existingIndex = this.data.settings.findIndex(s => s.key === key);
            if (existingIndex !== -1) {
                this.data.settings[existingIndex].value = value;
                this.data.settings[existingIndex].updated_at = new Date().toISOString();
            } else {
                this.data.settings.push({
                    key,
                    value,
                    category: 'invoice',
                    updated_at: new Date().toISOString()
                });
            }
        }
        await this.saveData();
        return { success: true };
    }

    // Cerrar conexión (no hace nada en JSON)
    async close() {
        console.log('Base de datos JSON cerrada');
    }
}

module.exports = JSONDatabase;
