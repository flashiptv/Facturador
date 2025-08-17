// Script para verificar la estructura de las páginas
const fs = require('fs');
const path = require('path');

class PageStructureTester {
    constructor() {
        this.pagesDir = path.join(__dirname, 'pages');
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runPageTests() {
        console.log('📄 Verificando estructura de páginas...\n');

        try {
            // Verificar que el directorio de páginas existe
            this.addTestResult('Directorio de páginas', 
                fs.existsSync(this.pagesDir), 
                'Directorio pages/ encontrado');

            // Obtener lista de páginas
            const pages = fs.readdirSync(this.pagesDir).filter(file => file.endsWith('.html'));
            this.addTestResult('Páginas HTML encontradas', 
                pages.length > 0, 
                `${pages.length} páginas HTML encontradas`);

            // Verificar páginas principales
            const requiredPages = [
                'iniciosesion.html',
                'registro.html', 
                'totalfacturas.html',
                'clientes.html',
                'appfacturas.html',
                'productos.html',
                'ajustes.html'
            ];

            for (const page of requiredPages) {
                await this.testPage(page);
            }

            // Verificar páginas adicionales
            const additionalPages = pages.filter(page => !requiredPages.includes(page));
            console.log(`\n📋 Páginas adicionales encontradas: ${additionalPages.join(', ')}`);

            this.showResults();

        } catch (error) {
            console.error('❌ Error durante las pruebas de páginas:', error);
        }
    }

    async testPage(pageName) {
        const pagePath = path.join(this.pagesDir, pageName);
        
        try {
            // Verificar que el archivo existe
            const exists = fs.existsSync(pagePath);
            if (!exists) {
                this.addTestResult(`Página ${pageName}`, false, 'Archivo no encontrado');
                return;
            }

            // Leer contenido del archivo
            const content = fs.readFileSync(pagePath, 'utf-8');
            
            // Verificaciones básicas
            const hasDoctype = content.includes('<!DOCTYPE html>') || content.includes('<!doctype html>');
            const hasHtmlTag = content.includes('<html');
            const hasHeadTag = content.includes('<head>');
            const hasBodyTag = content.includes('<body>');
            const hasTitle = content.includes('<title>');

            const basicStructure = hasDoctype && hasHtmlTag && hasHeadTag && hasBodyTag && hasTitle;
            this.addTestResult(`${pageName} - Estructura básica`, 
                basicStructure, 
                basicStructure ? 'HTML válido' : 'Estructura HTML incompleta');

            // Verificar inclusión de scripts necesarios
            const hasAppJs = content.includes('app.js');
            this.addTestResult(`${pageName} - Script app.js`, 
                hasAppJs, 
                hasAppJs ? 'app.js incluido' : 'app.js no encontrado');

            // Verificar CSS/Tailwind
            const hasTailwind = content.includes('tailwindcss') || content.includes('tailwind');
            this.addTestResult(`${pageName} - Tailwind CSS`, 
                hasTailwind, 
                hasTailwind ? 'Tailwind incluido' : 'Tailwind no encontrado');

            // Verificaciones específicas por página
            await this.testPageSpecific(pageName, content);

        } catch (error) {
            this.addTestResult(`Página ${pageName}`, false, `Error: ${error.message}`);
        }
    }

    async testPageSpecific(pageName, content) {
        switch (pageName) {
            case 'iniciosesion.html':
                const hasLoginForm = content.includes('data-form-type="login"') || 
                                   content.includes('type="email"') && content.includes('type="password"');
                this.addTestResult(`${pageName} - Formulario de login`, 
                    hasLoginForm, 
                    hasLoginForm ? 'Formulario encontrado' : 'Formulario no encontrado');
                break;

            case 'registro.html':
                const hasRegisterForm = content.includes('data-form-type="register"') || 
                                       content.includes('registro') || content.includes('register');
                this.addTestResult(`${pageName} - Formulario de registro`, 
                    hasRegisterForm, 
                    hasRegisterForm ? 'Formulario encontrado' : 'Formulario no encontrado');
                break;

            case 'totalfacturas.html':
                const hasDashboard = content.includes('dashboard') || content.includes('estadísticas') || 
                                   content.includes('data-stat');
                this.addTestResult(`${pageName} - Dashboard`, 
                    hasDashboard, 
                    hasDashboard ? 'Elementos de dashboard encontrados' : 'Dashboard no encontrado');
                break;

            case 'clientes.html':
                const hasClientsTable = content.includes('<table') || content.includes('clientes');
                this.addTestResult(`${pageName} - Tabla de clientes`, 
                    hasClientsTable, 
                    hasClientsTable ? 'Tabla encontrada' : 'Tabla no encontrada');
                break;

            case 'appfacturas.html':
                const hasInvoiceForm = content.includes('factura') || content.includes('invoice') ||
                                     content.includes('data-form-type="invoice"');
                this.addTestResult(`${pageName} - Formulario de factura`, 
                    hasInvoiceForm, 
                    hasInvoiceForm ? 'Formulario encontrado' : 'Formulario no encontrado');
                break;

            case 'productos.html':
                const hasProductsTable = content.includes('productos') || content.includes('product');
                this.addTestResult(`${pageName} - Gestión de productos`, 
                    hasProductsTable, 
                    hasProductsTable ? 'Elementos encontrados' : 'Elementos no encontrados');
                break;

            case 'ajustes.html':
                const hasSettings = content.includes('configuración') || content.includes('ajustes') ||
                                  content.includes('settings');
                this.addTestResult(`${pageName} - Configuración`, 
                    hasSettings, 
                    hasSettings ? 'Elementos encontrados' : 'Elementos no encontrados');
                break;
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
        console.log('📋 RESUMEN DE PRUEBAS DE PÁGINAS');
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
            console.log('🎉 ¡Excelente! Las páginas están bien estructuradas.');
        } else if (successRate >= 70) {
            console.log('⚠️ Las páginas funcionan pero hay algunos problemas que necesitan atención.');
        } else {
            console.log('🚨 Las páginas tienen problemas significativos que deben ser corregidos.');
        }
    }
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
    const tester = new PageStructureTester();
    tester.runPageTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error en las pruebas de páginas:', error);
        process.exit(1);
    });
}

module.exports = PageStructureTester;
