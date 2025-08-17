/**
 * Utilidades para la generación de facturas HTML
 * Facturador - Sistema de Facturación Profesional
 */

class FacturaTemplateManager {
    constructor() {
        this.templatePath = './templates/factura-profesional.html';
        this.loadCustomTemplates();
    }

    /**
     * Carga las plantillas personalizadas disponibles
     */
    async loadCustomTemplates() {
        const fs = require('fs');
        const path = require('path');
        
        this.customTemplates = {};
        
        try {
            // Buscar plantillas en el directorio de la aplicación (plantillas por defecto)
            const templatesDir = path.join(__dirname, '../templates/');
            if (fs.existsSync(templatesDir)) {
                const files = fs.readdirSync(templatesDir);
                
                // Buscar archivos de metadatos de plantillas personalizadas (legacy)
                files.forEach(file => {
                    if (file.startsWith('factura-custom-') && file.endsWith('.json')) {
                        try {
                            const metadataPath = path.join(templatesDir, file);
                            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
                            this.customTemplates[metadata.id] = metadata;
                        } catch (error) {
                            console.error('Error loading custom template metadata:', error);
                        }
                    }
                });
            }

            // Buscar templates generados automáticamente en el directorio custom
            const customTemplatesDir = path.join(__dirname, '../templates/custom/');
            if (fs.existsSync(customTemplatesDir)) {
                const customFiles = fs.readdirSync(customTemplatesDir);
                
                customFiles.forEach(file => {
                    if (file.endsWith('.json')) {
                        try {
                            const metadataPath = path.join(customTemplatesDir, file);
                            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
                            metadata.customPath = customTemplatesDir; // Store custom path
                            this.customTemplates[metadata.id] = metadata;
                            console.log('✅ Template generado cargado:', metadata.name);
                        } catch (error) {
                            console.error('Error loading generated template metadata:', error);
                        }
                    }
                });
            }

            // Buscar plantillas personalizadas en el directorio de datos del usuario
            try {
                // Use ipcRenderer to get user data path (works in both renderer and main process)
                const { ipcRenderer } = require('electron');
                if (ipcRenderer) {
                    const userDataPath = await ipcRenderer.invoke('get-user-data-path');
                    const userCustomTemplatesDir = path.join(userDataPath, 'custom-templates');
                    
                    if (fs.existsSync(userCustomTemplatesDir)) {
                        const customFiles = fs.readdirSync(userCustomTemplatesDir);
                        
                        customFiles.forEach(file => {
                            if (file.startsWith('factura-custom-') && file.endsWith('.json')) {
                                try {
                                    const metadataPath = path.join(userCustomTemplatesDir, file);
                                    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
                                    metadata.customPath = userCustomTemplatesDir; // Store custom path
                                    this.customTemplates[metadata.id] = metadata;
                                } catch (error) {
                                    console.error('Error loading custom template metadata from userData:', error);
                                }
                            }
                        });
                    }
                }
            } catch (error) {
                console.log('Could not load custom templates from userData (renderer context):', error.message);
                // This is expected in main process context
            }
        } catch (error) {
            console.error('Error loading custom templates:', error);
        }
    }

    /**
     * Obtiene la lista de plantillas disponibles (incluyendo personalizadas)
     * @returns {Object} Lista de plantillas disponibles
     */
    getAvailableTemplates() {
        const defaultTemplates = {
            'factura-profesional': {
                name: 'Plantilla Profesional',
                description: 'Diseño elegante con cabecera empresarial',
                file: 'factura-profesional.html'
            },
            'factura-template': {
                name: 'Plantilla Clásica', 
                description: 'Diseño tradicional y limpio',
                file: 'factura-template.html'
            },
            'factura-minimalista': {
                name: 'Plantilla Minimalista',
                description: 'Diseño simple y limpio',
                file: 'factura-profesional.html'
            },
            'factura-moderna': {
                name: 'Plantilla Moderna',
                description: 'Diseño contemporáneo con elementos visuales',
                file: 'factura-profesional.html'
            }
        };

        // Agregar plantillas personalizadas
        Object.keys(this.customTemplates).forEach(id => {
            const template = this.customTemplates[id];
            const isGenerated = template.source === 'image_analysis';
            
            defaultTemplates[id] = {
                name: template.name,
                description: isGenerated ? 
                    `Template generado automáticamente desde imagen: ${template.sourceFile}` : 
                    `Plantilla personalizada basada en ${template.baseStyle}`,
                file: `${id}.html`,
                isCustom: true,
                isGenerated: isGenerated,
                source: template.source || 'custom'
            };
        });

        return defaultTemplates;
    }

