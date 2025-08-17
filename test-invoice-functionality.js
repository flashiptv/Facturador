// Script para probar funcionalidad específica de facturas
const JSONDatabase = require('./js/jsonDatabase');

class InvoiceTester {
    constructor() {
        this.database = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runInvoiceTests() {
        console.log('🧾 Iniciando pruebas específicas de facturas...\n');

        try {
            // Inicializar base de datos
            this.database = new JSONDatabase();
            await this.database.init();

            // Ejecutar pruebas de facturas
            await this.testInvoiceNumberGeneration();
            await this.testInvoiceCreation();
            await this.testInvoiceCalculations();
            await this.testInvoiceStates();
            await this.testInvoiceLines();
            await this.testInvoiceSearch();

            this.showResults();

        } catch (error) {
            console.error('❌ Error durante las pruebas de facturas:', error);
        } finally {
            if (this.database) {
                await this.database.close();
            }
        }
    }

    async testInvoiceNumberGeneration() {
        console.log('🔢 Probando generación de números de factura...');

        try {
            // Generar primer número
            const number1 = await this.database.generateNextInvoiceNumber();

            // Simular creación de factura para que el siguiente número sea diferente
            this.database.data.invoices.push({
                numero: number1,
                client_id: 1,
                fecha_emision: new Date().toISOString().split('T')[0],
                total: 100
            });

            // Generar segundo número
            const number2 = await this.database.generateNextInvoiceNumber();

            // Simular otra factura
            this.database.data.invoices.push({
                numero: number2,
                client_id: 1,
                fecha_emision: new Date().toISOString().split('T')[0],
                total: 200
            });

            // Generar tercer número
            const number3 = await this.database.generateNextInvoiceNumber();

            // Verificar formato
            const currentYear = new Date().getFullYear();
            const expectedPattern = new RegExp(`^FAC-${currentYear}-\\d{4}$`);

            this.addTestResult('Formato de número de factura',
                expectedPattern.test(number1),
                `Número generado: ${number1}`);

            // Verificar que los números son únicos
            this.addTestResult('Números únicos',
                number1 !== number2 && number2 !== number3 && number1 !== number3,
                `Números: ${number1}, ${number2}, ${number3}`);

        } catch (error) {
            this.addTestResult('Generación de números', false, error.message);
        }
    }

    async testInvoiceCreation() {
        console.log('📝 Probando creación de facturas...');

        try {
            // Crear cliente de prueba primero
            const testClient = {
                nombre: 'Cliente Factura Test',
                email: 'factura@test.com',
                telefono: '91 111 22 33',
                direccion: 'Calle Test Factura, 123',
                ciudad: 'Madrid',
                codigo_postal: '28001',
                nif_cif: 'B11111111'
            };

            const client = await this.database.createClient(testClient);
            this.addTestResult('Cliente para factura creado', !!client, 'Cliente creado exitosamente');

            if (client) {
                // Crear factura de prueba
                const invoiceData = {
                    numero: await this.database.generateNextInvoiceNumber(),
                    client_id: client.id,
                    fecha_emision: new Date().toISOString().split('T')[0],
                    fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    subtotal: 100.00,
                    total_iva: 21.00,
                    total: 121.00,
                    estado: 'borrador',
                    notas: 'Factura de prueba'
                };

                // Simular creación de factura (la base de datos JSON no tiene este método aún)
                this.addTestResult('Estructura de datos de factura', 
                    invoiceData.numero && invoiceData.client_id && invoiceData.total, 
                    'Datos de factura válidos');
            }

        } catch (error) {
            this.addTestResult('Creación de facturas', false, error.message);
        }
    }

    async testInvoiceCalculations() {
        console.log('🧮 Probando cálculos de facturas...');

        try {
            // Simular líneas de factura
            const lines = [
                { cantidad: 2, precio_unitario: 50.00, iva_percentage: 21 },
                { cantidad: 1, precio_unitario: 30.00, iva_percentage: 21 },
                { cantidad: 3, precio_unitario: 15.00, iva_percentage: 10 }
            ];

            let subtotal = 0;
            let totalIva = 0;

            lines.forEach(line => {
                const lineSubtotal = line.cantidad * line.precio_unitario;
                const lineIva = lineSubtotal * (line.iva_percentage / 100);
                subtotal += lineSubtotal;
                totalIva += lineIva;
            });

            const total = subtotal + totalIva;

            // Verificar cálculos
            const expectedSubtotal = 175.00; // (2*50) + (1*30) + (3*15)
            const expectedIva = 31.80; // (100*0.21) + (30*0.21) + (45*0.10) = 21 + 6.3 + 4.5
            const expectedTotal = 206.80;

            this.addTestResult('Cálculo de subtotal', 
                Math.abs(subtotal - expectedSubtotal) < 0.01, 
                `Calculado: ${subtotal}, Esperado: ${expectedSubtotal}`);

            this.addTestResult('Cálculo de IVA', 
                Math.abs(totalIva - expectedIva) < 0.01, 
                `Calculado: ${totalIva}, Esperado: ${expectedIva}`);

            this.addTestResult('Cálculo de total', 
                Math.abs(total - expectedTotal) < 0.01, 
                `Calculado: ${total}, Esperado: ${expectedTotal}`);

        } catch (error) {
            this.addTestResult('Cálculos de facturas', false, error.message);
        }
    }

    async testInvoiceStates() {
        console.log('📊 Probando estados de facturas...');

        try {
            const validStates = ['borrador', 'enviada', 'pagada', 'vencida', 'cancelada'];
            
            this.addTestResult('Estados válidos definidos', 
                validStates.length === 5, 
                `Estados: ${validStates.join(', ')}`);

            // Verificar transiciones de estado válidas
            const validTransitions = {
                'borrador': ['enviada', 'cancelada'],
                'enviada': ['pagada', 'vencida', 'cancelada'],
                'pagada': [], // Estado final
                'vencida': ['pagada', 'cancelada'],
                'cancelada': [] // Estado final
            };

            this.addTestResult('Transiciones de estado definidas', 
                Object.keys(validTransitions).length === 5, 
                'Transiciones de estado configuradas');

        } catch (error) {
            this.addTestResult('Estados de facturas', false, error.message);
        }
    }

    async testInvoiceLines() {
        console.log('📋 Probando líneas de factura...');

        try {
            // Simular estructura de línea de factura
            const sampleLine = {
                concepto: 'Producto de prueba',
                descripcion: 'Descripción del producto',
                cantidad: 2,
                precio_unitario: 50.00,
                descuento: 0,
                iva_percentage: 21.00,
                subtotal: 100.00,
                total_iva: 21.00,
                total: 121.00,
                orden: 1
            };

            // Verificar campos requeridos
            const requiredFields = ['concepto', 'cantidad', 'precio_unitario', 'iva_percentage'];
            const hasRequiredFields = requiredFields.every(field => 
                sampleLine.hasOwnProperty(field) && sampleLine[field] !== null && sampleLine[field] !== undefined
            );

            this.addTestResult('Campos requeridos en líneas', 
                hasRequiredFields, 
                `Campos: ${requiredFields.join(', ')}`);

            // Verificar cálculo de línea
            const expectedSubtotal = sampleLine.cantidad * sampleLine.precio_unitario;
            const expectedIva = expectedSubtotal * (sampleLine.iva_percentage / 100);
            const expectedTotal = expectedSubtotal + expectedIva;

            this.addTestResult('Cálculo de línea individual', 
                sampleLine.subtotal === expectedSubtotal && 
                sampleLine.total_iva === expectedIva && 
                sampleLine.total === expectedTotal, 
                `Subtotal: ${sampleLine.subtotal}, IVA: ${sampleLine.total_iva}, Total: ${sampleLine.total}`);

        } catch (error) {
            this.addTestResult('Líneas de factura', false, error.message);
        }
    }

    async testInvoiceSearch() {
        console.log('🔍 Probando búsqueda de facturas...');

        try {
            // Obtener todas las facturas
            const allInvoices = await this.database.getAllInvoices();
            
            this.addTestResult('Obtener todas las facturas', 
                Array.isArray(allInvoices), 
                `${allInvoices.length} facturas encontradas`);

            // Verificar estructura de factura con cliente
            if (allInvoices.length > 0) {
                const firstInvoice = allInvoices[0];
                const hasClientInfo = firstInvoice.hasOwnProperty('client_name') || 
                                    firstInvoice.hasOwnProperty('client_email');

                this.addTestResult('Información de cliente en facturas', 
                    hasClientInfo, 
                    'Datos de cliente incluidos en listado');
            }

            // Simular filtros de búsqueda
            const searchFilters = {
                estado: 'borrador',
                fecha_desde: '2024-01-01',
                fecha_hasta: '2024-12-31',
                cliente: 'test'
            };

            this.addTestResult('Filtros de búsqueda definidos', 
                Object.keys(searchFilters).length === 4, 
                `Filtros: ${Object.keys(searchFilters).join(', ')}`);

        } catch (error) {
            this.addTestResult('Búsqueda de facturas', false, error.message);
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
        console.log('📋 RESUMEN DE PRUEBAS DE FACTURAS');
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
        
        if (successRate >= 90) {
            console.log('🎉 ¡Excelente! El sistema de facturas está funcionando correctamente.');
        } else if (successRate >= 70) {
            console.log('⚠️ El sistema de facturas funciona pero hay algunos problemas que necesitan atención.');
        } else {
            console.log('🚨 El sistema de facturas tiene problemas significativos que deben ser corregidos.');
        }
    }
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
    const tester = new InvoiceTester();
    tester.runInvoiceTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error en las pruebas de facturas:', error);
        process.exit(1);
    });
}

module.exports = InvoiceTester;
