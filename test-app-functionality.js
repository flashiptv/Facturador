// Script de pruebas para verificar funcionalidad de la aplicación Facturador
const { app, BrowserWindow } = require('electron');
const path = require('path');

// Importar las clases de base de datos
const JSONDatabase = require('./js/jsonDatabase');
const bcrypt = require('bcryptjs');

class AppTester {
    constructor() {
        this.database = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runAllTests() {
        console.log('🧪 Iniciando pruebas de funcionalidad de la aplicación Facturador...\n');

        try {
            // Inicializar base de datos de prueba
            await this.initTestDatabase();

            // Ejecutar todas las pruebas
            await this.testDatabaseConnection();
            await this.testUserAuthentication();
            await this.testClientManagement();
            await this.testProductManagement();
            await this.testInvoiceManagement();
            await this.testSettings();
            await this.testDashboardStats();

            // Mostrar resultados
            this.showResults();

        } catch (error) {
            console.error('❌ Error durante las pruebas:', error);
        } finally {
            if (this.database) {
                await this.database.close();
            }
        }
    }

    async initTestDatabase() {
        console.log('📊 Inicializando base de datos de prueba...');
        this.database = new JSONDatabase();
        await this.database.init();
        this.addTestResult('Inicialización de base de datos', true, 'Base de datos JSON inicializada correctamente');
    }

    async testDatabaseConnection() {
        console.log('\n🔗 Probando conexión a la base de datos...');
        
        try {
            const users = await this.database.getAllUsers();
            this.addTestResult('Conexión a base de datos', true, `Conexión exitosa, ${users.length} usuarios encontrados`);
        } catch (error) {
            this.addTestResult('Conexión a base de datos', false, error.message);
        }
    }

    async testUserAuthentication() {
        console.log('\n🔐 Probando sistema de autenticación...');

        try {
            // Generar email único para evitar conflictos
            const uniqueEmail = `test${Date.now()}@test.com`;

            // Probar creación de usuario
            const testUser = {
                name: 'Usuario Test',
                email: uniqueEmail,
                password: await bcrypt.hash('test123', 10)
            };

            const createdUser = await this.database.createUser(testUser);
            this.addTestResult('Creación de usuario', !!createdUser, createdUser ? 'Usuario creado exitosamente' : 'Error al crear usuario');

            // Probar búsqueda por email
            const foundUser = await this.database.getUserByEmail(uniqueEmail);
            this.addTestResult('Búsqueda de usuario por email', !!foundUser, foundUser ? 'Usuario encontrado' : 'Usuario no encontrado');

            // Probar búsqueda por ID
            if (createdUser) {
                const foundById = await this.database.getUserById(createdUser.id);
                this.addTestResult('Búsqueda de usuario por ID', !!foundById, foundById ? 'Usuario encontrado por ID' : 'Usuario no encontrado por ID');
            }

            // Probar verificación de contraseña
            if (foundUser) {
                const passwordMatch = await bcrypt.compare('test123', foundUser.password);
                this.addTestResult('Verificación de contraseña', passwordMatch, passwordMatch ? 'Contraseña verificada correctamente' : 'Error en verificación de contraseña');
            }

        } catch (error) {
            this.addTestResult('Sistema de autenticación', false, error.message);
        }
    }

    async testClientManagement() {
        console.log('\n👥 Probando gestión de clientes...');

        try {
            // Crear cliente de prueba
            const testClient = {
                nombre: 'Cliente Test S.L.',
                email: 'cliente@test.com',
                telefono: '91 123 45 67',
                direccion: 'Calle Test, 123',
                ciudad: 'Madrid',
                codigo_postal: '28001',
                nif_cif: 'B12345678',
                notas: 'Cliente de prueba'
            };

            const createdClient = await this.database.createClient(testClient);
            this.addTestResult('Creación de cliente', !!createdClient, createdClient ? 'Cliente creado exitosamente' : 'Error al crear cliente');

            // Obtener todos los clientes
            try {
                const allClients = await this.database.getAllClients();
                this.addTestResult('Obtener todos los clientes', Array.isArray(allClients), `${allClients.length} clientes encontrados`);
            } catch (error) {
                this.addTestResult('Obtener todos los clientes', false, error.message);
            }

            // Buscar cliente por ID
            if (createdClient) {
                try {
                    const foundClient = await this.database.getClientById(createdClient.id);
                    this.addTestResult('Búsqueda de cliente por ID', !!foundClient, foundClient ? 'Cliente encontrado' : 'Cliente no encontrado');
                } catch (error) {
                    this.addTestResult('Búsqueda de cliente por ID', false, error.message);
                }

                // Actualizar cliente
                try {
                    const updatedData = { ...testClient, nombre: 'Cliente Test Actualizado S.L.' };
                    const updatedClient = await this.database.updateClient(createdClient.id, updatedData);
                    this.addTestResult('Actualización de cliente', !!updatedClient, updatedClient ? 'Cliente actualizado exitosamente' : 'Error al actualizar cliente');
                } catch (error) {
                    this.addTestResult('Actualización de cliente', false, error.message);
                }

                // Buscar clientes
                try {
                    const searchResults = await this.database.searchClients('Test');
                    this.addTestResult('Búsqueda de clientes', Array.isArray(searchResults), `${searchResults.length} clientes encontrados en búsqueda`);
                } catch (error) {
                    this.addTestResult('Búsqueda de clientes', false, error.message);
                }
            }

        } catch (error) {
            this.addTestResult('Gestión de clientes', false, error.message);
        }
    }

    async testProductManagement() {
        console.log('\n📦 Probando gestión de productos...');

        try {
            // Crear producto de prueba
            const testProduct = {
                codigo: 'TEST001',
                nombre: 'Producto Test',
                descripcion: 'Producto de prueba',
                precio: 99.99,
                categoria: 'Test',
                unidad: 'ud',
                iva_percentage: 21.00
            };

            const createdProduct = await this.database.createProduct(testProduct);
            this.addTestResult('Creación de producto', !!createdProduct, createdProduct ? 'Producto creado exitosamente' : 'Error al crear producto');

            // Obtener todos los productos
            const allProducts = await this.database.getAllProducts();
            this.addTestResult('Obtener todos los productos', Array.isArray(allProducts), `${allProducts.length} productos encontrados`);

        } catch (error) {
            this.addTestResult('Gestión de productos', false, error.message);
        }
    }

    async testInvoiceManagement() {
        console.log('\n🧾 Probando gestión de facturas...');

        try {
            // Generar número de factura
            const invoiceNumber = await this.database.generateNextInvoiceNumber();
            this.addTestResult('Generación de número de factura', !!invoiceNumber, `Número generado: ${invoiceNumber}`);

            // Obtener todas las facturas
            const allInvoices = await this.database.getAllInvoices();
            this.addTestResult('Obtener todas las facturas', Array.isArray(allInvoices), `${allInvoices.length} facturas encontradas`);

        } catch (error) {
            this.addTestResult('Gestión de facturas', false, error.message);
        }
    }

    async testSettings() {
        console.log('\n⚙️ Probando configuración...');

        try {
            // Probar configuración de empresa
            const companySettings = {
                company_name: 'Empresa Test S.L.',
                company_nif: 'B87654321',
                company_address: 'Calle Test, 456',
                company_phone: '+34 91 987 65 43',
                company_email: 'test@empresa.com'
            };

            const savedCompany = await this.database.saveCompanySettings(companySettings);
            this.addTestResult('Guardar configuración de empresa', savedCompany.success, 'Configuración de empresa guardada');

            // Probar configuración de facturas
            const invoiceSettings = {
                invoice_prefix: 'TEST',
                invoice_start_number: 1,
                default_vat: 21,
                default_due_days: 30
            };

            const savedInvoice = await this.database.saveInvoiceSettings(invoiceSettings);
            this.addTestResult('Guardar configuración de facturas', savedInvoice.success, 'Configuración de facturas guardada');

            // Obtener configuración
            const appSettings = await this.database.getAppSettings();
            this.addTestResult('Obtener configuración', !!appSettings, 'Configuración obtenida exitosamente');

        } catch (error) {
            this.addTestResult('Configuración', false, error.message);
        }
    }

    async testDashboardStats() {
        console.log('\n📊 Probando estadísticas del dashboard...');

        try {
            const stats = await this.database.getDashboardStats();
            const hasRequiredStats = stats && 
                typeof stats.totalClients === 'number' &&
                typeof stats.totalInvoices === 'number' &&
                typeof stats.pendingInvoices === 'number' &&
                typeof stats.totalRevenue === 'number' &&
                typeof stats.invoicesThisMonth === 'number';

            this.addTestResult('Estadísticas del dashboard', hasRequiredStats, 
                hasRequiredStats ? `Estadísticas: ${stats.totalClients} clientes, ${stats.totalInvoices} facturas` : 'Error en estadísticas');

        } catch (error) {
            this.addTestResult('Estadísticas del dashboard', false, error.message);
        }
    }

    addTestResult(testName, passed, message) {
        this.testResults.tests.push({
            name: testName,
            passed,
            message
        });

        if (passed) {
            this.testResults.passed++;
            console.log(`✅ ${testName}: ${message}`);
        } else {
            this.testResults.failed++;
            console.log(`❌ ${testName}: ${message}`);
        }
    }

    showResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 RESUMEN DE PRUEBAS');
        console.log('='.repeat(60));
        console.log(`✅ Pruebas exitosas: ${this.testResults.passed}`);
        console.log(`❌ Pruebas fallidas: ${this.testResults.failed}`);
        console.log(`📊 Total de pruebas: ${this.testResults.tests.length}`);
        
        const successRate = ((this.testResults.passed / this.testResults.tests.length) * 100).toFixed(1);
        console.log(`🎯 Tasa de éxito: ${successRate}%`);

        if (this.testResults.failed > 0) {
            console.log('\n❌ PRUEBAS FALLIDAS:');
            this.testResults.tests
                .filter(test => !test.passed)
                .forEach(test => {
                    console.log(`   • ${test.name}: ${test.message}`);
                });
        }

        console.log('\n' + '='.repeat(60));
        
        if (successRate >= 90) {
            console.log('🎉 ¡Excelente! La aplicación está funcionando correctamente.');
        } else if (successRate >= 70) {
            console.log('⚠️ La aplicación funciona pero hay algunos problemas que necesitan atención.');
        } else {
            console.log('🚨 La aplicación tiene problemas significativos que deben ser corregidos.');
        }
    }
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
    const tester = new AppTester();
    tester.runAllTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error en las pruebas:', error);
        process.exit(1);
    });
}

module.exports = AppTester;
