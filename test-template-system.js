// Test script para verificar el sistema de plantillas
const FacturaTemplateManager = require('./js/facturaTemplateManager');

async function testTemplateSystem() {
    console.log('🧪 Iniciando prueba del sistema de plantillas...\n');

    const templateManager = new FacturaTemplateManager();

    // Datos de prueba
    const datosFactura = {
        emisor: {
            nombre: 'MI EMPRESA S.L.',
            direccion: 'Calle Principal, 123 - 28001 Madrid',
            nif: 'B12345678',
            telefono: '+34 91 123 45 67',
            email: 'contacto@miempresa.com'
        },
        factura: {
            numero: 'F2024-001',
            fecha: new Date(),
            pagina: '1 de 1'
        },
        cliente: {
            nombre: 'Cliente de Prueba S.A.',
            direccion: 'Avenida Test, 456 - 41001 Sevilla',
            nif: 'A87654321',
            telefono: '+34 954 987 654',
            email: 'cliente@test.com'
        },
        productos: [
            {
                descripcion: 'Servicio de consultoría',
                cantidad: 10,
                precio: 50.00,
                importe: 500.00
            },
            {
                descripcion: 'Desarrollo de software',
                cantidad: 1,
                precio: 1200.00,
                importe: 1200.00
            }
        ],
        totales: {
            baseImponible: 1700.00,
            porcentajeIva: 21,
            importeIva: 357.00,
            total: 2057.00
        }
    };

    try {
        // Generar HTML de la factura
        console.log('📄 Generando HTML de factura...');
        const htmlContent = templateManager.generarFacturaHTML(datosFactura);
        
        // Verificar que no queden placeholders sin reemplazar
        const unreplacedPlaceholders = htmlContent.match(/{{[^}]+}}/g);
        
        if (unreplacedPlaceholders) {
            console.log('⚠️ Placeholders sin reemplazar encontrados:');
            unreplacedPlaceholders.forEach(placeholder => {
                console.log(`   - ${placeholder}`);
            });
        } else {
            console.log('✅ Todos los placeholders han sido reemplazados correctamente');
        }

        // Guardar archivo de prueba
        const fs = require('fs');
        const path = require('path');
        const testOutputPath = path.join(__dirname, 'test-factura.html');
        
        fs.writeFileSync(testOutputPath, htmlContent, 'utf8');
        console.log(`📁 Archivo de prueba guardado en: ${testOutputPath}`);

        console.log('\n✅ Prueba completada exitosamente');
        
        return {
            success: true,
            unreplacedPlaceholders: unreplacedPlaceholders || [],
            outputPath: testOutputPath
        };
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Ejecutar la prueba
if (require.main === module) {
    testTemplateSystem().then(result => {
        console.log('\n📊 Resultado de la prueba:', result);
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = { testTemplateSystem };
