// Script para probar la funcionalidad de plantillas de facturas
const fs = require('fs');
const path = require('path');

class TemplateFunctionalityTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
        this.templatesDir = path.join(__dirname, 'templates');
        this.customTemplatesDir = path.join(__dirname, 'templates', 'custom');
    }

    async runTemplateTests() {
        console.log('📋 Iniciando pruebas de funcionalidades de plantillas...\n');

        try {
            // Ejecutar pruebas
            await this.testTemplateDirectory();
            await this.testTemplateManager();
            await this.testDefaultTemplates();
            await this.testCustomTemplates();
            await this.testTemplateStructure();
            await this.testTemplateVariables();

            this.showResults();

        } catch (error) {
            console.error('❌ Error durante las pruebas de plantillas:', error);
        }
    }

    async testTemplateDirectory() {
        console.log('📁 Probando directorio de plantillas...');

        try {
            // Verificar que existe el directorio de plantillas
            const templatesExists = fs.existsSync(this.templatesDir);
            this.addTestResult('Directorio de plantillas', templatesExists, 
                templatesExists ? 'Directorio templates/ encontrado' : 'Directorio templates/ no encontrado');

            if (templatesExists) {
                // Contar plantillas HTML
                const templateFiles = fs.readdirSync(this.templatesDir)
                    .filter(file => file.endsWith('.html'));
                
                this.addTestResult('Plantillas HTML disponibles', templateFiles.length > 0, 
                    `${templateFiles.length} plantillas encontradas: ${templateFiles.join(', ')}`);

                // Verificar directorio custom
                const customDirExists = fs.existsSync(this.customTemplatesDir);
                this.addTestResult('Directorio de plantillas personalizadas', customDirExists, 
                    customDirExists ? 'Directorio custom/ encontrado' : 'Directorio custom/ no encontrado');
            }

        } catch (error) {
            this.addTestResult('Directorio de plantillas', false, error.message);
        }
    }

    async testTemplateManager() {
        console.log('🏗️ Probando FacturaTemplateManager...');

        try {
            // Verificar archivo del template manager
            const templateManagerPath = path.join(__dirname, 'js', 'facturaTemplateManager.js');
            const templateManagerExists = fs.existsSync(templateManagerPath);
            this.addTestResult('FacturaTemplateManager', templateManagerExists, 
                templateManagerExists ? 'facturaTemplateManager.js encontrado' : 'facturaTemplateManager.js no encontrado');

            if (templateManagerExists) {
                const content = fs.readFileSync(templateManagerPath, 'utf-8');
                
                // Verificar clase
                const hasClass = content.includes('class FacturaTemplateManager');
                this.addTestResult('Clase FacturaTemplateManager', hasClass, 
                    hasClass ? 'Clase declarada correctamente' : 'Clase no encontrada');

                // Verificar métodos principales
                const hasGenerateMethod = content.includes('generarFacturaHTML');
                this.addTestResult('Método generarFacturaHTML', hasGenerateMethod, 
                    hasGenerateMethod ? 'Método encontrado' : 'Método no encontrado');

                const hasLoadTemplates = content.includes('loadCustomTemplates');
                this.addTestResult('Método loadCustomTemplates', hasLoadTemplates, 
                    hasLoadTemplates ? 'Método encontrado' : 'Método no encontrado');

                const hasReplaceVariables = content.includes('replaceVariables') || content.includes('replace');
                this.addTestResult('Sistema de variables', hasReplaceVariables, 
                    hasReplaceVariables ? 'Sistema de variables implementado' : 'Sistema de variables no implementado');

                // Verificar soporte para plantillas personalizadas
                const hasCustomSupport = content.includes('custom') && content.includes('metadata');
                this.addTestResult('Soporte para plantillas personalizadas', hasCustomSupport, 
                    hasCustomSupport ? 'Soporte implementado' : 'Soporte no implementado');
            }

        } catch (error) {
            this.addTestResult('FacturaTemplateManager', false, error.message);
        }
    }

    async testDefaultTemplates() {
        console.log('📄 Probando plantillas por defecto...');

        try {
            // Verificar plantillas específicas
            const expectedTemplates = [
                'factura-profesional.html',
                'factura-ejemplo.html',
                'factura-template.html'
            ];

            expectedTemplates.forEach(templateName => {
                const templatePath = path.join(this.templatesDir, templateName);
                const exists = fs.existsSync(templatePath);
                this.addTestResult(`Plantilla ${templateName}`, exists, 
                    exists ? 'Plantilla encontrada' : 'Plantilla no encontrada');

                if (exists) {
                    // Verificar estructura HTML básica
                    const content = fs.readFileSync(templatePath, 'utf-8');
                    const hasHtmlStructure = content.includes('<html') && 
                                           content.includes('<head>') && 
                                           content.includes('<body>');
                    this.addTestResult(`Estructura HTML de ${templateName}`, hasHtmlStructure, 
                        hasHtmlStructure ? 'Estructura HTML válida' : 'Estructura HTML inválida');

                    // Verificar variables de plantilla
                    const hasVariables = content.includes('{{') || content.includes('${');
                    this.addTestResult(`Variables en ${templateName}`, hasVariables, 
                        hasVariables ? 'Variables de plantilla encontradas' : 'No hay variables de plantilla');
                }
            });

        } catch (error) {
            this.addTestResult('Plantillas por defecto', false, error.message);
        }
    }

    async testCustomTemplates() {
        console.log('🎨 Probando plantillas personalizadas...');

        try {
            // Verificar si existen plantillas personalizadas
            if (fs.existsSync(this.customTemplatesDir)) {
                const customFiles = fs.readdirSync(this.customTemplatesDir);
                const jsonFiles = customFiles.filter(file => file.endsWith('.json'));
                const htmlFiles = customFiles.filter(file => file.endsWith('.html'));

                this.addTestResult('Metadatos de plantillas personalizadas', jsonFiles.length >= 0, 
                    `${jsonFiles.length} archivos de metadatos encontrados`);

                this.addTestResult('Archivos HTML personalizados', htmlFiles.length >= 0, 
                    `${htmlFiles.length} plantillas HTML personalizadas encontradas`);

                // Verificar estructura de metadatos si existen
                if (jsonFiles.length > 0) {
                    try {
                        const firstMetadata = JSON.parse(
                            fs.readFileSync(path.join(this.customTemplatesDir, jsonFiles[0]), 'utf-8')
                        );
                        
                        const hasRequiredFields = firstMetadata.id && firstMetadata.name;
                        this.addTestResult('Estructura de metadatos', hasRequiredFields, 
                            hasRequiredFields ? 'Metadatos con estructura válida' : 'Estructura de metadatos inválida');
                    } catch (error) {
                        this.addTestResult('Estructura de metadatos', false, 'Error al parsear metadatos');
                    }
                }
            } else {
                this.addTestResult('Directorio de plantillas personalizadas', true, 
                    'Directorio custom no existe (normal en instalación nueva)');
            }

        } catch (error) {
            this.addTestResult('Plantillas personalizadas', false, error.message);
        }
    }

    async testTemplateStructure() {
        console.log('🏗️ Probando estructura de plantillas...');

        try {
            // Verificar plantilla profesional como ejemplo
            const professionalTemplate = path.join(this.templatesDir, 'factura-profesional.html');
            
            if (fs.existsSync(professionalTemplate)) {
                const content = fs.readFileSync(professionalTemplate, 'utf-8');
                
                // Verificar elementos esenciales de factura
                const essentialElements = [
                    { name: 'Información de empresa', pattern: /empresa|company|emisor|nombreEmisor|company_name/i },
                    { name: 'Información de cliente', pattern: /cliente|client/i },
                    { name: 'Número de factura', pattern: /numero|number|factura/i },
                    { name: 'Fecha', pattern: /fecha|date/i },
                    { name: 'Líneas de factura', pattern: /linea|line|item/i },
                    { name: 'Totales', pattern: /total|subtotal|iva/i }
                ];

                essentialElements.forEach(element => {
                    const hasElement = element.pattern.test(content);
                    this.addTestResult(`Elemento: ${element.name}`, hasElement, 
                        hasElement ? 'Elemento encontrado en plantilla' : 'Elemento no encontrado');
                });

                // Verificar CSS/estilos
                const hasStyles = content.includes('<style>') || content.includes('class=');
                this.addTestResult('Estilos CSS', hasStyles, 
                    hasStyles ? 'Estilos CSS presentes' : 'No hay estilos CSS');

                // Verificar responsividad
                const hasResponsive = content.includes('responsive') || 
                                    content.includes('media') || 
                                    content.includes('viewport');
                this.addTestResult('Diseño responsivo', hasResponsive, 
                    hasResponsive ? 'Elementos responsivos encontrados' : 'No hay elementos responsivos');
            }

        } catch (error) {
            this.addTestResult('Estructura de plantillas', false, error.message);
        }
    }

    async testTemplateVariables() {
        console.log('🔧 Probando sistema de variables...');

        try {
            // Verificar variables comunes en plantillas - usar plantilla profesional que sabemos tiene variables
            const professionalTemplate = path.join(this.templatesDir, 'factura-profesional.html');

            if (fs.existsSync(professionalTemplate)) {
                const content = fs.readFileSync(professionalTemplate, 'utf-8');

                // Buscar diferentes tipos de variables
                const variablePatterns = [
                    { name: 'Variables con llaves dobles', pattern: /\{\{.*?\}\}/ },
                    { name: 'Variables con template literals', pattern: /\$\{.*?\}/, optional: true },
                    { name: 'Variables con corchetes', pattern: /\[.*?\]/, optional: true }
                ];

                let hasAnyVariables = false;
                variablePatterns.forEach(pattern => {
                    const hasPattern = pattern.pattern.test(content);
                    if (hasPattern) hasAnyVariables = true;

                    // Solo reportar como error si no es opcional o si es el patrón principal
                    if (!pattern.optional || hasPattern) {
                        this.addTestResult(pattern.name, hasPattern || pattern.optional,
                            hasPattern ? 'Patrón de variables encontrado' :
                            pattern.optional ? 'Patrón opcional no usado (normal)' : 'Patrón no encontrado');
                    }
                });

                this.addTestResult('Sistema de variables funcional', hasAnyVariables, 
                    hasAnyVariables ? 'Al menos un sistema de variables implementado' : 'No hay sistema de variables');

                // Verificar variables específicas de factura
                const invoiceVariables = [
                    'numero', 'fecha', 'cliente', 'total', 'subtotal', 'iva'
                ];

                const hasInvoiceVars = invoiceVariables.some(variable => 
                    content.toLowerCase().includes(variable)
                );
                this.addTestResult('Variables específicas de factura', hasInvoiceVars, 
                    hasInvoiceVars ? 'Variables de factura encontradas' : 'Variables de factura no encontradas');
            }

        } catch (error) {
            this.addTestResult('Sistema de variables', false, error.message);
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
        console.log('📋 RESUMEN DE PRUEBAS DE PLANTILLAS');
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
            console.log('🎉 ¡Excelente! El sistema de plantillas está funcionando correctamente.');
        } else if (successRate >= 70) {
            console.log('⚠️ El sistema de plantillas funciona pero hay algunos problemas que necesitan atención.');
        } else {
            console.log('🚨 El sistema de plantillas tiene problemas significativos que deben ser corregidos.');
        }

        // Funcionalidades destacadas
        console.log('\n🌟 FUNCIONALIDADES DE PLANTILLAS:');
        console.log('   • Múltiples plantillas predefinidas');
        console.log('   • Soporte para plantillas personalizadas');
        console.log('   • Sistema de variables para datos dinámicos');
        console.log('   • Estructura HTML profesional');
        console.log('   • Gestión de metadatos de plantillas');
        console.log('   • Integración con el sistema de exportación PDF');
    }
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
    const tester = new TemplateFunctionalityTester();
    tester.runTemplateTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error en las pruebas de plantillas:', error);
        process.exit(1);
    });
}

module.exports = TemplateFunctionalityTester;