    /**
     * Verifica si una plantilla existe
     * @param {String} templateName - Nombre del archivo de plantilla
     * @returns {Boolean} True si existe
     */
    templateExists(templateName) {
        const fs = require('fs');
        const path = require('path');
        
        try {
            // Normalize template name
            if (!templateName.endsWith('.html')) {
                templateName += '.html';
            }
            
            // Check custom templates first (in user data directory)
            if (templateName.startsWith('factura-custom-')) {
                const templateId = templateName.replace('.html', '');
                const customTemplate = this.customTemplates[templateId];
                
                if (customTemplate && customTemplate.customPath) {
                    const customTemplatePath = path.join(customTemplate.customPath, templateName);
                    if (fs.existsSync(customTemplatePath)) {
                        return true;
                    }
                }
                
                // Also check legacy location
                const legacyPath = path.join(__dirname, '../templates/', templateName);
                if (fs.existsSync(legacyPath)) {
                    return true;
                }
                
                console.warn(`Custom template ${templateName} not found, will use fallback`);
                return false;
            }
            
            // Check generated templates in custom directory
            const customTemplatesDir = path.join(__dirname, '../templates/custom/');
            const customTemplatePath = path.join(customTemplatesDir, templateName);
            if (fs.existsSync(customTemplatePath)) {
                return true;
            }
            
            // Handle both development and packaged app paths for default templates
            let templatePath;
            if (process.env.NODE_ENV === 'development' || !process.resourcesPath) {
                templatePath = path.join(__dirname, '../templates/', templateName);
            } else {
                // In packaged app
                templatePath = path.join(process.resourcesPath, 'app.asar', 'templates', templateName);
            }
            
            const exists = fs.existsSync(templatePath);
            return exists;
        } catch (error) {
            console.error('Error checking template existence:', error);
            return false;
        }
    }

    /**
     * Genera una factura HTML con los datos proporcionados
     * @param {Object} datosFactura - Datos de la factura
     * @param {String} templateName - Nombre del archivo de plantilla (opcional)
     * @returns {String} HTML de la factura procesada
     */
    async generarFacturaHTML(datosFactura, templateName = 'factura-profesional.html') {
        const fs = require('fs');
        const path = require('path');

        try {
            // Recargar plantillas personalizadas en caso de que hayan cambiado
            await this.loadCustomTemplates();
            
            // Verificar si la plantilla existe
            if (!this.templateExists(templateName)) {
                console.warn(`Template ${templateName} not found, using fallback`);
                templateName = 'factura-profesional.html';
            }
            
            let template;
            try {
                let templatePath;
                
                // Check if it's a custom template
                if (templateName.startsWith('factura-custom-')) {
                    const templateId = templateName.replace('.html', '');
                    const customTemplate = this.customTemplates[templateId];
                    
                    if (customTemplate && customTemplate.customPath) {
                        // Read from user data directory
                        templatePath = path.join(customTemplate.customPath, templateName);
                    } else {
                        // Fallback to legacy location
                        templatePath = path.join(__dirname, '../templates/', templateName);
                    }
                } else {
                    // Handle both development and packaged app paths for default templates
                    if (process.env.NODE_ENV === 'development' || !process.resourcesPath) {
                        templatePath = path.join(__dirname, '../templates/', templateName);
                    } else {
                        // In packaged app
                        templatePath = path.join(process.resourcesPath, 'app.asar', 'templates', templateName);
                    }
                }
                
                template = fs.readFileSync(templatePath, 'utf8');
            } catch (error) {
                console.error(`Error reading template ${templateName}:`, error);
                // Fallback to default template
                let fallbackPath;
                if (process.env.NODE_ENV === 'development' || !process.resourcesPath) {
                    fallbackPath = path.join(__dirname, '../templates/factura-profesional.html');
                } else {
                    fallbackPath = path.join(process.resourcesPath, 'app.asar', 'templates', 'factura-profesional.html');
                }
                template = fs.readFileSync(fallbackPath, 'utf8');
            }

            // Reemplazar placeholders con datos reales
            template = this.reemplazarPlaceholders(template, datosFactura);

            return template;
        } catch (error) {
            console.error('Error al generar factura HTML:', error);
            console.error('Template path:', templateName);
            
            // Fallback a la plantilla profesional si hay error
            try {
                let fallbackPath;
                if (process.env.NODE_ENV === 'development' || !process.resourcesPath) {
                    fallbackPath = path.join(__dirname, '../templates/factura-profesional.html');
                } else {
                    fallbackPath = path.join(process.resourcesPath, 'app.asar', 'templates', 'factura-profesional.html');
                }
                let template = fs.readFileSync(fallbackPath, 'utf8');
                template = this.reemplazarPlaceholders(template, datosFactura);
                return template;
            } catch (fallbackError) {
                console.error('Error con plantilla fallback:', fallbackError);
                throw new Error('No se pudo generar la factura HTML');
            }
        }
    }

