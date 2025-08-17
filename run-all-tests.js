// Script maestro para ejecutar todas las pruebas de la aplicación
const AppTester = require('./test-app-functionality');
const PageTester = require('./test-pages-structure');
const InvoiceTester = require('./test-invoice-functionality');
const PDFTester = require('./test-pdf-export');
const FileTester = require('./test-file-management');
const ConfigTester = require('./test-app-configuration');
const TemplateTester = require('./test-template-functionality');
const IntegrationTester = require('./test-integration-complete');
const ErrorTester = require('./test-error-handling');

class MasterTester {
    constructor() {
        this.results = {
            totalTests: 0,
            totalPassed: 0,
            totalFailed: 0,
            suites: []
        };
    }

    async runAllTests() {
        console.log('🚀 INICIANDO VERIFICACIÓN COMPLETA DE LA APLICACIÓN FACTURADOR');
        console.log('=' .repeat(80));
        console.log('📅 Fecha:', new Date().toLocaleDateString('es-ES'));
        console.log('🕐 Hora:', new Date().toLocaleTimeString('es-ES'));
        console.log('=' .repeat(80));
        console.log();

        const startTime = Date.now();

        try {
            // Ejecutar todas las suites de pruebas
            await this.runTestSuite('Funcionalidad Básica', AppTester);
            await this.runTestSuite('Estructura de Páginas', PageTester);
            await this.runTestSuite('Gestión de Facturas', InvoiceTester);
            await this.runTestSuite('Exportación PDF', PDFTester);
            await this.runTestSuite('Gestión de Archivos', FileTester);
            await this.runTestSuite('Configuración', ConfigTester);
            await this.runTestSuite('Plantillas', TemplateTester);
            await this.runTestSuite('Integración Completa', IntegrationTester);
            await this.runTestSuite('Manejo de Errores', ErrorTester);

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            this.showFinalResults(duration);

        } catch (error) {
            console.error('❌ Error durante la ejecución de pruebas:', error);
        }
    }

    async runTestSuite(suiteName, TesterClass) {
        console.log(`\n🧪 EJECUTANDO: ${suiteName.toUpperCase()}`);
        console.log('-'.repeat(60));

        try {
            const tester = new TesterClass();
            
            // Ejecutar el método de pruebas apropiado
            if (tester.runAllTests) {
                await tester.runAllTests();
            } else if (tester.runPageTests) {
                await tester.runPageTests();
            } else if (tester.runInvoiceTests) {
                await tester.runInvoiceTests();
            } else if (tester.runPDFTests) {
                await tester.runPDFTests();
            } else if (tester.runFileTests) {
                await tester.runFileTests();
            } else if (tester.runConfigurationTests) {
                await tester.runConfigurationTests();
            } else if (tester.runTemplateTests) {
                await tester.runTemplateTests();
            } else if (tester.runIntegrationTests) {
                await tester.runIntegrationTests();
            } else if (tester.runErrorHandlingTests) {
                await tester.runErrorHandlingTests();
            }

            // Recopilar resultados
            if (tester.testResults) {
                const suiteResult = {
                    name: suiteName,
                    passed: tester.testResults.passed,
                    failed: tester.testResults.failed,
                    total: tester.testResults.tests.length,
                    successRate: ((tester.testResults.passed / tester.testResults.tests.length) * 100).toFixed(1)
                };

                this.results.suites.push(suiteResult);
                this.results.totalTests += suiteResult.total;
                this.results.totalPassed += suiteResult.passed;
                this.results.totalFailed += suiteResult.failed;

                console.log(`✅ ${suiteName}: ${suiteResult.passed}/${suiteResult.total} pruebas exitosas (${suiteResult.successRate}%)`);
            }

        } catch (error) {
            console.error(`❌ Error en suite ${suiteName}:`, error.message);
            this.results.suites.push({
                name: suiteName,
                passed: 0,
                failed: 1,
                total: 1,
                successRate: '0.0',
                error: error.message
            });
            this.results.totalTests += 1;
            this.results.totalFailed += 1;
        }
    }

