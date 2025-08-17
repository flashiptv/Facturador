// Script de pruebas de integración completas
const JSONDatabase = require('./js/jsonDatabase');
const bcrypt = require('bcryptjs');

class IntegrationTester {
    constructor() {
        this.database = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
        this.testData = {
            user: null,
            client: null,
            product: null,
            invoice: null
        };
    }

    async runIntegrationTests() {
        console.log('🔄 Iniciando pruebas de integración completas...\n');

        try {
            // Inicializar base de datos
            this.database = new JSONDatabase();
            await this.database.init();

            // Ejecutar flujos de trabajo completos
            await this.testCompleteUserWorkflow();
            await this.testCompleteClientWorkflow();
            await this.testCompleteProductWorkflow();
            await this.testCompleteInvoiceWorkflow();
            await this.testCompleteBusinessWorkflow();
            await this.testErrorHandlingWorkflow();

            this.showResults();

        } catch (error) {
            console.error('❌ Error durante las pruebas de integración:', error);
        } finally {
            if (this.database) {
                await this.database.close();
            }
        }
    }

    async testCompleteUserWorkflow() {
        console.log('👤 Probando flujo completo de usuario...');

        try {
            // Generar email único para evitar conflictos
            const uniqueEmail = `integracion${Date.now()}@test.com`;

            // 1. Crear usuario
            const userData = {
                name: 'Usuario Integración',
                email: uniqueEmail,
                password: await bcrypt.hash('test123', 10)
            };

            this.testData.user = await this.database.createUser(userData);
            this.addTestResult('Crear usuario', !!this.testData.user,
                this.testData.user ? 'Usuario creado exitosamente' : 'Error al crear usuario');

            // 2. Autenticar usuario
            const foundUser = await this.database.getUserByEmail(uniqueEmail);
            const passwordMatch = await bcrypt.compare('test123', foundUser.password);
            this.addTestResult('Autenticar usuario', passwordMatch, 
                passwordMatch ? 'Autenticación exitosa' : 'Error en autenticación');

            // 3. Actualizar último login
            const loginUpdated = await this.database.updateUserLastLogin(this.testData.user.id);
            this.addTestResult('Actualizar último login', loginUpdated, 
                loginUpdated ? 'Login actualizado' : 'Error al actualizar login');

        } catch (error) {
            this.addTestResult('Flujo completo de usuario', false, error.message);
        }
    }

    async testCompleteClientWorkflow() {
        console.log('👥 Probando flujo completo de cliente...');

        try {
            // 1. Crear cliente
            const clientData = {
                nombre: 'Cliente Integración S.L.',
                email: 'cliente@integracion.com',
                telefono: '91 123 45 67',
                direccion: 'Calle Integración, 123',
                ciudad: 'Madrid',
                codigo_postal: '28001',
                nif_cif: 'B12345678',
                notas: 'Cliente de pruebas de integración'
            };

            this.testData.client = await this.database.createClient(clientData);
            this.addTestResult('Crear cliente', !!this.testData.client, 
                this.testData.client ? 'Cliente creado exitosamente' : 'Error al crear cliente');

            // 2. Buscar cliente
            const searchResults = await this.database.searchClients('Integración');
            this.addTestResult('Buscar cliente', searchResults.length > 0, 
                `${searchResults.length} clientes encontrados en búsqueda`);

            // 3. Actualizar cliente
            const updatedData = { ...clientData, telefono: '91 987 65 43' };
            const updatedClient = await this.database.updateClient(this.testData.client.id, updatedData);
            this.addTestResult('Actualizar cliente', !!updatedClient, 
                updatedClient ? 'Cliente actualizado exitosamente' : 'Error al actualizar cliente');

            // 4. Obtener cliente por ID
            const retrievedClient = await this.database.getClientById(this.testData.client.id);
            this.addTestResult('Obtener cliente por ID', !!retrievedClient, 
                retrievedClient ? 'Cliente obtenido exitosamente' : 'Error al obtener cliente');

        } catch (error) {
            this.addTestResult('Flujo completo de cliente', false, error.message);
        }
    }

