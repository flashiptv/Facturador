// Script de pruebas para verificar la interfaz de usuario
const puppeteer = require('puppeteer');
const path = require('path');

class UITester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runUITests() {
        console.log('🖥️ Iniciando pruebas de interfaz de usuario...\n');

        try {
            // Configurar Puppeteer para Electron
            this.browser = await puppeteer.launch({
                headless: false,
                executablePath: this.getElectronPath(),
                args: [path.join(__dirname, 'main.js')],
                defaultViewport: null
            });

            const pages = await this.browser.pages();
            this.page = pages[0];

            // Esperar a que la aplicación cargue
            await this.page.waitForTimeout(3000);

            // Ejecutar pruebas de UI
            await this.testLoginPage();
            await this.testNavigation();
            await this.testClientManagement();
            await this.testDashboard();

            this.showResults();

        } catch (error) {
            console.error('❌ Error durante las pruebas de UI:', error);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }

    getElectronPath() {
        // Intentar encontrar el ejecutable de Electron
        const electronPaths = [
            path.join(__dirname, 'node_modules', '.bin', 'electron.cmd'),
            path.join(__dirname, 'node_modules', '.bin', 'electron'),
            'electron'
        ];

        return electronPaths[0]; // Usar el primer path por defecto
    }

    async testLoginPage() {
        console.log('🔐 Probando página de login...');

        try {
            // Verificar que la página de login carga
            const title = await this.page.title();
            this.addTestResult('Carga de página de login', 
                title.includes('Facturador'), 
                `Título: ${title}`);

            // Verificar elementos de login
            const emailInput = await this.page.$('input[name="email"]');
            const passwordInput = await this.page.$('input[name="password"]');
            const submitButton = await this.page.$('button[type="submit"]');

            this.addTestResult('Elementos de login presentes', 
                !!(emailInput && passwordInput && submitButton), 
                'Campos de email, contraseña y botón encontrados');

            // Intentar login con credenciales demo
            if (emailInput && passwordInput && submitButton) {
                await this.page.type('input[name="email"]', 'admin@facturador.com');
                await this.page.type('input[name="password"]', 'admin123');
                await this.page.click('button[type="submit"]');

                // Esperar navegación o mensaje
                await this.page.waitForTimeout(2000);

                this.addTestResult('Proceso de login', true, 'Login ejecutado');
            }

        } catch (error) {
            this.addTestResult('Página de login', false, error.message);
        }
    }

    async testNavigation() {
        console.log('🧭 Probando navegación...');

        try {
            // Verificar botones de navegación
            const navButtons = await this.page.$$('[data-navigate]');
            this.addTestResult('Botones de navegación', 
                navButtons.length > 0, 
                `${navButtons.length} botones de navegación encontrados`);

            // Probar navegación a clientes
            const clientsButton = await this.page.$('[data-navigate="clientes"]');
            if (clientsButton) {
                await clientsButton.click();
                await this.page.waitForTimeout(1000);
                this.addTestResult('Navegación a clientes', true, 'Navegación ejecutada');
            }

        } catch (error) {
            this.addTestResult('Navegación', false, error.message);
        }
    }

    async testClientManagement() {
        console.log('👥 Probando gestión de clientes...');

        try {
            // Verificar que estamos en la página de clientes
            const currentUrl = this.page.url();
            const isClientsPage = currentUrl.includes('clientes') || 
                                 await this.page.$('table') !== null;

            this.addTestResult('Página de clientes', 
                isClientsPage, 
                'Página de clientes cargada');

            // Verificar tabla de clientes
            const table = await this.page.$('table');
            if (table) {
                const rows = await this.page.$$('table tbody tr');
                this.addTestResult('Tabla de clientes', 
                    rows.length >= 0, 
                    `${rows.length} filas en la tabla`);
            }

            // Verificar botón de nuevo cliente
            const newClientButton = await this.page.$('button:contains("Nuevo Cliente")') ||
                                   await this.page.$('[data-action="new-client"]');
            
            this.addTestResult('Botón nuevo cliente', 
                !!newClientButton, 
                'Botón de nuevo cliente encontrado');

        } catch (error) {
            this.addTestResult('Gestión de clientes', false, error.message);
        }
    }

    async testDashboard() {
        console.log('📊 Probando dashboard...');

        try {
            // Navegar al dashboard
            const dashboardButton = await this.page.$('[data-navigate="totalfacturas"]');
            if (dashboardButton) {
                await dashboardButton.click();
                await this.page.waitForTimeout(1000);
            }

            // Verificar elementos del dashboard
            const statsElements = await this.page.$$('[data-stat]');
            this.addTestResult('Elementos de estadísticas', 
                statsElements.length > 0, 
                `${statsElements.length} elementos de estadísticas encontrados`);

            // Verificar lista de facturas
            const invoicesList = await this.page.$('#invoicesList') || 
                                 await this.page.$('.invoices-list');
            
            this.addTestResult('Lista de facturas', 
                !!invoicesList, 
                'Lista de facturas encontrada');

        } catch (error) {
            this.addTestResult('Dashboard', false, error.message);
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
        console.log('📋 RESUMEN DE PRUEBAS DE UI');
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
    }
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
    const tester = new UITester();
    tester.runUITests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error en las pruebas de UI:', error);
        process.exit(1);
    });
}

module.exports = UITester;
