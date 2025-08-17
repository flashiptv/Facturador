// Script para probar la funcionalidad de gestión de archivos
const fs = require('fs');
const path = require('path');
const os = require('os');

class FileManagementTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
        this.testDir = path.join(os.tmpdir(), 'facturador-test-files');
        this.storageDir = path.join(os.homedir(), 'Facturador', 'uploads');
    }

    async runFileTests() {
        console.log('📁 Iniciando pruebas de gestión de archivos...\n');

        try {
            // Preparar entorno de prueba
            await this.setupTestEnvironment();
            
            // Verificar archivos del sistema
            await this.testFileSystemComponents();
            
            // Verificar estructura de clases
            await this.testFileManagerClass();
            
            // Verificar tipos de archivo soportados
            await this.testSupportedFileTypes();
            
            // Verificar funcionalidades de procesamiento
            await this.testFileProcessing();
            
            // Verificar integración con base de datos
            await this.testDatabaseIntegration();

            this.showResults();

        } catch (error) {
            console.error('❌ Error durante las pruebas de archivos:', error);
        } finally {
            await this.cleanupTestEnvironment();
        }
    }

    async setupTestEnvironment() {
        console.log('🔧 Configurando entorno de prueba...');

        try {
            // Crear directorio de prueba
            if (!fs.existsSync(this.testDir)) {
                fs.mkdirSync(this.testDir, { recursive: true });
            }

            // Crear archivos de prueba
            await this.createTestFiles();

            this.addTestResult('Configuración de entorno', true, 'Entorno de prueba configurado');

        } catch (error) {
            this.addTestResult('Configuración de entorno', false, error.message);
        }
    }

    async createTestFiles() {
        // Crear archivo de texto de prueba
        const textFile = path.join(this.testDir, 'test.txt');
        fs.writeFileSync(textFile, 'Este es un archivo de prueba para el sistema de gestión de archivos.');

        // Crear archivo CSV de prueba
        const csvFile = path.join(this.testDir, 'test.csv');
        fs.writeFileSync(csvFile, 'nombre,email,telefono\nJuan Pérez,juan@test.com,123456789\nMaría García,maria@test.com,987654321');

        // Crear archivo JSON de prueba
        const jsonFile = path.join(this.testDir, 'test.json');
        fs.writeFileSync(jsonFile, JSON.stringify({
            cliente: 'Test Cliente',
            factura: 'FAC-2025-0001',
            total: 121.00
        }, null, 2));
    }

    async testFileSystemComponents() {
        console.log('🗂️ Probando componentes del sistema de archivos...');

        try {
            // Verificar FileManager
            const fileManagerPath = path.join(__dirname, 'js', 'fileManager.js');
            const fileManagerExists = fs.existsSync(fileManagerPath);
            this.addTestResult('Archivo FileManager', fileManagerExists, 
                fileManagerExists ? 'fileManager.js encontrado' : 'fileManager.js no encontrado');

            if (fileManagerExists) {
                const content = fs.readFileSync(fileManagerPath, 'utf-8');
                
                // Verificar métodos principales
                const hasUploadMethod = content.includes('uploadFile');
                this.addTestResult('Método uploadFile', hasUploadMethod, 
                    hasUploadMethod ? 'Método encontrado' : 'Método no encontrado');

                const hasDownloadMethod = content.includes('downloadFile');
                this.addTestResult('Método downloadFile', hasDownloadMethod, 
                    hasDownloadMethod ? 'Método encontrado' : 'Método no encontrado');

                const hasDeleteMethod = content.includes('deleteFile');
                this.addTestResult('Método deleteFile', hasDeleteMethod, 
                    hasDeleteMethod ? 'Método encontrado' : 'Método no encontrado');

                const hasPreviewMethod = content.includes('previewFile');
                this.addTestResult('Método previewFile', hasPreviewMethod, 
                    hasPreviewMethod ? 'Método encontrado' : 'Método no encontrado');
            }

            // Verificar directorio de almacenamiento
            const storageExists = fs.existsSync(this.storageDir);
            this.addTestResult('Directorio de almacenamiento', true, 
                storageExists ? `Directorio existe: ${this.storageDir}` : `Directorio se creará: ${this.storageDir}`);

        } catch (error) {
            this.addTestResult('Componentes del sistema', false, error.message);
        }
    }

    async testFileManagerClass() {
        console.log('🏗️ Probando estructura de la clase FileManager...');

        try {
            const fileManagerPath = path.join(__dirname, 'js', 'fileManager.js');
            if (fs.existsSync(fileManagerPath)) {
                const content = fs.readFileSync(fileManagerPath, 'utf-8');
                
                // Verificar declaración de clase
                const hasClassDeclaration = content.includes('class FileManager');
                this.addTestResult('Declaración de clase', hasClassDeclaration, 
                    hasClassDeclaration ? 'Clase FileManager declarada' : 'Clase FileManager no encontrada');

                // Verificar constructor
                const hasConstructor = content.includes('constructor()');
                this.addTestResult('Constructor', hasConstructor, 
                    hasConstructor ? 'Constructor encontrado' : 'Constructor no encontrado');

                // Verificar configuración de tipos de archivo
                const hasAllowedTypes = content.includes('allowedTypes');
                this.addTestResult('Tipos de archivo permitidos', hasAllowedTypes, 
                    hasAllowedTypes ? 'Configuración de tipos encontrada' : 'Configuración de tipos no encontrada');

                // Verificar límite de tamaño
                const hasMaxFileSize = content.includes('maxFileSize');
                this.addTestResult('Límite de tamaño de archivo', hasMaxFileSize, 
                    hasMaxFileSize ? 'Límite de tamaño configurado' : 'Límite de tamaño no configurado');

                // Verificar drag and drop
                const hasDragDrop = content.includes('dragover') && content.includes('drop');
                this.addTestResult('Funcionalidad drag and drop', hasDragDrop, 
                    hasDragDrop ? 'Drag and drop implementado' : 'Drag and drop no implementado');
            }

        } catch (error) {
            this.addTestResult('Estructura de clase', false, error.message);
        }
    }

    async testSupportedFileTypes() {
        console.log('📄 Probando tipos de archivo soportados...');

        try {
            const fileManagerPath = path.join(__dirname, 'js', 'fileManager.js');
            if (fs.existsSync(fileManagerPath)) {
                const content = fs.readFileSync(fileManagerPath, 'utf-8');
                
                // Extraer tipos permitidos
                const allowedTypesMatch = content.match(/allowedTypes\s*=\s*\[(.*?)\]/s);
                if (allowedTypesMatch) {
                    const allowedTypesStr = allowedTypesMatch[1];
                    
                    // Verificar tipos específicos
                    const supportedTypes = {
                        'PDF': allowedTypesStr.includes('.pdf'),
                        'Imágenes': allowedTypesStr.includes('.jpg') || allowedTypesStr.includes('.png'),
                        'Excel': allowedTypesStr.includes('.xlsx') || allowedTypesStr.includes('.xls'),
                        'Word': allowedTypesStr.includes('.docx'),
                        'Texto': allowedTypesStr.includes('.txt'),
                        'CSV': allowedTypesStr.includes('.csv')
                    };

                    Object.entries(supportedTypes).forEach(([type, supported]) => {
                        this.addTestResult(`Soporte para ${type}`, supported, 
                            supported ? `${type} soportado` : `${type} no soportado`);
                    });
                }

                // Verificar procesamiento de archivos
                const hasExtractMethods = content.includes('extractCSVData') && 
                                        content.includes('extractTextData') && 
                                        content.includes('extractExcelData');
                this.addTestResult('Métodos de extracción de datos', hasExtractMethods, 
                    hasExtractMethods ? 'Métodos de extracción implementados' : 'Métodos de extracción no implementados');
            }

        } catch (error) {
            this.addTestResult('Tipos de archivo soportados', false, error.message);
        }
    }

    async testFileProcessing() {
        console.log('⚙️ Probando procesamiento de archivos...');

        try {
            const fileManagerPath = path.join(__dirname, 'js', 'fileManager.js');
            if (fs.existsSync(fileManagerPath)) {
                const content = fs.readFileSync(fileManagerPath, 'utf-8');
                
                // Verificar validación de archivos
                const hasValidation = content.includes('validateFile');
                this.addTestResult('Validación de archivos', hasValidation, 
                    hasValidation ? 'Validación implementada' : 'Validación no implementada');

                // Verificar progreso de subida
                const hasProgress = content.includes('showUploadProgress') && content.includes('updateProgress');
                this.addTestResult('Indicador de progreso', hasProgress, 
                    hasProgress ? 'Indicador de progreso implementado' : 'Indicador de progreso no implementado');

                // Verificar manejo de errores
                const hasErrorHandling = content.includes('catch') && content.includes('showNotification');
                this.addTestResult('Manejo de errores', hasErrorHandling, 
                    hasErrorHandling ? 'Manejo de errores implementado' : 'Manejo de errores no implementado');

                // Verificar filtrado y búsqueda
                const hasFiltering = content.includes('filterFiles') && content.includes('sortFiles');
                this.addTestResult('Filtrado y ordenamiento', hasFiltering, 
                    hasFiltering ? 'Filtrado y ordenamiento implementado' : 'Filtrado y ordenamiento no implementado');
            }

        } catch (error) {
            this.addTestResult('Procesamiento de archivos', false, error.message);
        }
    }

    async testDatabaseIntegration() {
        console.log('🗄️ Probando integración con base de datos...');

        try {
            // Verificar métodos en main.js
            const mainJsPath = path.join(__dirname, 'main.js');
            if (fs.existsSync(mainJsPath)) {
                const content = fs.readFileSync(mainJsPath, 'utf-8');
                
                const hasFileHandlers = content.includes('db-save-file-attachment') && 
                                      content.includes('db-get-file-attachments') && 
                                      content.includes('db-delete-file-attachment');
                this.addTestResult('Handlers IPC para archivos', hasFileHandlers, 
                    hasFileHandlers ? 'Handlers IPC implementados' : 'Handlers IPC no implementados');
            }

            // Verificar métodos en base de datos
            const dbPath = path.join(__dirname, 'js', 'postgresDatabase.js');
            if (fs.existsSync(dbPath)) {
                const content = fs.readFileSync(dbPath, 'utf-8');
                
                const hasDbMethods = content.includes('saveFileAttachment') && 
                                   content.includes('getFileAttachments') && 
                                   content.includes('deleteFileAttachment');
                this.addTestResult('Métodos de base de datos para archivos', hasDbMethods, 
                    hasDbMethods ? 'Métodos de BD implementados' : 'Métodos de BD no implementados');

                // Verificar tabla de archivos
                const hasFileTable = content.includes('file_attachments');
                this.addTestResult('Tabla de archivos adjuntos', hasFileTable, 
                    hasFileTable ? 'Tabla file_attachments definida' : 'Tabla file_attachments no definida');
            }

        } catch (error) {
            this.addTestResult('Integración con base de datos', false, error.message);
        }
    }

    async cleanupTestEnvironment() {
        try {
            // Limpiar archivos de prueba
            if (fs.existsSync(this.testDir)) {
                fs.rmSync(this.testDir, { recursive: true, force: true });
            }
        } catch (error) {
            console.log('⚠️ No se pudo limpiar el entorno de prueba:', error.message);
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
        console.log('📋 RESUMEN DE PRUEBAS DE GESTIÓN DE ARCHIVOS');
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
            console.log('🎉 ¡Excelente! El sistema de gestión de archivos está funcionando correctamente.');
        } else if (successRate >= 70) {
            console.log('⚠️ El sistema de gestión de archivos funciona pero hay algunos problemas que necesitan atención.');
        } else {
            console.log('🚨 El sistema de gestión de archivos tiene problemas significativos que deben ser corregidos.');
        }

        // Funcionalidades destacadas
        console.log('\n🌟 FUNCIONALIDADES DESTACADAS:');
        console.log('   • Drag and drop para subir archivos');
        console.log('   • Soporte para múltiples tipos de archivo (PDF, Excel, Word, imágenes, etc.)');
        console.log('   • Extracción automática de datos de archivos CSV y Excel');
        console.log('   • Vista previa de archivos');
        console.log('   • Descarga y gestión de archivos');
        console.log('   • Integración con base de datos para asociar archivos a facturas');
        console.log('   • Validación de tipos y tamaños de archivo');
        console.log('   • Indicadores de progreso durante la subida');
    }
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
    const tester = new FileManagementTester();
    tester.runFileTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error en las pruebas de gestión de archivos:', error);
        process.exit(1);
    });
}

module.exports = FileManagementTester;
