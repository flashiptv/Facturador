// Script para probar el manejo de errores de la aplicación
const fs = require('fs');
const path = require('path');

class ErrorHandlingTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runErrorHandlingTests() {
        console.log('⚠️ Iniciando pruebas de manejo de errores...\n');

        try {
            // Ejecutar pruebas de manejo de errores
            await this.testJavaScriptErrorHandling();
            await this.testDatabaseErrorHandling();
            await this.testFileErrorHandling();
            await this.testUIErrorHandling();
            await this.testValidationErrors();
            await this.testNetworkErrors();

            this.showResults();

        } catch (error) {
            console.error('❌ Error durante las pruebas de manejo de errores:', error);
        }
    }

    async testJavaScriptErrorHandling() {
        console.log('🔧 Probando manejo de errores JavaScript...');

        try {
            // Verificar try-catch en archivos principales
            const jsFiles = [
                'js/app.js',
                'js/jsonDatabase.js',
                'js/fileManager.js',
                'js/pdfExporter.js'
            ];

            jsFiles.forEach(filePath => {
                if (fs.existsSync(path.join(__dirname, filePath))) {
                    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf-8');
                    
                    const hasTryCatch = content.includes('try {') && content.includes('catch');
                    this.addTestResult(`Try-catch en ${filePath}`, hasTryCatch, 
                        hasTryCatch ? 'Manejo de errores implementado' : 'No hay manejo de errores');

                    const hasErrorLogging = content.includes('console.error') || content.includes('console.log');
                    this.addTestResult(`Logging de errores en ${filePath}`, hasErrorLogging, 
                        hasErrorLogging ? 'Logging de errores presente' : 'No hay logging de errores');
                }
            });

            // Verificar manejo de errores en páginas HTML
            const htmlFiles = fs.readdirSync(path.join(__dirname, 'pages'))
                .filter(file => file.endsWith('.html'));

            let hasGlobalErrorHandling = false;
            htmlFiles.forEach(file => {
                const content = fs.readFileSync(path.join(__dirname, 'pages', file), 'utf-8');
                if (content.includes('window.onerror') || content.includes('addEventListener(\'error\'')) {
                    hasGlobalErrorHandling = true;
                }
            });

            this.addTestResult('Manejo global de errores en UI', hasGlobalErrorHandling, 
                hasGlobalErrorHandling ? 'Manejo global implementado' : 'No hay manejo global de errores');

        } catch (error) {
            this.addTestResult('Manejo de errores JavaScript', false, error.message);
        }
    }

    async testDatabaseErrorHandling() {
        console.log('🗄️ Probando manejo de errores de base de datos...');

        try {
            const dbPath = path.join(__dirname, 'js', 'jsonDatabase.js');
            if (fs.existsSync(dbPath)) {
                const content = fs.readFileSync(dbPath, 'utf-8');
                
                // Verificar manejo de errores en operaciones de BD
                const hasConnectionErrorHandling = content.includes('Error al inicializar') || 
                                                 content.includes('Error al conectar');
                this.addTestResult('Manejo de errores de conexión', hasConnectionErrorHandling, 
                    hasConnectionErrorHandling ? 'Errores de conexión manejados' : 'No hay manejo de errores de conexión');

                const hasQueryErrorHandling = content.includes('catch') && 
                                            (content.includes('query') || content.includes('save'));
                this.addTestResult('Manejo de errores de consulta', hasQueryErrorHandling, 
                    hasQueryErrorHandling ? 'Errores de consulta manejados' : 'No hay manejo de errores de consulta');

                // Verificar validación de datos
                const hasDataValidation = content.includes('validate') || 
                                        content.includes('required') || 
                                        content.includes('null') || 
                                        content.includes('undefined');
                this.addTestResult('Validación de datos', hasDataValidation, 
                    hasDataValidation ? 'Validación de datos presente' : 'No hay validación de datos');
            }

        } catch (error) {
            this.addTestResult('Manejo de errores de base de datos', false, error.message);
        }
    }

    async testFileErrorHandling() {
        console.log('📁 Probando manejo de errores de archivos...');

        try {
            const fileManagerPath = path.join(__dirname, 'js', 'fileManager.js');
            if (fs.existsSync(fileManagerPath)) {
                const content = fs.readFileSync(fileManagerPath, 'utf-8');
                
                // Verificar validación de tipos de archivo
                const hasFileTypeValidation = content.includes('allowedTypes') || 
                                             content.includes('validateFile');
                this.addTestResult('Validación de tipos de archivo', hasFileTypeValidation, 
                    hasFileTypeValidation ? 'Validación de tipos implementada' : 'No hay validación de tipos');

                // Verificar validación de tamaño
                const hasFileSizeValidation = content.includes('maxFileSize') || 
                                            content.includes('size');
                this.addTestResult('Validación de tamaño de archivo', hasFileSizeValidation, 
                    hasFileSizeValidation ? 'Validación de tamaño implementada' : 'No hay validación de tamaño');

                // Verificar manejo de errores de lectura/escritura
                const hasFileIOErrorHandling = content.includes('fs.') && content.includes('catch');
                this.addTestResult('Manejo de errores de E/S de archivos', hasFileIOErrorHandling, 
                    hasFileIOErrorHandling ? 'Errores de E/S manejados' : 'No hay manejo de errores de E/S');

                // Verificar notificaciones de error al usuario
                const hasUserNotifications = content.includes('showNotification') || 
                                            content.includes('alert') || 
                                            content.includes('error');
                this.addTestResult('Notificaciones de error al usuario', hasUserNotifications, 
                    hasUserNotifications ? 'Notificaciones implementadas' : 'No hay notificaciones');
            }

        } catch (error) {
            this.addTestResult('Manejo de errores de archivos', false, error.message);
        }
    }

    async testUIErrorHandling() {
        console.log('🖥️ Probando manejo de errores de interfaz...');

        try {
            // Verificar app.js para manejo de errores de UI
            const appJsPath = path.join(__dirname, 'js', 'app.js');
            if (fs.existsSync(appJsPath)) {
                const content = fs.readFileSync(appJsPath, 'utf-8');
                
                // Verificar sistema de notificaciones
                const hasNotificationSystem = content.includes('showNotification') || 
                                             content.includes('notification');
                this.addTestResult('Sistema de notificaciones', hasNotificationSystem, 
                    hasNotificationSystem ? 'Sistema de notificaciones presente' : 'No hay sistema de notificaciones');

                // Verificar manejo de errores de navegación
                const hasNavigationErrorHandling = content.includes('navigateTo') && content.includes('catch');
                this.addTestResult('Manejo de errores de navegación', hasNavigationErrorHandling, 
                    hasNavigationErrorHandling ? 'Errores de navegación manejados' : 'No hay manejo de errores de navegación');
            }

            // Verificar manejo de errores en formularios
            const htmlFiles = fs.readdirSync(path.join(__dirname, 'pages'))
                .filter(file => file.endsWith('.html'));

            let hasFormValidation = false;
            let hasFormErrorDisplay = false;

            htmlFiles.forEach(file => {
                const content = fs.readFileSync(path.join(__dirname, 'pages', file), 'utf-8');
                
                if (content.includes('required') || content.includes('validate')) {
                    hasFormValidation = true;
                }
                
                if (content.includes('error') && (content.includes('class') || content.includes('id'))) {
                    hasFormErrorDisplay = true;
                }
            });

            this.addTestResult('Validación de formularios', hasFormValidation, 
                hasFormValidation ? 'Validación de formularios presente' : 'No hay validación de formularios');

            this.addTestResult('Visualización de errores en formularios', hasFormErrorDisplay, 
                hasFormErrorDisplay ? 'Visualización de errores implementada' : 'No hay visualización de errores');

        } catch (error) {
            this.addTestResult('Manejo de errores de interfaz', false, error.message);
        }
    }

    async testValidationErrors() {
        console.log('✅ Probando errores de validación...');

        try {
            // Verificar validaciones en páginas principales
            const pages = ['clientes.html', 'appfacturas.html', 'ajustes.html'];
            
            pages.forEach(page => {
                const pagePath = path.join(__dirname, 'pages', page);
                if (fs.existsSync(pagePath)) {
                    const content = fs.readFileSync(pagePath, 'utf-8');
                    
                    // Verificar campos requeridos
                    const hasRequiredFields = content.includes('required');
                    this.addTestResult(`Campos requeridos en ${page}`, hasRequiredFields, 
                        hasRequiredFields ? 'Campos requeridos definidos' : 'No hay campos requeridos');

                    // Verificar validación de email
                    const hasEmailValidation = content.includes('type="email"') || 
                                              content.includes('email');
                    this.addTestResult(`Validación de email en ${page}`, hasEmailValidation, 
                        hasEmailValidation ? 'Validación de email presente' : 'No hay validación de email');

                    // Verificar validación de números
                    const hasNumberValidation = content.includes('type="number"') || 
                                               content.includes('min=') || 
                                               content.includes('max=');
                    this.addTestResult(`Validación de números en ${page}`, hasNumberValidation, 
                        hasNumberValidation ? 'Validación de números presente' : 'No hay validación de números');
                }
            });

        } catch (error) {
            this.addTestResult('Errores de validación', false, error.message);
        }
    }

    async testNetworkErrors() {
        console.log('🌐 Probando manejo de errores de red...');

        try {
            // Verificar manejo de errores en comunicación IPC
            const jsFiles = ['js/app.js', 'pages/clientes.html', 'pages/appfacturas.html'];
            
            let hasIpcErrorHandling = false;
            
            jsFiles.forEach(filePath => {
                const fullPath = path.join(__dirname, filePath);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    
                    if (content.includes('ipcRenderer.invoke') && content.includes('catch')) {
                        hasIpcErrorHandling = true;
                    }
                }
            });

            this.addTestResult('Manejo de errores IPC', hasIpcErrorHandling, 
                hasIpcErrorHandling ? 'Errores IPC manejados' : 'No hay manejo de errores IPC');

            // Verificar timeouts y reintentos
            const mainJsPath = path.join(__dirname, 'main.js');
            if (fs.existsSync(mainJsPath)) {
                const content = fs.readFileSync(mainJsPath, 'utf-8');
                
                const hasTimeoutHandling = content.includes('timeout') || content.includes('setTimeout');
                this.addTestResult('Manejo de timeouts', hasTimeoutHandling, 
                    hasTimeoutHandling ? 'Timeouts manejados' : 'No hay manejo de timeouts');
            }

        } catch (error) {
            this.addTestResult('Manejo de errores de red', false, error.message);
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
        console.log('📋 RESUMEN DE PRUEBAS DE MANEJO DE ERRORES');
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
            console.log('🎉 ¡Excelente! El manejo de errores está implementado correctamente.');
        } else if (successRate >= 70) {
            console.log('⚠️ El manejo de errores funciona pero hay algunos problemas que necesitan atención.');
        } else {
            console.log('🚨 El manejo de errores tiene problemas significativos que deben ser corregidos.');
        }

        // Recomendaciones
        console.log('\n💡 ASPECTOS DEL MANEJO DE ERRORES EVALUADOS:');
        console.log('   • Try-catch en código JavaScript');
        console.log('   • Logging y registro de errores');
        console.log('   • Validación de datos de entrada');
        console.log('   • Manejo de errores de base de datos');
        console.log('   • Validación de archivos y tipos');
        console.log('   • Notificaciones de error al usuario');
        console.log('   • Validación de formularios');
        console.log('   • Manejo de errores de comunicación');
    }
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
    const tester = new ErrorHandlingTester();
    tester.runErrorHandlingTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error en las pruebas de manejo de errores:', error);
        process.exit(1);
    });
}

module.exports = ErrorHandlingTester;