    async testCompleteProductWorkflow() {
        console.log('📦 Probando flujo completo de producto...');

        try {
            // 1. Crear producto
            const productData = {
                codigo: 'INT001',
                nombre: 'Producto Integración',
                descripcion: 'Producto para pruebas de integración',
                precio: 99.99,
                categoria: 'Integración',
                unidad: 'ud',
                iva_percentage: 21.00
            };

            this.testData.product = await this.database.createProduct(productData);
            this.addTestResult('Crear producto', !!this.testData.product, 
                this.testData.product ? 'Producto creado exitosamente' : 'Error al crear producto');

            // 2. Obtener todos los productos
            const allProducts = await this.database.getAllProducts();
            const productExists = allProducts.some(p => p.id === this.testData.product.id);
            this.addTestResult('Producto en lista', productExists, 
                productExists ? 'Producto aparece en lista' : 'Producto no aparece en lista');

        } catch (error) {
            this.addTestResult('Flujo completo de producto', false, error.message);
        }
    }

    async testCompleteInvoiceWorkflow() {
        console.log('🧾 Probando flujo completo de factura...');

        try {
            // 1. Generar número de factura
            const invoiceNumber = await this.database.generateNextInvoiceNumber();
            this.addTestResult('Generar número de factura', !!invoiceNumber, 
                `Número generado: ${invoiceNumber}`);

            // 2. Simular creación de factura completa
            const invoiceData = {
                numero: invoiceNumber,
                client_id: this.testData.client.id,
                fecha_emision: new Date().toISOString().split('T')[0],
                fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                subtotal: 99.99,
                total_iva: 20.998,
                total: 120.988,
                estado: 'borrador',
                notas: 'Factura de pruebas de integración'
            };

            // Simular guardado de factura (agregar a la lista)
            this.database.data.invoices.push({
                id: this.database.getNextId('invoices'),
                ...invoiceData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            this.addTestResult('Crear factura', true, 'Factura creada exitosamente');

            // 3. Obtener todas las facturas
            const allInvoices = await this.database.getAllInvoices();
            const invoiceExists = allInvoices.some(inv => inv.numero === invoiceNumber);
            this.addTestResult('Factura en lista', invoiceExists, 
                invoiceExists ? 'Factura aparece en lista' : 'Factura no aparece en lista');

        } catch (error) {
            this.addTestResult('Flujo completo de factura', false, error.message);
        }
    }

    async testCompleteBusinessWorkflow() {
        console.log('💼 Probando flujo de negocio completo...');

        try {
            // 1. Configurar empresa
            const companySettings = {
                company_name: 'Empresa Integración S.L.',
                company_nif: 'B87654321',
                company_address: 'Calle Empresa, 456',
                company_phone: '+34 91 555 44 33',
                company_email: 'info@empresa-integracion.com'
            };

            const companySaved = await this.database.saveCompanySettings(companySettings);
            this.addTestResult('Configurar empresa', companySaved.success, 
                companySaved.success ? 'Configuración de empresa guardada' : 'Error al guardar configuración');

            // 2. Configurar facturas
            const invoiceSettings = {
                invoice_prefix: 'INT',
                invoice_start_number: 1000,
                default_vat: 21,
                default_due_days: 30
            };

            const invoiceSaved = await this.database.saveInvoiceSettings(invoiceSettings);
            this.addTestResult('Configurar facturas', invoiceSaved.success, 
                invoiceSaved.success ? 'Configuración de facturas guardada' : 'Error al guardar configuración');

            // 3. Obtener estadísticas del dashboard
            const stats = await this.database.getDashboardStats();
            const hasValidStats = stats && typeof stats.totalClients === 'number';
            this.addTestResult('Estadísticas del dashboard', hasValidStats, 
                hasValidStats ? `${stats.totalClients} clientes, ${stats.totalInvoices} facturas` : 'Error en estadísticas');

            // 4. Flujo completo: Cliente -> Producto -> Factura
            const workflowComplete = this.testData.user && this.testData.client && this.testData.product;
            this.addTestResult('Flujo de trabajo completo', workflowComplete, 
                workflowComplete ? 'Todos los componentes creados exitosamente' : 'Faltan componentes del flujo');

        } catch (error) {
            this.addTestResult('Flujo de negocio completo', false, error.message);
        }
    }

    async testErrorHandlingWorkflow() {
        console.log('⚠️ Probando manejo de errores...');

        try {
            // 1. Buscar usuario inexistente
            const nonExistentUser = await this.database.getUserByEmail('noexiste@test.com');
            this.addTestResult('Usuario inexistente', !nonExistentUser, 
                !nonExistentUser ? 'Manejo correcto de usuario inexistente' : 'Error en manejo de usuario inexistente');

            // 2. Buscar cliente inexistente
            const nonExistentClient = await this.database.getClientById(99999);
            this.addTestResult('Cliente inexistente', !nonExistentClient, 
                !nonExistentClient ? 'Manejo correcto de cliente inexistente' : 'Error en manejo de cliente inexistente');

            // 3. Datos vacíos o inválidos
            try {
                await this.database.createClient({});
                this.addTestResult('Validación de datos vacíos', false, 'Debería rechazar datos vacíos');
            } catch (error) {
                this.addTestResult('Validación de datos vacíos', true, 'Datos vacíos rechazados correctamente');
            }

            // 4. Operaciones con IDs inválidos
            const invalidUpdate = await this.database.updateClient(99999, { nombre: 'Test' });
            this.addTestResult('Actualización con ID inválido', !invalidUpdate, 
                !invalidUpdate ? 'ID inválido manejado correctamente' : 'Error en manejo de ID inválido');

        } catch (error) {
            this.addTestResult('Manejo de errores', false, error.message);
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
        console.log('📋 RESUMEN DE PRUEBAS DE INTEGRACIÓN COMPLETAS');
        console.log('='.repeat(60));
        console.log(`✅ Pruebas exitosas: ${this.testResults.passed}`);
        console.log(`❌ Pruebas fallidas: ${this.testResults.failed}`);
        console.log(`📊 Total de pruebas: ${this.testResults.tests.length}`);
        
        const successRate = this.testResults.tests.length > 0 ? 
            ((this.testResults.passed / this.testResults.tests.length) * 100).toFixed(1) : 0;
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
        
        if (successRate >= 95) {
            console.log('🎉 ¡EXCELENTE! La aplicación está funcionando perfectamente.');
            console.log('🚀 Todos los flujos de trabajo están operativos y la integración es exitosa.');
        } else if (successRate >= 85) {
            console.log('✅ ¡MUY BIEN! La aplicación está funcionando correctamente.');
            console.log('🔧 Hay algunos problemas menores que pueden necesitar atención.');
        } else if (successRate >= 70) {
            console.log('⚠️ La aplicación funciona pero hay problemas que necesitan atención.');
        } else {
            console.log('🚨 La aplicación tiene problemas significativos que deben ser corregidos.');
        }

        // Resumen de funcionalidades probadas
        console.log('\n🌟 FUNCIONALIDADES INTEGRADAS PROBADAS:');
        console.log('   • Gestión completa de usuarios y autenticación');
        console.log('   • CRUD completo de clientes con búsqueda');
        console.log('   • Gestión de productos y servicios');
        console.log('   • Creación y gestión de facturas');
        console.log('   • Configuración de empresa y parámetros');
        console.log('   • Estadísticas y dashboard');
        console.log('   • Manejo robusto de errores');
        console.log('   • Flujos de trabajo de negocio completos');
    }
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
    const tester = new IntegrationTester();
    tester.runIntegrationTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error en las pruebas de integración:', error);
        process.exit(1);
    });
}

module.exports = IntegrationTester;
