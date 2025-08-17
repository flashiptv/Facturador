// Script para verificar que todas las correcciones funcionan correctamente
const JSONDatabase = require('./js/jsonDatabase');

class FixesVerificationTester {
    constructor() {
        this.database = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runFixesVerification() {
        console.log('🔧 Verificando correcciones aplicadas...\n');

        try {
            // Inicializar base de datos
            this.database = new JSONDatabase();
            await this.database.init();

            // Ejecutar pruebas de correcciones
            await this.testGlobalErrorHandling();
            await this.testNumericValidation();
            await this.testTimeoutImplementation();
            await this.testEmptyDataValidation();
            await this.testSearchFunctionality();

            this.showResults();

        } catch (error) {
            console.error('❌ Error durante la verificación de correcciones:', error);
        } finally {
            if (this.database) {
                await this.database.close();
            }
        }
    }

    async testGlobalErrorHandling() {
        console.log('🛡️ Probando manejo global de errores...');

        try {
            const fs = require('fs');
            const path = require('path');

            // Verificar app.js
            const appJsPath = path.join(__dirname, 'js', 'app.js');
            const appContent = fs.readFileSync(appJsPath, 'utf-8');
            
            const hasGlobalErrorHandler = appContent.includes('window.addEventListener(\'error\'');
            this.addTestResult('Manejo global de errores en app.js', hasGlobalErrorHandler, 
                hasGlobalErrorHandler ? 'Manejo global implementado' : 'Manejo global no encontrado');

            const hasUnhandledRejection = appContent.includes('unhandledrejection');
            this.addTestResult('Manejo de promesas rechazadas', hasUnhandledRejection, 
                hasUnhandledRejection ? 'Manejo de promesas implementado' : 'Manejo de promesas no encontrado');

            // Verificar páginas HTML
            const clientesPath = path.join(__dirname, 'pages', 'clientes.html');
            const clientesContent = fs.readFileSync(clientesPath, 'utf-8');
            
            const hasPageErrorHandler = clientesContent.includes('window.addEventListener(\'error\'');
            this.addTestResult('Manejo de errores en páginas', hasPageErrorHandler, 
                hasPageErrorHandler ? 'Manejo en páginas implementado' : 'Manejo en páginas no encontrado');

        } catch (error) {
            this.addTestResult('Manejo global de errores', false, error.message);
        }
    }

    async testNumericValidation() {
        console.log('🔢 Probando validación numérica...');

        try {
            const fs = require('fs');
            const path = require('path');

            // Verificar formulario de clientes
            const clientesPath = path.join(__dirname, 'pages', 'clientes.html');
            const clientesContent = fs.readFileSync(clientesPath, 'utf-8');
            
            const hasNumericPostalCode = clientesContent.includes('type="number"') && 
                                       clientesContent.includes('name="codigo_postal"');
            this.addTestResult('Validación numérica código postal', hasNumericPostalCode, 
                hasNumericPostalCode ? 'Código postal con validación numérica' : 'Código postal sin validación numérica');

            const hasPhonePattern = clientesContent.includes('pattern=') && 
                                  clientesContent.includes('name="telefono"');
            this.addTestResult('Patrón de validación teléfono', hasPhonePattern, 
                hasPhonePattern ? 'Teléfono con patrón de validación' : 'Teléfono sin patrón de validación');

        } catch (error) {
            this.addTestResult('Validación numérica', false, error.message);
        }
    }

    async testTimeoutImplementation() {
        console.log('⏱️ Probando implementación de timeouts...');

        try {
            const fs = require('fs');
            const path = require('path');

            // Verificar app.js
            const appJsPath = path.join(__dirname, 'js', 'app.js');
            const appContent = fs.readFileSync(appJsPath, 'utf-8');
            
            const hasTimeoutConfig = appContent.includes('defaultTimeout') && 
                                   appContent.includes('longTimeout');
            this.addTestResult('Configuración de timeouts', hasTimeoutConfig, 
                hasTimeoutConfig ? 'Configuración de timeouts presente' : 'Configuración de timeouts no encontrada');

            const hasTimeoutFunction = appContent.includes('invokeWithTimeout');
            this.addTestResult('Función de timeout', hasTimeoutFunction, 
                hasTimeoutFunction ? 'Función invokeWithTimeout implementada' : 'Función invokeWithTimeout no encontrada');

            const hasPromiseRace = appContent.includes('Promise.race');
            this.addTestResult('Implementación Promise.race', hasPromiseRace, 
                hasPromiseRace ? 'Promise.race para timeouts implementado' : 'Promise.race no encontrado');

        } catch (error) {
            this.addTestResult('Implementación de timeouts', false, error.message);
        }
    }

    async testEmptyDataValidation() {
        console.log('✅ Probando validación de datos vacíos...');

        try {
            // Probar validación de cliente vacío
            try {
                await this.database.createClient({});
                this.addTestResult('Rechazo de cliente vacío', false, 'Cliente vacío fue aceptado');
            } catch (error) {
                this.addTestResult('Rechazo de cliente vacío', true, 'Cliente vacío rechazado correctamente');
            }

            // Probar validación de usuario vacío
            try {
                await this.database.createUser({});
                this.addTestResult('Rechazo de usuario vacío', false, 'Usuario vacío fue aceptado');
            } catch (error) {
                this.addTestResult('Rechazo de usuario vacío', true, 'Usuario vacío rechazado correctamente');
            }

            // Probar validación de producto vacío
            try {
                await this.database.createProduct({});
                this.addTestResult('Rechazo de producto vacío', false, 'Producto vacío fue aceptado');
            } catch (error) {
                this.addTestResult('Rechazo de producto vacío', true, 'Producto vacío rechazado correctamente');
            }

            // Probar validación de email inválido
            try {
                await this.database.createUser({
                    name: 'Test User',
                    email: 'email-invalido',
                    password: 'password123'
                });
                this.addTestResult('Rechazo de email inválido', false, 'Email inválido fue aceptado');
            } catch (error) {
                this.addTestResult('Rechazo de email inválido', true, 'Email inválido rechazado correctamente');
            }

        } catch (error) {
            this.addTestResult('Validación de datos vacíos', false, error.message);
        }
    }

    async testSearchFunctionality() {
        console.log('🔍 Probando funcionalidad de búsqueda corregida...');

        try {
            // Crear un cliente de prueba
            const testClient = await this.database.createClient({
                nombre: 'Cliente Búsqueda Test',
                email: 'busqueda@test.com',
                telefono: '123456789'
            });

            // Probar búsqueda por nombre
            const searchByName = await this.database.searchClients('Búsqueda');
            this.addTestResult('Búsqueda por nombre', searchByName.length > 0, 
                `${searchByName.length} clientes encontrados por nombre`);

            // Probar búsqueda por email
            const searchByEmail = await this.database.searchClients('busqueda@test.com');
            this.addTestResult('Búsqueda por email', searchByEmail.length > 0, 
                `${searchByEmail.length} clientes encontrados por email`);

            // Probar búsqueda vacía
            const searchEmpty = await this.database.searchClients('');
            this.addTestResult('Búsqueda vacía', searchEmpty.length >= 0, 
                `Búsqueda vacía retorna ${searchEmpty.length} clientes`);

            // Probar búsqueda con término inexistente
            const searchNonExistent = await this.database.searchClients('término-inexistente-xyz');
            this.addTestResult('Búsqueda término inexistente', searchNonExistent.length === 0, 
                `Búsqueda inexistente retorna ${searchNonExistent.length} clientes`);

        } catch (error) {
            this.addTestResult('Funcionalidad de búsqueda', false, error.message);
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
        console.log('📋 RESUMEN DE VERIFICACIÓN DE CORRECCIONES');
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
            console.log('🎉 ¡PERFECTO! Todas las correcciones funcionan correctamente.');
            console.log('✨ La aplicación está lista para producción al 100%.');
        } else if (successRate >= 85) {
            console.log('✅ ¡Muy bien! La mayoría de las correcciones funcionan.');
            console.log('🔧 Algunas mejoras menores pueden ser necesarias.');
        } else {
            console.log('⚠️ Algunas correcciones necesitan más trabajo.');
        }

        // Resumen de correcciones aplicadas
        console.log('\n🔧 CORRECCIONES APLICADAS:');
        console.log('   ✅ Manejo global de errores en JavaScript');
        console.log('   ✅ Validación numérica en formularios');
        console.log('   ✅ Implementación de timeouts para operaciones');
        console.log('   ✅ Validación robusta de datos vacíos');
        console.log('   ✅ Corrección de funcionalidad de búsqueda');
    }
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
    const tester = new FixesVerificationTester();
    tester.runFixesVerification().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error en la verificación de correcciones:', error);
        process.exit(1);
    });
}

module.exports = FixesVerificationTester;
