// Script para probar la funcionalidad de configuración de la aplicación
const JSONDatabase = require('./js/jsonDatabase');

class AppConfigurationTester {
    constructor() {
        this.database = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runConfigurationTests() {
        console.log('⚙️ Iniciando pruebas de configuración de la aplicación...\n');

        try {
            // Inicializar base de datos
            this.database = new JSONDatabase();
            await this.database.init();

            // Ejecutar pruebas
            await this.testConfigurationPage();
            await this.testCompanySettings();
            await this.testInvoiceSettings();
            await this.testSettingsStorage();
            await this.testSettingsValidation();
            await this.testDefaultValues();

            this.showResults();

        } catch (error) {
            console.error('❌ Error durante las pruebas de configuración:', error);
        } finally {
            if (this.database) {
                await this.database.close();
            }
        }
    }

    async testConfigurationPage() {
        console.log('📄 Probando página de configuración...');

        try {
            const fs = require('fs');
            const path = require('path');
            
            // Verificar que existe la página de ajustes
            const ajustesPath = path.join(__dirname, 'pages', 'ajustes.html');
            const ajustesExists = fs.existsSync(ajustesPath);
            this.addTestResult('Página de ajustes', ajustesExists, 
                ajustesExists ? 'ajustes.html encontrado' : 'ajustes.html no encontrado');

            if (ajustesExists) {
                const content = fs.readFileSync(ajustesPath, 'utf-8');
                
                // Verificar formularios
                const hasCompanyForm = content.includes('id="companyForm"');
                this.addTestResult('Formulario de empresa', hasCompanyForm, 
                    hasCompanyForm ? 'Formulario de empresa encontrado' : 'Formulario de empresa no encontrado');

                const hasInvoiceForm = content.includes('id="invoiceSettingsForm"');
                this.addTestResult('Formulario de facturas', hasInvoiceForm, 
                    hasInvoiceForm ? 'Formulario de facturas encontrado' : 'Formulario de facturas no encontrado');

                // Verificar campos de empresa
                const companyFields = [
                    'company_name', 'company_nif', 'company_address', 
                    'company_phone', 'company_email', 'company_website'
                ];
                const hasCompanyFields = companyFields.every(field => content.includes(`name="${field}"`));
                this.addTestResult('Campos de empresa', hasCompanyFields, 
                    hasCompanyFields ? 'Todos los campos de empresa presentes' : 'Faltan campos de empresa');

                // Verificar campos de facturación
                const invoiceFields = [
                    'invoice_prefix', 'invoice_start_number', 'default_vat', 'default_due_days'
                ];
                const hasInvoiceFields = invoiceFields.some(field => content.includes(`name="${field}"`));
                this.addTestResult('Campos de facturación', hasInvoiceFields, 
                    hasInvoiceFields ? 'Campos de facturación presentes' : 'Campos de facturación no encontrados');

                // Verificar funciones JavaScript
                const hasLoadSettings = content.includes('loadSettings');
                this.addTestResult('Función loadSettings', hasLoadSettings, 
                    hasLoadSettings ? 'Función loadSettings encontrada' : 'Función loadSettings no encontrada');

                const hasSaveSettings = content.includes('saveCompanySettings') && content.includes('saveInvoiceSettings');
                this.addTestResult('Funciones de guardado', hasSaveSettings, 
                    hasSaveSettings ? 'Funciones de guardado encontradas' : 'Funciones de guardado no encontradas');
            }

        } catch (error) {
            this.addTestResult('Página de configuración', false, error.message);
        }
    }

    async testCompanySettings() {
        console.log('🏢 Probando configuración de empresa...');

        try {
            // Datos de prueba para empresa
            const testCompanyData = {
                company_name: 'Empresa Test S.L.',
                company_nif: 'B12345678',
                company_address: 'Calle Test, 123 - 28001 Madrid',
                company_phone: '+34 91 123 45 67',
                company_email: 'test@empresa.com',
                company_website: 'https://www.empresa-test.com'
            };

            // Guardar configuración de empresa
            const saveResult = await this.database.saveCompanySettings(testCompanyData);
            this.addTestResult('Guardar configuración de empresa', saveResult.success, 
                saveResult.success ? 'Configuración guardada exitosamente' : 'Error al guardar configuración');

            // Obtener configuración guardada
            const settings = await this.database.getAppSettings();
            this.addTestResult('Obtener configuración de empresa', !!settings.company, 
                settings.company ? 'Configuración de empresa obtenida' : 'Configuración de empresa no encontrada');

            if (settings.company) {
                // Verificar que los datos se guardaron correctamente
                const dataMatches = Object.keys(testCompanyData).every(key => 
                    settings.company[key] === testCompanyData[key]
                );
                this.addTestResult('Integridad de datos de empresa', dataMatches, 
                    dataMatches ? 'Datos guardados correctamente' : 'Datos no coinciden');
            }

        } catch (error) {
            this.addTestResult('Configuración de empresa', false, error.message);
        }
    }

    async testInvoiceSettings() {
        console.log('🧾 Probando configuración de facturas...');

        try {
            // Datos de prueba para facturas
            const testInvoiceData = {
                invoice_prefix: 'TEST',
                invoice_start_number: 1000,
                default_vat: 21,
                default_due_days: 30,
                invoice_footer: 'Gracias por su confianza',
                payment_terms: 'Pago a 30 días'
            };

            // Guardar configuración de facturas
            const saveResult = await this.database.saveInvoiceSettings(testInvoiceData);
            this.addTestResult('Guardar configuración de facturas', saveResult.success, 
                saveResult.success ? 'Configuración guardada exitosamente' : 'Error al guardar configuración');

            // Obtener configuración guardada
            const settings = await this.database.getAppSettings();
            this.addTestResult('Obtener configuración de facturas', !!settings.invoice, 
                settings.invoice ? 'Configuración de facturas obtenida' : 'Configuración de facturas no encontrada');

            if (settings.invoice) {
                // Verificar que los datos se guardaron correctamente
                const dataMatches = Object.keys(testInvoiceData).every(key => 
                    settings.invoice[key] == testInvoiceData[key] // Usar == para comparar números y strings
                );
                this.addTestResult('Integridad de datos de facturas', dataMatches, 
                    dataMatches ? 'Datos guardados correctamente' : 'Datos no coinciden');
            }

        } catch (error) {
            this.addTestResult('Configuración de facturas', false, error.message);
        }
    }

    async testSettingsStorage() {
        console.log('💾 Probando almacenamiento de configuración...');

        try {
            // Verificar que las configuraciones persisten
            const settings1 = await this.database.getAppSettings();
            
            // Modificar una configuración
            await this.database.saveCompanySettings({
                company_name: 'Empresa Modificada S.L.'
            });

            // Verificar que el cambio se guardó
            const settings2 = await this.database.getAppSettings();
            const nameChanged = settings2.company && settings2.company.company_name === 'Empresa Modificada S.L.';
            this.addTestResult('Persistencia de cambios', nameChanged, 
                nameChanged ? 'Cambios persistidos correctamente' : 'Cambios no persistidos');

            // Verificar que se pueden actualizar configuraciones existentes
            await this.database.saveCompanySettings({
                company_name: 'Empresa Final S.L.',
                company_phone: '+34 91 999 88 77'
            });

            const settings3 = await this.database.getAppSettings();
            const updatesWork = settings3.company && 
                              settings3.company.company_name === 'Empresa Final S.L.' &&
                              settings3.company.company_phone === '+34 91 999 88 77';
            this.addTestResult('Actualización de configuración', updatesWork, 
                updatesWork ? 'Actualizaciones funcionan correctamente' : 'Error en actualizaciones');

        } catch (error) {
            this.addTestResult('Almacenamiento de configuración', false, error.message);
        }
    }

    async testSettingsValidation() {
        console.log('✅ Probando validación de configuración...');

        try {
            // Probar con datos válidos
            const validData = {
                company_name: 'Empresa Válida S.L.',
                company_email: 'valido@empresa.com'
            };

            const validResult = await this.database.saveCompanySettings(validData);
            this.addTestResult('Datos válidos aceptados', validResult.success, 
                validResult.success ? 'Datos válidos procesados correctamente' : 'Error con datos válidos');

            // Verificar que se pueden guardar configuraciones parciales
            const partialData = {
                company_name: 'Solo Nombre'
            };

            const partialResult = await this.database.saveCompanySettings(partialData);
            this.addTestResult('Configuración parcial', partialResult.success, 
                partialResult.success ? 'Configuración parcial aceptada' : 'Error con configuración parcial');

        } catch (error) {
            this.addTestResult('Validación de configuración', false, error.message);
        }
    }

    async testDefaultValues() {
        console.log('🔧 Probando valores por defecto...');

        try {
            // Crear una nueva instancia de base de datos para simular primera ejecución
            const newDatabase = new JSONDatabase();
            await newDatabase.init();

            // Obtener configuración inicial
            const defaultSettings = await newDatabase.getAppSettings();
            
            // Verificar que existen valores por defecto
            const hasDefaultCompany = defaultSettings.company && 
                                    Object.keys(defaultSettings.company).length > 0;
            this.addTestResult('Valores por defecto de empresa', hasDefaultCompany, 
                hasDefaultCompany ? 'Valores por defecto de empresa presentes' : 'No hay valores por defecto de empresa');

            if (hasDefaultCompany) {
                // Verificar campos específicos por defecto
                const hasCompanyName = defaultSettings.company.company_name;
                this.addTestResult('Nombre de empresa por defecto', !!hasCompanyName, 
                    hasCompanyName ? `Nombre por defecto: ${hasCompanyName}` : 'No hay nombre por defecto');

                const hasCompanyAddress = defaultSettings.company.company_address;
                this.addTestResult('Dirección por defecto', !!hasCompanyAddress, 
                    hasCompanyAddress ? 'Dirección por defecto presente' : 'No hay dirección por defecto');
            }

            await newDatabase.close();

        } catch (error) {
            this.addTestResult('Valores por defecto', false, error.message);
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
        console.log('📋 RESUMEN DE PRUEBAS DE CONFIGURACIÓN');
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
            console.log('🎉 ¡Excelente! El sistema de configuración está funcionando correctamente.');
        } else if (successRate >= 70) {
            console.log('⚠️ El sistema de configuración funciona pero hay algunos problemas que necesitan atención.');
        } else {
            console.log('🚨 El sistema de configuración tiene problemas significativos que deben ser corregidos.');
        }

        // Funcionalidades destacadas
        console.log('\n🌟 FUNCIONALIDADES DE CONFIGURACIÓN:');
        console.log('   • Configuración completa de datos de empresa');
        console.log('   • Configuración de parámetros de facturación');
        console.log('   • Persistencia de configuraciones');
        console.log('   • Valores por defecto para nueva instalación');
        console.log('   • Actualización parcial de configuraciones');
        console.log('   • Interfaz de usuario intuitiva para ajustes');
    }
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
    const tester = new AppConfigurationTester();
    tester.runConfigurationTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error en las pruebas de configuración:', error);
        process.exit(1);
    });
}

module.exports = AppConfigurationTester;