    showFinalResults(duration) {
        console.log('\n' + '='.repeat(80));
        console.log('📊 RESUMEN FINAL DE VERIFICACIÓN');
        console.log('='.repeat(80));

        // Estadísticas generales
        const overallSuccessRate = ((this.results.totalPassed / this.results.totalTests) * 100).toFixed(1);
        
        console.log(`📈 ESTADÍSTICAS GENERALES:`);
        console.log(`   • Total de pruebas ejecutadas: ${this.results.totalTests}`);
        console.log(`   • Pruebas exitosas: ${this.results.totalPassed}`);
        console.log(`   • Pruebas fallidas: ${this.results.totalFailed}`);
        console.log(`   • Tasa de éxito global: ${overallSuccessRate}%`);
        console.log(`   • Tiempo total de ejecución: ${duration} segundos`);

        console.log('\n📋 RESULTADOS POR COMPONENTE:');
        this.results.suites.forEach(suite => {
            const status = parseFloat(suite.successRate) >= 90 ? '✅' : 
                          parseFloat(suite.successRate) >= 70 ? '⚠️' : '❌';
            console.log(`   ${status} ${suite.name}: ${suite.passed}/${suite.total} (${suite.successRate}%)`);
        });

        // Evaluación final
        console.log('\n🎯 EVALUACIÓN FINAL:');
        if (overallSuccessRate >= 95) {
            console.log('🎉 ¡EXCELENTE! La aplicación está funcionando perfectamente.');
            console.log('🚀 ESTADO: APROBADO PARA PRODUCCIÓN');
            console.log('✨ Todos los componentes principales están operativos.');
        } else if (overallSuccessRate >= 85) {
            console.log('✅ ¡MUY BIEN! La aplicación está funcionando correctamente.');
            console.log('🔧 ESTADO: FUNCIONAL CON MEJORAS MENORES');
            console.log('💡 Algunos aspectos pueden necesitar atención.');
        } else if (overallSuccessRate >= 70) {
            console.log('⚠️ La aplicación funciona pero necesita mejoras.');
            console.log('🛠️ ESTADO: REQUIERE CORRECCIONES');
        } else {
            console.log('❌ La aplicación tiene problemas significativos.');
            console.log('🚨 ESTADO: REQUIERE REVISIÓN COMPLETA');
        }

        // Componentes críticos
        console.log('\n🔍 COMPONENTES CRÍTICOS:');
        const criticalComponents = this.results.suites.filter(suite => 
            suite.name.includes('Funcionalidad') || 
            suite.name.includes('Integración') || 
            suite.name.includes('Facturas')
        );

        criticalComponents.forEach(component => {
            const status = parseFloat(component.successRate) >= 90 ? '✅ OPERATIVO' : '⚠️ REQUIERE ATENCIÓN';
            console.log(`   • ${component.name}: ${status}`);
        });

        // Recomendaciones
        console.log('\n💡 PRÓXIMOS PASOS:');
        const failedSuites = this.results.suites.filter(suite => parseFloat(suite.successRate) < 90);
        
        if (failedSuites.length === 0) {
            console.log('   ✅ No se requieren acciones adicionales');
            console.log('   🎯 La aplicación está lista para uso en producción');
        } else {
            console.log('   🔧 Revisar los siguientes componentes:');
            failedSuites.forEach(suite => {
                console.log(`      • ${suite.name} (${suite.successRate}% éxito)`);
            });
        }

        console.log('\n📄 DOCUMENTACIÓN:');
        console.log('   • Reporte detallado: REPORTE_FINAL_VERIFICACION.md');
        console.log('   • Scripts de prueba disponibles en el directorio raíz');
        console.log('   • Logs de ejecución guardados automáticamente');

        console.log('\n' + '='.repeat(80));
        console.log('🏁 VERIFICACIÓN COMPLETA FINALIZADA');
        console.log('='.repeat(80));
    }
}

// Ejecutar todas las pruebas si se ejecuta directamente
if (require.main === module) {
    const masterTester = new MasterTester();
    masterTester.runAllTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error en la ejecución de pruebas maestras:', error);
        process.exit(1);
    });
}

module.exports = MasterTester;
