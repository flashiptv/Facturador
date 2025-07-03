// PDF Exporter para la aplicación Facturador
const { ipcRenderer } = require('electron');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class PDFExporter {
    constructor() {
        this.outputDir = path.join(require('os').homedir(), 'Facturador', 'exports');
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
            const htmlContent = this.generateInvoiceHTML(invoice, invoiceLines);
            
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

    generateInvoiceHTML(invoice, invoiceLines) {
        const fechaEmision = new Date(invoice.fecha_emision).toLocaleDateString('es-ES');
        const fechaVencimiento = new Date(invoice.fecha_vencimiento).toLocaleDateString('es-ES');
        
        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Factura ${invoice.numero_factura}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Arial', sans-serif; 
                    line-height: 1.6; 
                    color: #333;
                    background: white;
                }
                .invoice-container { 
                    max-width: 800px; 
                    margin: 0 auto; 
                    padding: 30px;
                    background: white;
                }
                .header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    margin-bottom: 40px;
                    border-bottom: 3px solid #2563eb;
                    padding-bottom: 20px;
                }
                .company-info h1 { 
                    color: #2563eb; 
                    font-size: 28px; 
                    margin-bottom: 5px;
                }
                .company-info p { 
                    color: #666; 
                    font-size: 14px;
                }
                .invoice-info { 
                    text-align: right;
                }
                .invoice-info h2 { 
                    color: #2563eb; 
                    font-size: 24px; 
                    margin-bottom: 10px;
                }
                .invoice-info p { 
                    margin: 5px 0; 
                    font-size: 14px;
                }
                .billing-info { 
                    display: flex; 
                    justify-content: space-between; 
                    margin: 40px 0;
                }
                .billing-info div { 
                    width: 48%;
                }
                .billing-info h3 { 
                    color: #2563eb; 
                    border-bottom: 2px solid #e5e7eb; 
                    padding-bottom: 10px; 
                    margin-bottom: 15px;
                }
                .billing-info p { 
                    margin: 5px 0; 
                    font-size: 14px;
                }
                .invoice-items { 
                    margin: 40px 0;
                }
                .items-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 20px;
                }
                .items-table th { 
                    background: #f8fafc; 
                    color: #374151; 
                    padding: 12px; 
                    text-align: left; 
                    border-bottom: 2px solid #e5e7eb;
                    font-weight: 600;
                }
                .items-table td { 
                    padding: 12px; 
                    border-bottom: 1px solid #e5e7eb;
                }
                .items-table tr:nth-child(even) { 
                    background: #f9fafb;
                }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .totals { 
                    margin-top: 30px;
                    border-top: 2px solid #e5e7eb;
                    padding-top: 20px;
                }
                .totals table { 
                    width: 300px; 
                    margin-left: auto;
                    border-collapse: collapse;
                }
                .totals td { 
                    padding: 8px 12px; 
                    border-bottom: 1px solid #e5e7eb;
                }
                .totals .total-row { 
                    font-weight: bold; 
                    font-size: 18px; 
                    color: #2563eb;
                    border-top: 2px solid #2563eb;
                }
                .notes { 
                    margin-top: 40px; 
                    padding: 20px; 
                    background: #f8fafc; 
                    border-left: 4px solid #2563eb;
                }
                .notes h4 { 
                    color: #2563eb; 
                    margin-bottom: 10px;
                }
                .footer { 
                    margin-top: 50px; 
                    text-align: center; 
                    color: #666; 
                    font-size: 12px;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <!-- Header -->
                <div class="header">
                    <div class="company-info">
                        <h1>Facturador Pro</h1>
                        <p>Sistema de Facturación</p>
                        <p>Email: info@facturador.com</p>
                        <p>Teléfono: +1 234 567 8900</p>
                    </div>
                    <div class="invoice-info">
                        <h2>FACTURA</h2>
                        <p><strong>Número:</strong> ${invoice.numero_factura}</p>
                        <p><strong>Fecha de Emisión:</strong> ${fechaEmision}</p>
                        <p><strong>Fecha de Vencimiento:</strong> ${fechaVencimiento}</p>
                        <p><strong>Estado:</strong> ${this.getStatusText(invoice.estado)}</p>
                    </div>
                </div>

                <!-- Información de Facturación -->
                <div class="billing-info">
                    <div>
                        <h3>Facturar a:</h3>
                        <p><strong>${invoice.cliente_nombre || 'Cliente no encontrado'}</strong></p>
                        <p>${invoice.cliente_email || ''}</p>
                        <p>${invoice.cliente_telefono || ''}</p>
                        <p>${invoice.cliente_direccion || ''}</p>
                    </div>
                    <div>
                        <h3>Detalles de Pago:</h3>
                        <p><strong>Método de Pago:</strong> ${invoice.metodo_pago || 'No especificado'}</p>
                        <p><strong>Términos:</strong> ${invoice.terminos || 'Pago a 30 días'}</p>
                        <p><strong>Moneda:</strong> ${invoice.moneda || 'EUR'}</p>
                    </div>
                </div>

                <!-- Items de la Factura -->
                <div class="invoice-items">
                    <h3 style="color: #2563eb; margin-bottom: 20px;">Detalles de la Factura</h3>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Descripción</th>
                                <th class="text-center">Cantidad</th>
                                <th class="text-right">Precio Unitario</th>
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoiceLines.map(line => `
                                <tr>
                                    <td>
                                        <strong>${line.producto_nombre || line.descripcion}</strong>
                                        ${line.descripcion && line.producto_nombre !== line.descripcion ? `<br><small style="color: #666;">${line.descripcion}</small>` : ''}
                                    </td>
                                    <td class="text-center">${line.cantidad}</td>
                                    <td class="text-right">${this.formatCurrency(line.precio_unitario)}</td>
                                    <td class="text-right">${this.formatCurrency(line.total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Totales -->
                <div class="totals">
                    <table>
                        <tr>
                            <td>Subtotal:</td>
                            <td class="text-right">${this.formatCurrency(invoice.subtotal || 0)}</td>
                        </tr>
                        <tr>
                            <td>IVA (${invoice.tasa_iva || 21}%):</td>
                            <td class="text-right">${this.formatCurrency(invoice.iva || 0)}</td>
                        </tr>
                        ${invoice.descuento > 0 ? `
                        <tr>
                            <td>Descuento:</td>
                            <td class="text-right">-${this.formatCurrency(invoice.descuento)}</td>
                        </tr>
                        ` : ''}
                        <tr class="total-row">
                            <td>TOTAL:</td>
                            <td class="text-right">${this.formatCurrency(invoice.total)}</td>
                        </tr>
                    </table>
                </div>

                <!-- Notas -->
                ${invoice.notas ? `
                <div class="notes">
                    <h4>Notas:</h4>
                    <p>${invoice.notas}</p>
                </div>
                ` : ''}

                <!-- Footer -->
                <div class="footer">
                    <p>Gracias por su preferencia</p>
                    <p>Esta factura fue generada automáticamente por el sistema Facturador Pro</p>
                </div>
            </div>
        </body>
        </html>
        `;
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