    /**
     * Reemplaza los placeholders en la plantilla con datos reales
     * @param {String} template - Plantilla HTML
     * @param {Object} datos - Datos para reemplazar
     * @returns {String} Template procesado
     */
    reemplazarPlaceholders(template, datos) {
        // Datos del emisor
        template = template.replace(/{{nombreEmisor}}/g, datos.emisor?.nombre || 'MI EMPRESA S.L.');
        template = template.replace(/{{direccionEmisor}}/g, datos.emisor?.direccion || 'Calle Principal, 123 - 28001 Madrid');
        template = template.replace(/{{nifEmisor}}/g, datos.emisor?.nif || 'B12345678');
        template = template.replace(/{{telefonoEmisor}}/g, datos.emisor?.telefono || '+34 91 123 45 67');
        template = template.replace(/{{emailEmisor}}/g, datos.emisor?.email || 'contacto@miempresa.com');

        // Datos de la factura
        template = template.replace(/{{numeroFactura}}/g, datos.factura?.numero || '');
        template = template.replace(/{{fechaFactura}}/g, this.formatearFecha(datos.factura?.fecha));
        template = template.replace(/{{numeroPagina}}/g, datos.factura?.pagina || '1 de 1');

        // Datos del cliente
        template = template.replace(/{{nombreCliente}}/g, datos.cliente?.nombre || '');
        template = template.replace(/{{direccionCliente}}/g, datos.cliente?.direccion || '');
        template = template.replace(/{{nifCliente}}/g, datos.cliente?.nif || '');
        template = template.replace(/{{telefonoCliente}}/g, datos.cliente?.telefono || '');
        template = template.replace(/{{emailCliente}}/g, datos.cliente?.email || '');

        // Productos/servicios individuales (para casos simples con pocos productos)
        if (datos.productos && datos.productos.length > 0) {
            for (let i = 0; i < Math.min(datos.productos.length, 3); i++) {
                const producto = datos.productos[i];
                const indice = i + 1;
                
                template = template.replace(new RegExp(`{{producto${indice}Descripcion}}`, 'g'), producto.descripcion || '');
                template = template.replace(new RegExp(`{{producto${indice}Cantidad}}`, 'g'), producto.cantidad || '');
                template = template.replace(new RegExp(`{{producto${indice}Precio}}`, 'g'), this.formatearMoneda(producto.precio));
                template = template.replace(new RegExp(`{{producto${indice}Importe}}`, 'g'), this.formatearMoneda(producto.importe));
            }
        }

        // Limpiar placeholders no utilizados
        for (let i = 1; i <= 3; i++) {
            template = template.replace(new RegExp(`{{producto${i}Descripcion}}`, 'g'), '');
            template = template.replace(new RegExp(`{{producto${i}Cantidad}}`, 'g'), '');
            template = template.replace(new RegExp(`{{producto${i}Precio}}`, 'g'), '');
            template = template.replace(new RegExp(`{{producto${i}Importe}}`, 'g'), '');
        }

        // Generar tabla de productos dinámicamente si hay más de 3 productos
        if (datos.productos && datos.productos.length > 0) {
            let filasProductos = '';
            datos.productos.forEach(producto => {
                filasProductos += `
                <tr>
                    <td class="descripcion">${producto.descripcion || ''}</td>
                    <td class="unidad texto-centrado">${producto.cantidad || ''}</td>
                    <td class="precio">${this.formatearMoneda(producto.precio)} €</td>
                    <td class="importe">${this.formatearMoneda(producto.importe)} €</td>
                </tr>`;
            });
            
            // Reemplazar el contenido de productos con la tabla generada
            template = template.replace(/{{#productos}}.*?{{\/productos}}/gs, filasProductos);
        } else {
            // Si no hay productos, limpiar la sección
            template = template.replace(/{{#productos}}.*?{{\/productos}}/gs, '');
        }

        // Totales
        template = template.replace(/{{baseImponible}}/g, this.formatearMoneda(datos.totales?.baseImponible));
        template = template.replace(/{{porcentajeIva}}/g, datos.totales?.porcentajeIva || '21');
        template = template.replace(/{{importeIva}}/g, this.formatearMoneda(datos.totales?.importeIva));
        template = template.replace(/{{totalFactura}}/g, this.formatearMoneda(datos.totales?.total));

        return template;
    }

    /**
     * Genera una tabla HTML dinámicamente para múltiples productos
     * @param {Array} productos - Array de productos
     * @returns {String} HTML de la tabla de productos
     */
    generarTablaProductos(productos) {
        if (!productos || productos.length === 0) {
            return '<tr><td colspan="4" class="texto-centrado">No hay productos</td></tr>';
        }

        return productos.map(producto => `
            <tr>
                <td class="descripcion">${producto.descripcion || ''}</td>
                <td class="unidad texto-centrado">${producto.cantidad || ''}</td>
                <td class="precio">${this.formatearMoneda(producto.precio)} €</td>
                <td class="importe">${this.formatearMoneda(producto.importe)} €</td>
            </tr>
        `).join('');
    }

    /**
     * Formatea una fecha al formato español
     * @param {String|Date} fecha - Fecha a formatear
     * @returns {String} Fecha formateada
     */
    formatearFecha(fecha) {
        if (!fecha) return '';
        
        const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
        
        if (isNaN(date.getTime())) return '';
        
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /**
     * Formatea un número como moneda europea
     * @param {Number} cantidad - Cantidad a formatear
     * @returns {String} Cantidad formateada
     */
    formatearMoneda(cantidad) {
        if (typeof cantidad !== 'number' || isNaN(cantidad)) return '0,00';
        
        return cantidad.toLocaleString('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Calcula los totales de una factura
     * @param {Array} productos - Array de productos
     * @param {Number} porcentajeIva - Porcentaje de IVA (por defecto 21)
     * @returns {Object} Totales calculados
     */
    calcularTotales(productos, porcentajeIva = 21) {
        if (!productos || productos.length === 0) {
            return {
                baseImponible: 0,
                porcentajeIva,
                importeIva: 0,
                total: 0
            };
        }

        const baseImponible = productos.reduce((sum, producto) => {
            const importe = parseFloat(producto.importe) || 0;
            return sum + importe;
        }, 0);

        const importeIva = baseImponible * (porcentajeIva / 100);
        const total = baseImponible + importeIva;

        return {
            baseImponible,
            porcentajeIva,
            importeIva,
            total
        };
    }

    /**
     * Genera datos de ejemplo para pruebas
     * @returns {Object} Datos de ejemplo
     */
    generarDatosEjemplo() {
        return {
            emisor: {
                nombre: 'MI EMPRESA S.L.',
                direccion: 'Calle Principal, 123 - 28001 Madrid',
                nif: 'B12345678',
                telefono: '+34 915 123 456',
                email: 'facturacion@miempresa.es'
            },
            factura: {
                numero: 'F2024-001',
                fecha: new Date(),
                pagina: '1 de 1'
            },
            cliente: {
                nombre: 'Cliente de Ejemplo S.A.',
                direccion: 'Avenida Ejemplo, 456 - 41001 Sevilla',
                nif: 'A87654321',
                telefono: '+34 954 987 654',
                email: 'cliente@ejemplo.com'
            },
            productos: [
                {
                    descripcion: 'Producto de ejemplo 1',
                    cantidad: 2,
                    precio: 150.00,
                    importe: 300.00
                },
                {
                    descripcion: 'Servicio de ejemplo',
                    cantidad: 1,
                    precio: 500.00,
                    importe: 500.00
                }
            ],
            totales: {
                baseImponible: 800.00,
                porcentajeIva: 21,
                importeIva: 168.00,
                total: 968.00
            }
        };
    }
}

// Hacer disponible globalmente para evitar declaraciones duplicadas
if (typeof window !== 'undefined') {
    window.FacturaTemplateManager = FacturaTemplateManager;
}

module.exports = FacturaTemplateManager;
