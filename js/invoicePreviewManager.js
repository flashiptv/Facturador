/**
 * Utilidades para la interfaz de facturas HTML
 * Facturador - Sistema de Facturación Profesional
 */

class InvoicePreviewManager {
    constructor() {
        // Initialize PDFExporter when needed to avoid circular dependencies
        this.pdfExporter = null;
        this.currentInvoiceId = null;
        this.previewWindow = null;
    }

    getPdfExporter() {
        if (!this.pdfExporter) {
            // Check if PDFExporter is available in global scope
            if (typeof PDFExporter !== 'undefined') {
                this.pdfExporter = new PDFExporter();
            } else {
                console.error('PDFExporter no está disponible. Asegúrate de que pdfExporter.js se carga antes que invoicePreviewManager.js');
                throw new Error('PDFExporter no está disponible');
            }
        }
        return this.pdfExporter;
    }

    /**
     * Muestra una vista previa de la factura en una nueva ventana
     * @param {number} invoiceId - ID de la factura a previsualizar
     */
    async showInvoicePreview(invoiceId) {
        try {
            // Generar vista previa
            const result = await this.getPdfExporter().previewInvoiceHTML(invoiceId);
            
            if (!result.success) {
                throw new Error(result.error);
            }

            // Crear ventana de vista previa
            this.createPreviewWindow(result.htmlContent, result.invoice);
            
            return true;
        } catch (error) {
            console.error('Error al mostrar vista previa:', error);
            this.showError('Error al generar vista previa de la factura: ' + error.message);
            return false;
        }
    }

    /**
     * Crea una ventana modal para mostrar la vista previa
     * @param {string} htmlContent - Contenido HTML de la factura
     * @param {Object} invoice - Datos de la factura
     */
    createPreviewWindow(htmlContent, invoice) {
        // Crear ventana modal
        const modal = document.createElement('div');
        modal.className = 'invoice-preview-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>Vista Previa - Factura ${invoice.numero_factura}</h3>
                        <div class="modal-actions">
                            <button class="btn btn-primary" onclick="invoicePreview.printInvoice(${invoice.id})">
                                <i class="fas fa-print"></i> Imprimir
                            </button>
                            <button class="btn btn-secondary" onclick="invoicePreview.downloadHTML(${invoice.id})">
                                <i class="fas fa-download"></i> Descargar HTML
                            </button>
                            <button class="btn btn-info" onclick="invoicePreview.downloadPDF(${invoice.id})">
                                <i class="fas fa-file-pdf"></i> Exportar PDF
                            </button>
                            <button class="btn btn-light" onclick="this.closest('.invoice-preview-modal').remove()">
                                <i class="fas fa-times"></i> Cerrar
                            </button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <iframe src="data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}" 
                                width="100%" 
                                height="600px" 
                                frameborder="0">
                        </iframe>
                    </div>
                </div>
            </div>
        `;

        // Agregar estilos para la modal
        this.addPreviewStyles();
        
        // Agregar al DOM
        document.body.appendChild(modal);
        
        this.previewWindow = modal;
    }

    /**
     * Imprime la factura actual
     * @param {number} invoiceId - ID de la factura
     */
    async printInvoice(invoiceId) {
        try {
            const result = await this.getPdfExporter().printInvoice(invoiceId);
            
            if (result.success) {
                this.showSuccess('Factura abierta para impresión');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error al imprimir factura:', error);
            this.showError('Error al abrir la factura para impresión: ' + error.message);
        }
    }

    /**
     * Descarga la factura como HTML
     * @param {number} invoiceId - ID de la factura
     */
    async downloadHTML(invoiceId) {
        try {
            const result = await this.getPdfExporter().exportInvoiceToHTML(invoiceId);
            
            if (result.success) {
                this.showSuccess(`Factura HTML guardada: ${result.fileName}`);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error al descargar HTML:', error);
            this.showError('Error al generar archivo HTML: ' + error.message);
        }
    }

    /**
     * Descarga la factura como PDF
     * @param {number} invoiceId - ID de la factura
     */
    async downloadPDF(invoiceId) {
        try {
            const result = await this.getPdfExporter().exportInvoiceToPDF(invoiceId);
            
            if (result.success) {
                this.showSuccess(`Factura PDF guardada: ${result.fileName}`);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error al descargar PDF:', error);
            this.showError('Error al generar archivo PDF: ' + error.message);
        }
    }

    /**
     * Agrega estilos CSS para la modal de vista previa
     */
    addPreviewStyles() {
        if (document.getElementById('invoice-preview-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'invoice-preview-styles';
        styles.textContent = `
            .invoice-preview-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
                overflow: auto;
            }

            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .modal-content {
                background: white;
                border-radius: 8px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                width: 90%;
                max-width: 1200px;
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .modal-header {
                padding: 20px;
                background: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .modal-header h3 {
                margin: 0;
                color: #2c3e50;
                font-size: 18px;
            }

            .modal-actions {
                display: flex;
                gap: 10px;
            }

            .modal-actions .btn {
                padding: 8px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .modal-actions .btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }

            .btn-primary {
                background: #007bff;
                color: white;
            }

            .btn-secondary {
                background: #6c757d;
                color: white;
            }

            .btn-info {
                background: #17a2b8;
                color: white;
            }

            .btn-light {
                background: #f8f9fa;
                color: #6c757d;
                border: 1px solid #dee2e6;
            }

            .modal-body {
                flex: 1;
                overflow: auto;
                padding: 0;
            }

            .modal-body iframe {
                border: none;
                width: 100%;
                height: 100%;
            }

            @media (max-width: 768px) {
                .modal-content {
                    width: 95%;
                    height: 95vh;
                }

                .modal-header {
                    flex-direction: column;
                    gap: 15px;
                    text-align: center;
                }

                .modal-actions {
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .modal-actions .btn {
                    font-size: 12px;
                    padding: 6px 10px;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    /**
     * Muestra un mensaje de éxito
     * @param {string} message - Mensaje a mostrar
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Muestra un mensaje de error
     * @param {string} message - Mensaje a mostrar
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Muestra una notificación
     * @param {string} message - Mensaje
     * @param {string} type - Tipo de notificación (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Estilos básicos para notificaciones
        this.addNotificationStyles();

        // Agregar al DOM
        document.body.appendChild(notification);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle',
            warning: 'exclamation-triangle'
        };
        return icons[type] || 'info-circle';
    }

    addNotificationStyles() {
        if (document.getElementById('notification-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                min-width: 300px;
                max-width: 500px;
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: slideIn 0.3s ease-out;
            }

            .notification-content {
                padding: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
                color: white;
                font-size: 14px;
            }

            .notification-success .notification-content {
                background: #28a745;
            }

            .notification-error .notification-content {
                background: #dc3545;
            }

            .notification-info .notification-content {
                background: #17a2b8;
            }

            .notification-warning .notification-content {
                background: #ffc107;
                color: #212529;
            }

            .notification-close {
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                padding: 0;
                margin-left: auto;
                opacity: 0.7;
                transition: opacity 0.2s;
            }

            .notification-close:hover {
                opacity: 1;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;

        document.head.appendChild(styles);
    }
}

// Crear instancia global
const invoicePreview = new InvoicePreviewManager();

// Exportar para uso en otras partes de la aplicación
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InvoicePreviewManager;
}
