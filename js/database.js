// Gestor de base de datos local usando electron-store
const { ipcRenderer } = require('electron');

class Database {
    constructor() {
        this.tables = {
            users: 'users',
            clients: 'clients',
            invoices: 'invoices',
            products: 'products',
            settings: 'settings'
        };
    }

    async save(table, data) {
        const existingData = await this.getAll(table);
        if (data.id) {
            // Actualizar registro existente
            const index = existingData.findIndex(item => item.id === data.id);
            if (index !== -1) {
                existingData[index] = { ...existingData[index], ...data, updatedAt: new Date().toISOString() };
            }
        } else {
            // Crear nuevo registro
            data.id = Date.now();
            data.createdAt = new Date().toISOString();
            existingData.push(data);
        }
        
        await ipcRenderer.invoke('save-data', table, existingData);
        return data;
    }

    async getAll(table) {
        return await ipcRenderer.invoke('get-data', table) || [];
    }

    async getById(table, id) {
        const data = await this.getAll(table);
        return data.find(item => item.id === id);
    }

    async delete(table, id) {
        const data = await this.getAll(table);
        const filteredData = data.filter(item => item.id !== id);
        await ipcRenderer.invoke('save-data', table, filteredData);
        return true;
    }

    async search(table, query) {
        const data = await this.getAll(table);
        return data.filter(item => {
            return Object.values(item).some(value => 
                value && value.toString().toLowerCase().includes(query.toLowerCase())
            );
        });
    }

    // Métodos específicos para cada entidad
    async getClients() {
        return await this.getAll(this.tables.clients);
    }

    async saveClient(clientData) {
        return await this.save(this.tables.clients, clientData);
    }

    async getInvoices() {
        return await this.getAll(this.tables.invoices);
    }

    async saveInvoice(invoiceData) {
        return await this.save(this.tables.invoices, invoiceData);
    }

    async getProducts() {
        return await this.getAll(this.tables.products);
    }

    async saveProduct(productData) {
        return await this.save(this.tables.products, productData);
    }

    async getSettings() {
        const settings = await ipcRenderer.invoke('get-data', this.tables.settings);
        return settings || {
            companyName: 'Mi Empresa',
            companyAddress: '',
            companyPhone: '',
            companyEmail: '',
            taxRate: 21,
            currency: 'EUR',
            invoicePrefix: 'FAC',
            nextInvoiceNumber: 1
        };
    }

    async saveSettings(settingsData) {
        await ipcRenderer.invoke('save-data', this.tables.settings, settingsData);
        return settingsData;
    }

    // Métodos de utilidad
    async getNextInvoiceNumber() {
        const settings = await this.getSettings();
        const nextNumber = settings.nextInvoiceNumber || 1;
        
        // Incrementar el número para la próxima factura
        settings.nextInvoiceNumber = nextNumber + 1;
        await this.saveSettings(settings);
        
        return `${settings.invoicePrefix}-${new Date().getFullYear()}-${nextNumber.toString().padStart(3, '0')}`;
    }

    async initializeData() {
        // Inicializar datos de ejemplo si no existen
        const clients = await this.getClients();
        if (clients.length === 0) {
            const sampleClients = [
                {
                    name: 'Ricardo García',
                    email: 'ricardo.garcia@example.com',
                    phone: '555-123-4567',
                    address: 'Calle Principal 123, Ciudad'
                },
                {
                    name: 'Isabel Fernández',
                    email: 'isabel.fernandez@example.com',
                    phone: '555-987-6543',
                    address: 'Avenida Central 456, Pueblo'
                }
            ];

            for (const client of sampleClients) {
                await this.saveClient(client);
            }
        }

        const products = await this.getProducts();
        if (products.length === 0) {
            const sampleProducts = [
                {
                    name: 'Licencia de Software',
                    description: 'Licencia anual de software',
                    price: 500,
                    category: 'Software'
                },
                {
                    name: 'Horas de Consultoría',
                    description: 'Consultoría técnica por hora',
                    price: 100,
                    category: 'Servicios'
                },
                {
                    name: 'Sesión de Capacitación',
                    description: 'Capacitación personalizada',
                    price: 200,
                    category: 'Capacitación'
                }
            ];

            for (const product of sampleProducts) {
                await this.saveProduct(product);
            }
        }
    }
}

// Instancia global de la base de datos
window.db = new Database();

// Inicializar datos cuando se carga la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    await window.db.initializeData();
});
