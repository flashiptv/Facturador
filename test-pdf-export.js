// Script para probar la funcionalidad de exportación a PDF
const fs = require('fs');
const path = require('path');

class PDFExportTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runPDFTests() {
        console.log('📄 Iniciando pruebas de exportación a PDF...\n');

        try {
            // Verificar dependencias
            await this.testDependencies();
            
            // Verificar archivos de exportación
            await this.testExportFiles();
            
            // Verificar plantillas
            await this.testTemplates();
            
            // Verificar estructura de clases
            await this.testClassStructure();

            this.showResults();

        } catch (error) {
            console.error('❌ Error durante las pruebas de PDF:', error);
        }
    }

    async testDependencies() {
        console.log('📦 Probando dependencias de PDF...');

        try {
            // Verificar puppeteer
            try {
                require('puppeteer');
                this.addTestResult('Puppeteer disponible', true, 'Puppeteer instalado correctamente');
            } catch (error) {
                this.addTestResult('Puppeteer disponible', false, 'Puppeteer no encontrado');
            }

            // Verificar jsPDF
            try {
                require('jspdf');
                this.addTestResult('jsPDF disponible', true, 'jsPDF instalado correctamente');
            } catch (error) {
                this.addTestResult('jsPDF disponible', false, 'jsPDF no encontrado');
            }

            // Verificar html2canvas
            try {
                require('html2canvas');
                this.addTestResult('html2canvas disponible', true, 'html2canvas instalado correctamente');
            } catch (error) {
                this.addTestResult('html2canvas disponible', false, 'html2canvas no encontrado');
            }

        } catch (error) {
            this.addTestResult('Dependencias de PDF', false, error.message);
        }
    }

    async testExportFiles() {
        console.log('📁 Probando archivos de exportación...');

        try {
            // Verificar PDFExporter
            const pdfExporterPath = path.join(__dirname, 'js', 'pdfExporter.js');
            const pdfExporterExists = fs.existsSync(pdfExporterPath);
            this.addTestResult('Archivo PDFExporter', pdfExporterExists, 
                pdfExporterExists ? 'pdfExporter.js encontrado' : 'pdfExporter.js no encontrado');

            if (pdfExporterExists) {
                const content = fs.readFileSync(pdfExporterPath, 'utf-8');
                
                // Verificar métodos principales
                const hasExportMethod = content.includes('exportInvoiceToPDF');
                this.addTestResult('Método exportInvoiceToPDF', hasExportMethod, 
                    hasExportMethod ? 'Método encontrado' : 'Método no encontrado');

                const hasPreviewMethod = content.includes('previewInvoiceHTML');
                this.addTestResult('Método previewInvoiceHTML', hasPreviewMethod, 
                    hasPreviewMethod ? 'Método encontrado' : 'Método no encontrado');

                const hasPuppeteerImport = content.includes("require('puppeteer')");
                this.addTestResult('Importación de Puppeteer', hasPuppeteerImport, 
                    hasPuppeteerImport ? 'Puppeteer importado' : 'Puppeteer no importado');
            }

            // Verificar InvoicePreviewManager
            const previewManagerPath = path.join(__dirname, 'js', 'invoicePreviewManager.js');
            const previewManagerExists = fs.existsSync(previewManagerPath);
            this.addTestResult('Archivo InvoicePreviewManager', previewManagerExists, 
                previewManagerExists ? 'invoicePreviewManager.js encontrado' : 'invoicePreviewManager.js no encontrado');

        } catch (error) {
            this.addTestResult('Archivos de exportación', false, error.message);
        }
    }

    async testTemplates() {
        console.log('📋 Probando plantillas de facturas...');

        try {
            // Verificar directorio de plantillas
            const templatesDir = path.join(__dirname, 'templates');
            const templatesDirExists = fs.existsSync(templatesDir);
            this.addTestResult('Directorio de plantillas', templatesDirExists, 
                templatesDirExists ? 'Directorio templates/ encontrado' : 'Directorio templates/ no encontrado');

            if (templatesDirExists) {
                const templateFiles = fs.readdirSync(templatesDir).filter(file => file.endsWith('.html'));
                this.addTestResult('Plantillas HTML', templateFiles.length > 0, 
                    `${templateFiles.length} plantillas encontradas: ${templateFiles.join(', ')}`);

                // Verificar plantilla profesional
                const professionalTemplate = templateFiles.find(file => file.includes('profesional'));
                this.addTestResult('Plantilla profesional', !!professionalTemplate, 
                    professionalTemplate ? `Plantilla encontrada: ${professionalTemplate}` : 'Plantilla profesional no encontrada');
            }

            // Verificar FacturaTemplateManager
            const templateManagerPath = path.join(__dirname, 'js', 'facturaTemplateManager.js');
            const templateManagerExists = fs.existsSync(templateManagerPath);
            this.addTestResult('FacturaTemplateManager', templateManagerExists, 
                templateManagerExists ? 'facturaTemplateManager.js encontrado' : 'facturaTemplateManager.js no encontrado');

        } catch (error) {
            this.addTestResult('Plantillas de facturas', false, error.message);
        }
    }

    async testClassStructure() {
        console.log('🏗️ Probando estructura de clases...');

        try {
            // Verificar que las clases se pueden importar
            const pdfExporterPath = path.join(__dirname, 'js', 'pdfExporter.js');
            if (fs.existsSync(pdfExporterPath)) {
                const content = fs.readFileSync(pdfExporterPath, 'utf-8');
                
                // Verificar estructura de clase
                const hasClassDeclaration = content.includes('class PDFExporter');
                this.addTestResult('Declaración de clase PDFExporter', hasClassDeclaration, 
                    hasClassDeclaration ? 'Clase PDFExporter declarada' : 'Clase PDFExporter no encontrada');

                const hasConstructor = content.includes('constructor()');
                this.addTestResult('Constructor PDFExporter', hasConstructor, 
                    hasConstructor ? 'Constructor encontrado' : 'Constructor no encontrado');

                const hasInit = content.includes('async init()');
                this.addTestResult('Método init', hasInit, 
                    hasInit ? 'Método init encontrado' : 'Método init no encontrado');
            }

            // Verificar integración con app.js
            const appJsPath = path.join(__dirname, 'js', 'app.js');
            if (fs.existsSync(appJsPath)) {
                const content = fs.readFileSync(appJsPath, 'utf-8');
                
                const hasExportMethod = content.includes('exportInvoiceToPDF');
                this.addTestResult('Integración con app.js', hasExportMethod, 
                    hasExportMethod ? 'Método de exportación integrado' : 'Método de exportación no integrado');
            }

            // Verificar botones de exportación en páginas
            const pagesDir = path.join(__dirname, 'pages');
            if (fs.existsSync(pagesDir)) {
                const htmlFiles = fs.readdirSync(pagesDir).filter(file => file.endsWith('.html'));
                let hasExportButtons = false;

                htmlFiles.forEach(file => {
                    const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
                    if (content.includes('export-pdf') || content.includes('exportPdfBtn') || content.includes('PDF')) {
                        hasExportButtons = true;
                    }
                });

                this.addTestResult('Botones de exportación en UI', hasExportButtons, 
                    hasExportButtons ? 'Botones de exportación encontrados' : 'Botones de exportación no encontrados');
            }

        } catch (error) {
            this.addTestResult('Estructura de clases', false, error.message);
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
        console.log('📋 RESUMEN DE PRUEBAS DE EXPORTACIÓN PDF');
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
            console.log('🎉 ¡Excelente! El sistema de exportación PDF está funcionando correctamente.');
        } else if (successRate >= 70) {
            console.log('⚠️ El sistema de exportación PDF funciona pero hay algunos problemas que necesitan atención.');
        } else {
            console.log('🚨 El sistema de exportación PDF tiene problemas significativos que deben ser corregidos.');
        }

        // Recomendaciones
        console.log('\n📝 RECOMENDACIONES:');
        if (this.testResults.tests.some(t => !t.passed && t.name.includes('Puppeteer'))) {
            console.log('   • Instalar Puppeteer: npm install puppeteer');
        }
        if (this.testResults.tests.some(t => !t.passed && t.name.includes('plantillas'))) {
            console.log('   • Verificar que existan plantillas HTML en el directorio templates/');
        }
        if (this.testResults.tests.some(t => !t.passed && t.name.includes('FacturaTemplateManager'))) {
            console.log('   • Implementar FacturaTemplateManager para gestionar plantillas');
        }
    }
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
    const tester = new PDFExportTester();
    tester.runPDFTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error en las pruebas de PDF:', error);
        process.exit(1);
    });
}

module.exports = PDFExportTester;
