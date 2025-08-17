// PDF Exporter para la aplicación Facturador
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Verificar si FacturaTemplateManager ya está disponible globalmente
let FacturaTemplateManager;
if (typeof window !== 'undefined' && window.FacturaTemplateManager) {
    FacturaTemplateManager = window.FacturaTemplateManager;
} else {
    try {
        FacturaTemplateManager = require('./facturaTemplateManager');
    } catch (error) {
        console.warn('FacturaTemplateManager no disponible:', error.message);
    }
}

class PDFExporter {
    constructor() {
        this.outputDir = path.join(require('os').homedir(), 'Facturador', 'exports');
        if (FacturaTemplateManager) {
            this.templateManager = new FacturaTemplateManager();
        }
        // Use global ipcRenderer from app.js
        this.ipcRenderer = window.ipcRenderer;
        this.init();
    }

    async init() {
        try {
            // Crear directorio de exportación si no existe
            if (!fs.existsSync(this.outputDir)) {
                fs.mkdirSync(this.outputDir, { recursive: true });
            }
            console.log('PDFExporter inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar PDFExporter:', error);
        }
    }

    async exportInvoiceToPDF(invoiceId) {
        try {
            // Obtener datos de la factura
            const invoice = await ipcRenderer.invoke('db-get-invoice-by-id', invoiceId);
            if (!invoice) {
                throw new Error('Factura no encontrada');
            }

            const invoiceLines = await ipcRenderer.invoke('db-get-invoice-lines', invoiceId);
            
            // Generar HTML para la factura
            const htmlContent = await this.generateInvoiceHTML(invoice, invoiceLines);
            
            // Crear PDF usando Puppeteer
            const browser = await puppeteer.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            await page.setContent(htmlContent);
            
            // Configurar opciones del PDF
            const pdfOptions = {
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                }
            };

            // Generar nombre de archivo
            const fileName = `Factura_${invoice.numero_factura}_${Date.now()}.pdf`;
            const outputPath = path.join(this.outputDir, fileName);

            // Generar PDF
            await page.pdf({ ...pdfOptions, path: outputPath });
            await browser.close();

            return {
                success: true,
                filePath: outputPath,
                fileName: fileName
            };

        } catch (error) {
            console.error('Error al exportar factura a PDF:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Genera HTML de factura usando el template manager
     * @param {Object} invoice - Datos de la factura
     * @param {Array} invoiceLines - Líneas de la factura
     * @param {String} templateName - Nombre de la plantilla
     * @returns {String} HTML generado
     */
    async generateInvoiceHTML(invoice, invoiceLines, templateName = 'factura-profesional.html') {
        try {
            // Obtener datos del cliente
            const cliente = await this.ipcRenderer.invoke('db-get-client-by-id', invoice.cliente_id);
            
            // Obtener configuración de la empresa
            let configuracion = await this.ipcRenderer.invoke('db-get-settings') || {};
            
            // Configuración por defecto para el emisor
            const empresaConfig = {
                nombre: configuracion.empresa_nombre || 'Loredana Andreea Popa',
                direccion: configuracion.empresa_direccion || 'Calle Romero 24C',
                nif: configuracion.empresa_nif || 'X6554416Z',
                telefono: configuracion.empresa_telefono || '677 83 53 01',
                email: configuracion.empresa_email || 'contacto@miempresa.com'
            };
            
            // Preparar datos para la plantilla
            const datosFactura = {
                emisor: empresaConfig,
                factura: {
                    numero: invoice.numero || invoice.numero_factura,
                    fecha: this.formatearFecha(invoice.fecha_emision),
                    pagina: '1 de 1'
                },
                cliente: {
                    nombre: cliente ? cliente.nombre : 'Cliente no encontrado',
                    direccion: cliente ? cliente.direccion : '',
                    nif: cliente ? (cliente.nif_cif || cliente.nif) : '',
                    telefono: cliente ? cliente.telefono : '',
                    email: cliente ? cliente.email : ''
                },
                productos: invoiceLines.map(line => ({
                    descripcion: line.producto_nombre || line.descripcion || 'Producto sin nombre',
                    cantidad: line.cantidad,
                    precio: parseFloat(line.precio_unitario) || 0,
                    importe: parseFloat(line.total) || 0
                })),
                totales: this.calcularTotales(invoiceLines, 21) // Use standard 21% IVA rate
            };

            // Generar HTML usando el template manager con la plantilla seleccionada
            return await this.templateManager.generarFacturaHTML(datosFactura, templateName);
            
        } catch (error) {
            console.error('Error al generar HTML de factura:', error);
            // Fallback a template básico
            return this.generateBasicInvoiceHTML(invoice, invoiceLines);
        }
    }

    /**
     * Genera vista previa HTML de la factura
     * @param {Number} invoiceId - ID de la factura
     * @returns {Object} Resultado con HTML generado
     */
    async previewInvoiceHTML(invoiceId) {
        try {
            // Obtener datos de la factura
            const invoice = await this.ipcRenderer.invoke('db-get-invoice-by-id', invoiceId);
            if (!invoice) {
                throw new Error('Factura no encontrada');
            }
            const invoiceLines = await this.ipcRenderer.invoke('db-get-invoice-lines', invoiceId);

            // Generar HTML
            const htmlContent = await this.generateInvoiceHTML(invoice, invoiceLines);
            
            return {
                success: true,
                html: htmlContent,
                invoiceNumber: invoice.numero || invoice.numero_factura
            };
            
        } catch (error) {
            console.error('Error al generar vista previa:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Calcula los totales de la factura
     * @param {Array} invoiceLines - Líneas de la factura
     * @param {Number} ivaPercentage - Porcentaje de IVA
     * @returns {Object} Totales calculados
     */
    calcularTotales(invoiceLines, ivaPercentage = 21) {
        let subtotal = 0;
        
        invoiceLines.forEach(line => {
            subtotal += parseFloat(line.total) || 0;
        });
        
        // Ensure IVA percentage is reasonable (between 0 and 100)
        if (ivaPercentage > 100 || ivaPercentage < 0) {
            console.warn(`Invalid IVA percentage: ${ivaPercentage}%, using 21% as default`);
            ivaPercentage = 21;
        }
        
        const iva = subtotal * (ivaPercentage / 100);
        const total = subtotal + iva;
        
        return {
            baseImponible: subtotal.toFixed(2),
            porcentajeIva: ivaPercentage,
            importeIva: iva.toFixed(2),
            total: total.toFixed(2)
        };
    }

    formatearFecha(fecha) {
        if (!fecha) return new Date().toLocaleDateString('es-ES');
        
        const fechaObj = new Date(fecha);
        return fechaObj.toLocaleDateString('es-ES');
    }

    getStatusText(status) {
        const statusMap = {
            'borrador': 'Borrador',
            'enviada': 'Enviada',
            'pagada': 'Pagada',
            'vencida': 'Vencida',
            'cancelada': 'Cancelada'
        };
        return statusMap[status] || 'Desconocido';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);
    }

    async openExportFolder() {
        try {
            const { shell } = require('electron');
            await shell.openPath(this.outputDir);
        } catch (error) {
            console.error('Error al abrir carpeta de exportación:', error);
        }
    }
}

// Exportar para uso en otras partes de la aplicación
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFExporter;
}
