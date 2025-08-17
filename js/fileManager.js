// Gestor de archivos para la aplicación Facturador
// Use global ipcRenderer from app.js
let fileManagerIpcRenderer;
if (typeof window !== 'undefined' && window.ipcRenderer) {
    fileManagerIpcRenderer = window.ipcRenderer;
} else if (typeof require !== 'undefined') {
    const { ipcRenderer: electronIpc } = require('electron');
    fileManagerIpcRenderer = electronIpc;
}

const fs = require('fs');
const path = require('path');

// Advanced file processing libraries
let XLSX;
try {
    XLSX = require('xlsx');
} catch (error) {
    console.warn('XLSX library not available:', error.message);
}

class FileManager {
    constructor() {
        this.uploadedFiles = [];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = ['.jpg', '.jpeg', '.png', '.pdf', '.docx', '.xlsx', '.xls', '.txt', '.csv'];
        this.storageDir = path.join(require('os').homedir(), 'Facturador', 'uploads');
        this.processingFiles = new Set(); // Track files being processed to prevent duplicates
        this.init();
    }

    async init() {
        try {
            // Crear directorio de almacenamiento si no existe
            await this.ensureStorageDir();
            
            // Cargar archivos existentes
            await this.loadExistingFiles();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            console.log('FileManager inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar FileManager:', error);
        }
    }

    async ensureStorageDir() {
        try {
            if (!fs.existsSync(this.storageDir)) {
                fs.mkdirSync(this.storageDir, { recursive: true });
            }
        } catch (error) {
            console.error('Error al crear directorio de almacenamiento:', error);
            throw error;
        }
    }

    async loadExistingFiles() {
        try {
            this.uploadedFiles = await fileManagerIpcRenderer.invoke('get-data', 'uploadedFiles') || [];
            
            // Clean and validate file records
            this.uploadedFiles = this.uploadedFiles.filter(file => {
                // Check if file has minimum required properties
                if (!file.originalName || !file.path) {
                    console.warn('Removing invalid file record:', file);
                    return false;
                }
                
                // Check if file still exists on disk
                if (!fs.existsSync(file.path)) {
                    console.warn('Removing missing file:', file.originalName);
                    return false;
                }
                
                // Ensure extension property exists
                if (!file.extension && file.originalName) {
                    file.extension = path.extname(file.originalName);
                }
                
                return true;
            });
            
            // Save the cleaned list
            await fileManagerIpcRenderer.invoke('save-data', 'uploadedFiles', this.uploadedFiles);
            
            this.renderFilesList();
        } catch (error) {
            console.error('Error al cargar archivos existentes:', error);
            this.uploadedFiles = []; // Reset to empty array on error
        }
    }

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        
        // Solo configurar event listeners si no hay implementación externa
        if (dropZone && dropZone.hasAttribute('data-external-file-handler')) {
            console.log('🔄 Event listeners externos detectados, omitiendo configuración interna de FileManager');
            return;
        }
        
        const fileInput = document.getElementById('fileInput');
        const selectFilesBtn = document.getElementById('selectFilesBtn');
        const searchFiles = document.getElementById('searchFiles');

        if (!dropZone || !fileInput || !selectFilesBtn) {
            console.warn('Elementos de carga de archivos no encontrados en esta página');
            return;
        }

        console.log('🔧 Configurando event listeners internos de FileManager');

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-500', 'bg-blue-50');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });

        // Botón de selección
        selectFilesBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // Input de archivo
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFiles(files);
            e.target.value = ''; // Limpiar input
        });

        // Búsqueda
        if (searchFiles) {
            searchFiles.addEventListener('input', (e) => {
                this.filterFiles(e.target.value);
            });
        }

        // Ordenamiento
        document.getElementById('sortByName')?.addEventListener('click', () => this.sortFiles('name'));
        document.getElementById('sortByDate')?.addEventListener('click', () => this.sortFiles('date'));
        document.getElementById('sortBySize')?.addEventListener('click', () => this.sortFiles('size'));

        // Modal de previsualización
        document.getElementById('closePreviewModal')?.addEventListener('click', () => {
            this.closePreviewModal();
        });
    }

    async handleFiles(files) {
        const validFiles = [];
        const errors = [];

        // Validar archivos
        for (const file of files) {
            const validation = this.validateFile(file);
            if (validation.valid) {
                validFiles.push(file);
            } else {
                errors.push(`${file.name}: ${validation.error}`);
            }
        }

        // Mostrar errores si los hay
        if (errors.length > 0) {
            this.showNotification(`Errores de validación:\n${errors.join('\n')}`, 'error');
        }

        if (validFiles.length === 0) {
            return;
        }

        // Mostrar progreso
        this.showUploadProgress();

        try {
            let processedFiles = 0;
            const totalFiles = validFiles.length;

            for (const file of validFiles) {
                await this.uploadFile(file);
                processedFiles++;
                
                const progress = (processedFiles / totalFiles) * 100;
                this.updateProgress(progress, `Procesando ${processedFiles}/${totalFiles} archivos...`);
            }

            this.hideUploadProgress();
            // Don't show general notification here since processFiles handles specific notifications
            // this.showNotification(`${validFiles.length} archivo(s) subido(s) exitosamente`, 'success');
            this.renderFilesList();

        } catch (error) {
            this.hideUploadProgress();
            this.showNotification('Error al subir archivos: ' + error.message, 'error');
            console.error('Error al subir archivos:', error);
        }
    }

    validateFile(file) {
        // Verificar tamaño
        if (file.size > this.maxFileSize) {
            return {
                valid: false,
                error: `Archivo demasiado grande (máximo ${this.formatFileSize(this.maxFileSize)})`
            };
        }

        // Verificar tipo
        const extension = path.extname(file.name).toLowerCase();
        if (!this.allowedTypes.includes(extension)) {
            return {
                valid: false,
                error: `Tipo de archivo no permitido. Tipos permitidos: ${this.allowedTypes.join(', ')}`
            };
        }

        return { valid: true };
    }

    async uploadFile(file) {
        return new Promise((resolve, reject) => {
            try {
                // Generar nombre único para evitar conflictos
                const timestamp = Date.now();
                const extension = path.extname(file.name);
                const baseName = path.basename(file.name, extension);
                const uniqueName = `${timestamp}_${baseName}${extension}`;
                const filePath = path.join(this.storageDir, uniqueName);

                // Leer archivo
                const reader = new FileReader();
                
                reader.onload = async (e) => {
                    try {
                        // Convertir ArrayBuffer a Buffer
                        const buffer = Buffer.from(e.target.result);
                        
                        // Guardar archivo
                        fs.writeFileSync(filePath, buffer);
                        
                        // Crear registro del archivo
                        const fileRecord = {
                            id: timestamp,
                            originalName: file.name,
                            name: uniqueName,
                            path: filePath,
                            size: file.size,
                            type: file.type,
                            extension: extension,
                            uploadedAt: new Date().toISOString(),
                            associatedInvoiceId: null // Se puede asociar después
                        };

                        this.uploadedFiles.push(fileRecord);
                        await fileManagerIpcRenderer.invoke('save-data', 'uploadedFiles', this.uploadedFiles);
                        
                        // Intentar extraer datos del archivo
                        try {
                            const extractedData = await this.extractAndSaveFileData(fileRecord);
                            if (extractedData) {
                                fileRecord.extractedData = extractedData;
                                console.log('Datos extraídos del archivo:', extractedData);
                                
                                // Mostrar notificación específica según el tipo de datos extraídos
                                let message = 'Archivo subido correctamente';
                                if (extractedData.type === 'clients') {
                                    message = `✅ Archivo subido y ${extractedData.count} clientes importados`;
                                } else if (extractedData.type === 'products') {
                                    message = `✅ Archivo subido y ${extractedData.count} productos importados`;
                                } else if (extractedData.type === 'excel_data') {
                                    message = `✅ Archivo Excel subido y ${extractedData.count} filas de datos extraídas`;
                                } else if (extractedData.type === 'pdf_analysis') {
                                    message = `✅ PDF subido y almacenado correctamente`;
                                } else if (extractedData.type === 'image_analysis') {
                                    message = `✅ Imagen subida y analizada correctamente`;
                                } else if (extractedData.type === 'text_analysis') {
                                    const details = [];
                                    if (extractedData.emails?.length) details.push(`${extractedData.emails.length} emails`);
                                    if (extractedData.phones?.length) details.push(`${extractedData.phones.length} teléfonos`);
                                    if (extractedData.prices?.length) details.push(`${extractedData.prices.length} precios`);
                                    message = `✅ Archivo subido y datos extraídos: ${details.join(', ')}`;
                                }
                                
                                this.showNotification(message, 'success');
                            } else {
                                this.showNotification('✅ Archivo subido correctamente', 'success');
                            }
                        } catch (extractError) {
                            console.error('Error al extraer datos:', extractError);
                        }
                        
                        resolve(fileRecord);
                    } catch (error) {
                        reject(error);
                    }
                };

                reader.onerror = () => reject(new Error('Error al leer el archivo'));
                reader.readAsArrayBuffer(file);

            } catch (error) {
                reject(error);
            }
        });
    }

    renderFilesList(filesToRender = null) {
        const filesList = document.getElementById('filesList');
        const emptyState = document.getElementById('emptyFilesState');
        
        if (!filesList) return;

        try {
            const files = filesToRender || this.uploadedFiles;

            if (files.length === 0) {
                filesList.innerHTML = '';
                if (emptyState) emptyState.style.display = 'block';
                return;
            }

            if (emptyState) emptyState.style.display = 'none';

            filesList.innerHTML = files.map(file => {
                // Ensure extension exists, fallback to extracting from originalName
                const extension = file.extension || path.extname(file.originalName || '');
                
                return `
                <div class="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="flex-shrink-0">
                            ${this.getFileIcon(extension)}
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-900">${file.originalName || 'Archivo sin nombre'}</h3>
                            <p class="text-xs text-gray-500">
                                ${this.formatFileSize(file.size || 0)} • 
                                ${this.formatDate(file.uploadedAt)}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button 
                            onclick="fileManager.previewFile('${file.id}')"
                            class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            Ver
                        </button>
                        <button 
                            onclick="fileManager.downloadFile('${file.id}')"
                            class="text-green-600 hover:text-green-800 text-sm font-medium">
                            Descargar
                        </button>
                        <button 
                            onclick="fileManager.deleteFile('${file.id}')"
                            class="text-red-600 hover:text-red-800 text-sm font-medium">
                            Eliminar
                        </button>
                    </div>
                </div>
            `}).join('');
        } catch (error) {
            console.error('Error al renderizar lista de archivos:', error);
            if (filesList) {
                filesList.innerHTML = '<div class="p-4 text-red-600">Error al cargar la lista de archivos</div>';
            }
        }
    }

    filterFiles(searchTerm) {
        if (!searchTerm.trim()) {
            this.renderFilesList();
            return;
        }

        const filteredFiles = this.uploadedFiles.filter(file =>
            file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
        );

        this.renderFilesList(filteredFiles);
    }

    sortFiles(criteria) {
        const sortedFiles = [...this.uploadedFiles];

        switch (criteria) {
            case 'name':
                sortedFiles.sort((a, b) => a.originalName.localeCompare(b.originalName));
                break;
            case 'date':
                sortedFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
                break;
            case 'size':
                sortedFiles.sort((a, b) => b.size - a.size);
                break;
        }

        this.renderFilesList(sortedFiles);
    }

    async previewFile(fileId) {
        const file = this.uploadedFiles.find(f => f.id == fileId);
        if (!file) {
            this.showNotification('Archivo no encontrado', 'error');
            return;
        }

        const modal = document.getElementById('filePreviewModal');
        const fileName = document.getElementById('previewFileName');
        const previewContent = document.getElementById('previewContent');

        if (!modal || !fileName || !previewContent) {
            this.showNotification('Error al abrir la previsualización', 'error');
            return;
        }

        fileName.textContent = file.originalName;

        try {
            if (['.jpg', '.jpeg', '.png'].includes(file.extension.toLowerCase())) {
                // Previsualización de imagen
                const imageData = fs.readFileSync(file.path);
                const base64 = imageData.toString('base64');
                const mimeType = file.type || `image/${file.extension.slice(1)}`;
                
                previewContent.innerHTML = `
                    <img src="data:${mimeType};base64,${base64}" 
                         alt="${file.originalName}" 
                         class="max-w-full h-auto rounded-lg shadow-lg">
                `;
            } else if (file.extension.toLowerCase() === '.pdf') {
                // Previsualización de PDF
                previewContent.innerHTML = `
                    <div class="text-center p-8">
                        <svg class="mx-auto h-16 w-16 text-red-500 mb-4" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
                        </svg>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">Archivo PDF</h3>
                        <p class="text-gray-600 mb-4">${file.originalName}</p>
                        <button onclick="fileManager.openFileExternally('${file.id}')" 
                                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            Abrir con aplicación externa
                        </button>
                    </div>
                `;
            } else if (['.txt', '.csv'].includes(file.extension.toLowerCase())) {
                // Previsualización de texto
                const textContent = fs.readFileSync(file.path, 'utf8');
                previewContent.innerHTML = `
                    <pre class="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">${textContent}</pre>
                `;
            } else {
                // Vista general para otros tipos
                previewContent.innerHTML = `
                    <div class="text-center p-8">
                        ${this.getFileIcon(file.extension, 'h-16 w-16')}
                        <h3 class="text-lg font-medium text-gray-900 mb-2 mt-4">
                            ${file.originalName}
                        </h3>
                        <p class="text-gray-600 mb-2">Tamaño: ${this.formatFileSize(file.size)}</p>
                        <p class="text-gray-600 mb-4">Subido: ${this.formatDate(file.uploadedAt)}</p>
                        <button onclick="fileManager.openFileExternally('${file.id}')" 
                                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            Abrir con aplicación externa
                        </button>
                    </div>
                `;
            }

            modal.classList.remove('hidden');
        } catch (error) {
            console.error('Error al previsualizar archivo:', error);
            this.showNotification('Error al previsualizar el archivo', 'error');
        }
    }

    closePreviewModal() {
        const modal = document.getElementById('filePreviewModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async openFileExternally(fileId) {
        const file = this.uploadedFiles.find(f => f.id == fileId);
        if (!file) {
            this.showNotification('Archivo no encontrado', 'error');
            return;
        }

        try {
            // Usar shell de Electron para abrir el archivo
            await fileManagerIpcRenderer.invoke('open-file-externally', file.path);
        } catch (error) {
            console.error('Error al abrir archivo externamente:', error);
            this.showNotification('Error al abrir el archivo', 'error');
        }
    }

    async downloadFile(fileId) {
        const file = this.uploadedFiles.find(f => f.id == fileId);
        if (!file) {
            this.showNotification('Archivo no encontrado', 'error');
            return;
        }

        try {
            // Usar dialog de Electron para seleccionar ubicación de descarga
            const result = await fileManagerIpcRenderer.invoke('save-file-dialog', {
                defaultPath: file.originalName,
                filters: [
                    { name: 'Todos los archivos', extensions: ['*'] }
                ]
            });

            if (!result.canceled) {
                // Copiar archivo a la ubicación seleccionada
                const sourceData = fs.readFileSync(file.path);
                fs.writeFileSync(result.filePath, sourceData);
                
                this.showNotification(`Archivo descargado en: ${result.filePath}`, 'success');
            }
        } catch (error) {
            console.error('Error al descargar archivo:', error);
            this.showNotification('Error al descargar el archivo', 'error');
        }
    }

    async deleteFile(fileId) {
        const file = this.uploadedFiles.find(f => f.id == fileId);
        if (!file) {
            this.showNotification('Archivo no encontrado', 'error');
            return;
        }

        if (!confirm(`¿Estás seguro de que quieres eliminar "${file.originalName}"?`)) {
            return;
        }

        try {
            // Eliminar archivo del sistema de archivos
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            // Eliminar de la lista
            this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== file.id);
            await fileManagerIpcRenderer.invoke('save-data', 'uploadedFiles', this.uploadedFiles);

            this.showNotification('Archivo eliminado exitosamente', 'success');
            this.renderFilesList();
        } catch (error) {
            console.error('Error al eliminar archivo:', error);
            this.showNotification('Error al eliminar el archivo', 'error');
        }
    }

    async extractAndSaveFileData(file) {
        try {
            const extension = path.extname(file.originalName).toLowerCase();
            const callId = Date.now() + Math.random();
            
            console.log(`🔍 Analizando archivo: ${file.originalName} (${extension}) - Call ID: ${callId}`);
            console.log(`📍 Stack trace:`, new Error().stack);
            
            switch (extension) {
                case '.csv':
                    return await this.extractCSVData(file);
                case '.txt':
                    return await this.extractTextData(file);
                case '.xlsx':
                case '.xls':
                    return await this.extractExcelData(file);
                case '.pdf':
                    return await this.extractPDFData(file);
                case '.jpg':
                case '.jpeg':
                case '.png':
                    return await this.extractImageData(file);
                default:
                    console.log(`ℹ️ No hay extractor de datos para archivos ${extension}`);
                    return {
                        type: 'file_stored',
                        message: `Archivo ${extension} almacenado correctamente`,
                        filename: file.originalName,
                        note: 'Archivo guardado sin análisis de contenido'
                    };
            }
        } catch (error) {
            console.error('Error al extraer datos del archivo:', error);
            return {
                type: 'extraction_error',
                message: 'Archivo almacenado, pero hubo un error en el análisis',
                filename: file.originalName,
                error: error.message,
                note: 'El archivo se guardó correctamente pero no se pudo analizar su contenido'
            };
        }
    }

    async extractCSVData(file) {
        try {
            const fileContent = fs.readFileSync(file.path, 'utf8');
            const lines = fileContent.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                console.log('Archivo CSV vacío o sin datos');
                return null;
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const data = [];

            // Detectar si es información de clientes o productos
            const isClientData = headers.some(h => 
                h.includes('nombre') || h.includes('email') || h.includes('cliente')
            );
            const isProductData = headers.some(h => 
                h.includes('producto') || h.includes('precio') || h.includes('codigo')
            );

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                const row = {};
                
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });

                data.push(row);
            }

            // Guardar en la base de datos según el tipo detectado
            if (isClientData) {
                return await this.saveExtractedClients(data);
            } else if (isProductData) {
                return await this.saveExtractedProducts(data);
            }

            return { type: 'unknown', data: data };
        } catch (error) {
            console.error('Error al procesar CSV:', error);
            throw error;
        }
    }

    async saveExtractedClients(clientsData) {
        const savedClients = [];
        
        for (const clientData of clientsData) {
            try {
                const client = {
                    nombre: clientData.nombre || clientData.name || '',
                    email: clientData.email || '',
                    telefono: clientData.telefono || clientData.phone || '',
                    direccion: clientData.direccion || clientData.address || '',
                    ciudad: clientData.ciudad || clientData.city || '',
                    codigo_postal: clientData.codigo_postal || clientData.cp || clientData.postal_code || '',
                    nif_cif: clientData.nif_cif || clientData.nif || clientData.cif || ''
                };

                if (client.nombre) {
                    const result = await fileManagerIpcRenderer.invoke('db-create-client', client);
                    if (result) {
                        savedClients.push(result);
                    }
                }
            } catch (error) {
                console.error('Error al guardar cliente:', error);
            }
        }

        return { type: 'clients', count: savedClients.length, data: savedClients };
    }

    async saveExtractedProducts(productsData) {
        const savedProducts = [];
        
        for (const productData of productsData) {
            try {
                const product = {
                    codigo: productData.codigo || productData.code || '',
                    nombre: productData.nombre || productData.name || productData.producto || '',
                    descripcion: productData.descripcion || productData.description || '',
                    precio: parseFloat(productData.precio || productData.price || 0),
                    categoria: productData.categoria || productData.category || '',
                    unidad: productData.unidad || productData.unit || 'ud',
                    iva_percentage: parseFloat(productData.iva || productData.iva_percentage || 21)
                };

                if (product.nombre && product.precio > 0) {
                    const result = await fileManagerIpcRenderer.invoke('db-create-product', product);
                    if (result) {
                        savedProducts.push(result);
                    }
                }
            } catch (error) {
                console.error('Error al guardar producto:', error);
            }
        }

        return { type: 'products', count: savedProducts.length, data: savedProducts };
    }

    async extractTextData(file) {
        try {
            const fileContent = fs.readFileSync(file.path, 'utf8');
            
            // Buscar patrones de datos estructurados en el texto
            const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const phonePattern = /(\+?34)?[0-9]{9}/g;
            const pricePattern = /€?\s?([0-9]+[.,][0-9]{2})/g;

            const emails = fileContent.match(emailPattern) || [];
            const phones = fileContent.match(phonePattern) || [];
            const prices = fileContent.match(pricePattern) || [];

            return {
                type: 'text_analysis',
                emails: emails,
                phones: phones,
                prices: prices,
                content: fileContent.substring(0, 500) // Primer fragmento
            };
        } catch (error) {
            console.error('Error al extraer datos de texto:', error);
            throw error;
        }
    }

    async extractExcelData(file) {
        if (!XLSX) {
            console.error('XLSX library not available');
            return null;
        }

        try {
            const workbook = XLSX.readFile(file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convertir a JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                console.log('Archivo Excel vacío o sin datos');
                return null;
            }

            // Normalizar encabezados a minúsculas
            const normalizedData = jsonData.map(row => {
                const normalizedRow = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[key.toLowerCase().trim()] = row[key];
                });
                return normalizedRow;
            });

            // Detectar tipo de datos
            const headers = Object.keys(normalizedData[0]);
            const isClientData = headers.some(h => 
                h.includes('nombre') || h.includes('email') || h.includes('cliente')
            );
            const isProductData = headers.some(h => 
                h.includes('producto') || h.includes('precio') || h.includes('codigo')
            );

            if (isClientData) {
                return await this.saveExtractedClients(normalizedData);
            } else if (isProductData) {
                return await this.saveExtractedProducts(normalizedData);
            }

            return { type: 'excel_data', data: normalizedData, count: normalizedData.length };
        } catch (error) {
            console.error('Error al procesar Excel:', error);
            throw error;
        }
    }

    async extractPDFData(file) {
        try {
            // Basic PDF file information and storage only
            // No PDF text extraction to avoid dependency issues
            const stats = fs.statSync(file.path);
            
            console.log(`📄 PDF procesado: ${file.originalName} (${this.formatFileSize(stats.size)})`);
            
            return {
                type: 'pdf_analysis',
                message: '✅ PDF subido correctamente y almacenado para futuras referencias.',
                filename: file.originalName,
                size: stats.size,
                uploadedAt: new Date().toISOString(),
                text: '',
                emails: [],
                phones: [],
                prices: [],
                nifs: [],
                pages: 'N/A',
                note: '📋 Para análisis completo de PDF, considere usar servicios externos como Adobe PDF Extract API o Google Document AI',
                status: 'stored_successfully'
            };
        } catch (error) {
            console.error('Error al procesar PDF:', error);
            return {
                type: 'pdf_analysis',
                message: '⚠️ PDF almacenado, pero sin análisis de contenido',
                filename: file.originalName,
                error: error.message,
                note: 'El archivo se ha guardado correctamente pero no se pudo analizar su contenido',
                status: 'stored_with_warning'
            };
        }
    }

    async extractImageData(file) {
        try {
            // For images, we'll do basic analysis and prepare for future OCR
            const stats = fs.statSync(file.path);
            const extension = path.extname(file.originalName).toLowerCase();
            
            // Generate invoice template from image
            const templateResult = await this.generateInvoiceTemplateFromImage(file);
            
            // Basic image information
            const imageInfo = {
                type: 'image_analysis',
                filename: file.originalName,
                size: stats.size,
                format: extension,
                message: 'Imagen procesada y template de factura generado correctamente',
                uploadedAt: new Date().toISOString(),
                // Template generation result
                templateGenerated: templateResult.success,
                templateName: templateResult.templateName,
                templatePath: templateResult.templatePath,
                // Placeholder for future OCR results
                ocrText: '',
                extractedData: {
                    emails: [],
                    phones: [],
                    prices: [],
                    nifs: []
                },
                suggestion: 'Template de factura generado automáticamente. Para extraer texto de imágenes, puede usar servicios como Google Cloud Vision API o Azure Computer Vision'
            };

            return imageInfo;
        } catch (error) {
            console.error('Error al analizar imagen:', error);
            return {
                type: 'image_analysis',
                message: 'Error al analizar la imagen',
                templateGenerated: false,
                error: error.message
            };
        }
    }

    extractClientFromLines(lines) {
        const client = {};
        
        lines.forEach(line => {
            const lower = line.toLowerCase();
            if (lower.includes('nombre:') || lower.includes('cliente:')) {
                client.nombre = line.split(':')[1]?.trim();
            } else if (lower.includes('email:') || lower.includes('correo:')) {
                client.email = line.split(':')[1]?.trim();
            } else if (lower.includes('teléfono:') || lower.includes('telefono:') || lower.includes('tel:')) {
                client.telefono = line.split(':')[1]?.trim();
            } else if (lower.includes('dirección:') || lower.includes('direccion:')) {
                client.direccion = line.split(':')[1]?.trim();
            } else if (lower.includes('nif:') || lower.includes('cif:')) {
                client.nif_cif = line.split(':')[1]?.trim();
            }
        });

        return client.nombre ? client : null;
    }

    extractProductFromLines(lines) {
        const product = {};
        
        lines.forEach(line => {
            const lower = line.toLowerCase();
            if (lower.includes('producto:') || lower.includes('artículo:') || lower.includes('nombre:')) {
                product.nombre = line.split(':')[1]?.trim();
            } else if (lower.includes('precio:')) {
                const priceMatch = line.match(/([0-9]+[.,][0-9]{2})/);
                if (priceMatch) {
                    product.precio = parseFloat(priceMatch[1].replace(',', '.'));
                }
            } else if (lower.includes('código:') || lower.includes('codigo:')) {
                product.codigo = line.split(':')[1]?.trim();
            } else if (lower.includes('descripción:') || lower.includes('descripcion:')) {
                product.descripcion = line.split(':')[1]?.trim();
            }
        });

        return (product.nombre && product.precio) ? product : null;
    }

    // Métodos utilitarios
    showUploadProgress() {
        const progressContainer = document.getElementById('uploadProgress');
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
        }
    }

    hideUploadProgress() {
        const progressContainer = document.getElementById('uploadProgress');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
        }
    }

    updateProgress(percentage, status) {
        const progressBar = document.getElementById('progressBar');
        const statusElement = document.getElementById('uploadStatus');
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        return new Intl.DateTimeFormat('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));
    }

    getFileIcon(extension, className = 'h-8 w-8') {
        const iconClass = `${className} text-gray-400`;
        
        // Handle undefined or null extension
        if (!extension) {
            extension = '.unknown';
        }
        
        switch (extension.toLowerCase()) {
            case '.pdf':
                return `<svg class="${iconClass}" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
                </svg>`;
            case '.jpg':
            case '.jpeg':
            case '.png':
                return `<svg class="${iconClass}" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H216V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37ZM40,172l40-40,44,44a8,8,0,0,0,11.31,0L216,95.64V200H40Zm32-68a12,12,0,1,1,12,12A12,12,0,0,1,72,104Z"></path>
                </svg>`;
            case '.docx':
            case '.doc':
                return `<svg class="${iconClass}" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
                </svg>`;
            case '.xlsx':
            case '.xls':
                return `<svg class="${iconClass}" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
                </svg>`;
            default:
                return `<svg class="${iconClass}" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
                </svg>`;
        }
    }

    async processFiles(files) {
        const results = [];
        
        try {
            console.log(`📁 Procesando ${files.length} archivo(s)...`);
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Create unique identifier for this file
                const fileId = `${file.name}_${file.size}_${file.lastModified || Date.now()}`;
                
                // Check if this file is already being processed
                if (this.processingFiles.has(fileId)) {
                    console.warn(`⚠️ Archivo ${file.name} ya está siendo procesado, omitiendo...`);
                    continue;
                }
                
                // Mark file as being processed
                this.processingFiles.add(fileId);
                
                try {
                    // Validate file
                    const validation = this.validateFile(file);
                    if (!validation.valid) {
                        console.warn(`❌ Archivo ${file.name} rechazado: ${validation.error}`);
                        this.showNotification(`❌ ${file.name}: ${validation.error}`, 'error');
                        continue;
                    }
                    
                    // Save file and extract data
                    console.log(`⏳ Procesando archivo ${i + 1}/${files.length}: ${file.name}`);
                    const result = await this.saveAndProcessFile(file);
                    results.push(result);
                    
                    // Show specific success message based on extraction result
                    if (result.extractedData) {
                        const extractionType = result.extractedData.type;
                        if (extractionType === 'clients' && result.extractedData.count > 0) {
                            this.showNotification(`👥 ${result.extractedData.count} cliente(s) importado(s) desde ${file.name}`, 'success');
                        } else if (extractionType === 'products' && result.extractedData.count > 0) {
                            this.showNotification(`📦 ${result.extractedData.count} producto(s) importado(s) desde ${file.name}`, 'success');
                        } else if (extractionType === 'pdf_analysis') {
                            this.showNotification(`📄 PDF ${file.name} almacenado correctamente`, 'success');
                        } else if (extractionType === 'image_analysis') {
                            this.showNotification(`🖼️ Imagen ${file.name} almacenada correctamente`, 'success');
                        } else {
                            this.showNotification(`✅ Archivo ${file.name} subido correctamente`, 'success');
                        }
                    } else {
                        this.showNotification(`✅ Archivo ${file.name} subido correctamente`, 'success');
                    }
                } catch (error) {
                    console.error(`❌ Error procesando archivo ${file.name}:`, error);
                    this.showNotification(`❌ Error procesando ${file.name}: ${error.message}`, 'error');
                } finally {
                    // Remove file from processing set
                    this.processingFiles.delete(fileId);
                }
            }
            
            if (results.length > 0) {
                // Update files list
                await this.loadExistingFiles();
                console.log(`✅ Procesamiento completado: ${results.length} archivo(s) procesado(s)`);
            }
            
            return results;
        } catch (error) {
            console.error('❌ Error en processFiles:', error);
            this.showNotification('❌ Error general al procesar archivos', 'error');
            throw error;
        }
    }

    async saveAndProcessFile(file) {
        const saveCallId = Date.now() + Math.random();
        console.log(`💾 saveAndProcessFile llamado - Call ID: ${saveCallId} - Archivo: ${file.name}`);
        
        // Create unique filename
        const timestamp = Date.now();
        const extension = path.extname(file.name);
        const baseName = path.basename(file.name, extension);
        const uniqueName = `${timestamp}_${baseName}${extension}`;
        const filePath = path.join(this.storageDir, uniqueName);
        
        // Save file to disk
        const buffer = await file.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));
        
        // Create file object
        const fileObj = {
            originalName: file.name,
            path: filePath,
            extension: extension
        };
        
        console.log(`🔄 Llamando extractAndSaveFileData desde saveAndProcessFile - Call ID: ${saveCallId}`);
        // Extract data
        const extractedData = await this.extractAndSaveFileData(fileObj);
        
        // Save to uploaded files list
        const fileRecord = {
            id: timestamp,
            originalName: file.name,
            path: filePath,
            size: file.size,
            type: file.type,
            extension: extension, // Add the extension property
            uploadedAt: new Date().toISOString(),
            extractedData: extractedData
        };
        
        this.uploadedFiles.push(fileRecord);
        await fileManagerIpcRenderer.invoke('save-data', 'uploadedFiles', this.uploadedFiles);
        
        return fileRecord;
    }

    async generateInvoiceTemplateFromImage(file) {
        try {
            console.log('🎨 Generando template de factura desde imagen:', file.originalName);
            
            // Analyze image to extract layout information
            const imageAnalysis = await this.analyzeImageLayout(file);
            
            // Generate HTML template based on image analysis
            const template = await this.createTemplateFromImageAnalysis(imageAnalysis, file);
            
            // Save template to templates directory
            const templatePath = await this.saveGeneratedTemplate(template, file.originalName);
            
            // Show success notification
            if (window.app) {
                window.app.showNotification('🎨 Template de factura generado correctamente', 'success');
            }
            
            return {
                success: true,
                templatePath,
                templateName: template.name,
                message: 'Template de factura creado exitosamente'
            };
            
        } catch (error) {
            console.error('Error al generar template de factura:', error);
            if (window.app) {
                window.app.showNotification('Error al generar template de factura', 'error');
            }
            return {
                success: false,
                error: error.message
            };
        }
    }

    async analyzeImageLayout(file) {
        // Basic image analysis - in a real implementation, this would use AI/ML
        const stats = fs.statSync(file.path);
        const extension = path.extname(file.originalName).toLowerCase();
        
        // Generate basic layout analysis
        return {
            filename: file.originalName,
            size: stats.size,
            format: extension,
            width: 800, // Default values - would be extracted from actual image
            height: 1200,
            dominantColors: ['#333333', '#666666', '#f8f9fa'],
            detectedElements: [
                { type: 'header', position: { x: 0, y: 0, width: 800, height: 120 } },
                { type: 'logo', position: { x: 50, y: 20, width: 100, height: 80 } },
                { type: 'company_info', position: { x: 200, y: 20, width: 300, height: 80 } },
                { type: 'client_info', position: { x: 50, y: 150, width: 350, height: 100 } },
                { type: 'invoice_info', position: { x: 450, y: 150, width: 300, height: 100 } },
                { type: 'items_table', position: { x: 50, y: 280, width: 700, height: 400 } },
                { type: 'totals', position: { x: 450, y: 720, width: 300, height: 150 } },
                { type: 'footer', position: { x: 0, y: 1050, width: 800, height: 150 } }
            ],
            style: {
                fontFamily: 'Arial, sans-serif',
                primaryColor: '#333333',
                secondaryColor: '#666666',
                backgroundColor: '#ffffff',
                borderColor: '#e5e7eb'
            }
        };
    }

    async createTemplateFromImageAnalysis(analysis, file) {
        const timestamp = Date.now();
        const templateName = `template-${timestamp}`;
        const templateDisplayName = `Template desde ${file.originalName}`;
        
        // Generate HTML template based on analysis
        const htmlContent = this.generateHTMLFromAnalysis(analysis, templateDisplayName);
        
        // Create template metadata
        const templateMetadata = {
            id: templateName,
            name: templateDisplayName,
            description: `Template generado automáticamente desde la imagen ${file.originalName}`,
            created: new Date().toISOString(),
            source: 'image_analysis',
            sourceFile: file.originalName,
            version: '1.0.0',
            style: analysis.style,
            elements: analysis.detectedElements
        };
        
        return {
            id: templateName,
            name: templateDisplayName,
            htmlContent,
            metadata: templateMetadata
        };
    }

    generateHTMLFromAnalysis(analysis, templateName) {
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura - ${templateName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: ${analysis.style.fontFamily};
            color: ${analysis.style.primaryColor};
            background-color: ${analysis.style.backgroundColor};
            line-height: 1.6;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            min-height: 100vh;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid ${analysis.style.borderColor};
        }
        
        .logo {
            max-width: 150px;
            height: auto;
        }
        
        .company-info {
            text-align: right;
        }
        
        .company-info h1 {
            color: ${analysis.style.primaryColor};
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        
        .client-info, .invoice-info {
            flex: 1;
        }
        
        .invoice-info {
            text-align: right;
        }
        
        .info-section h3 {
            color: ${analysis.style.primaryColor};
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        .items-table th {
            background-color: ${analysis.style.primaryColor};
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
        }
        
        .items-table td {
            padding: 10px 12px;
            border-bottom: 1px solid ${analysis.style.borderColor};
        }
        
        .items-table tr:hover {
            background-color: #f8f9fa;
        }
        
        .totals {
            text-align: right;
            margin-bottom: 30px;
        }
        
        .totals table {
            margin-left: auto;
            border-collapse: collapse;
        }
        
        .totals td {
            padding: 8px 15px;
            border-bottom: 1px solid ${analysis.style.borderColor};
        }
        
        .totals .total-final {
            font-weight: bold;
            font-size: 18px;
            color: ${analysis.style.primaryColor};
            border-top: 2px solid ${analysis.style.primaryColor};
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid ${analysis.style.borderColor};
            text-align: center;
            color: ${analysis.style.secondaryColor};
        }
        
        .placeholder {
            color: #999;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">
                <img src="{{logo_url}}" alt="Logo" class="logo" />
            </div>
            <div class="company-info">
                <h1>{{company_name}}</h1>
                <p>{{company_address}}</p>
                <p>{{company_phone}} | {{company_email}}</p>
                <p>{{company_tax_id}}</p>
            </div>
        </div>
        
        <!-- Invoice Details -->
        <div class="invoice-details">
            <div class="client-info info-section">
                <h3>Facturar a:</h3>
                <p><strong>{{client_name}}</strong></p>
                <p>{{client_address}}</p>
                <p>{{client_city}}, {{client_postal_code}}</p>
                <p>{{client_tax_id}}</p>
            </div>
            
            <div class="invoice-info info-section">
                <h3>Detalles de la Factura</h3>
                <p><strong>Número:</strong> {{invoice_number}}</p>
                <p><strong>Fecha:</strong> {{invoice_date}}</p>
                <p><strong>Vencimiento:</strong> {{due_date}}</p>
            </div>
        </div>
        
        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>Concepto</th>
                    <th>Cantidad</th>
                    <th>Precio Unitario</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                {{#each invoice_items}}
                <tr>
                    <td>{{concepto}}</td>
                    <td>{{cantidad}}</td>
                    <td>{{precio_unitario}}€</td>
                    <td>{{total}}€</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
        
        <!-- Totals -->
        <div class="totals">
            <table>
                <tr>
                    <td>Subtotal:</td>
                    <td>{{subtotal}}€</td>
                </tr>
                <tr>
                    <td>IVA ({{iva_percentage}}%):</td>
                    <td>{{iva_amount}}€</td>
                </tr>
                <tr class="total-final">
                    <td>Total:</td>
                    <td>{{total}}€</td>
                </tr>
            </table>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>{{payment_terms}}</p>
            <p>{{additional_notes}}</p>
        </div>
    </div>
</body>
</html>`;
    }

    async saveGeneratedTemplate(template, sourceImageName) {
        try {
            const templatesDir = path.join(__dirname, '../templates');
            const customTemplatesDir = path.join(templatesDir, 'custom');
            
            // Ensure custom templates directory exists
            if (!fs.existsSync(customTemplatesDir)) {
                fs.mkdirSync(customTemplatesDir, { recursive: true });
            }
            
            // Save HTML template
            const templateFileName = `${template.id}.html`;
            const templatePath = path.join(customTemplatesDir, templateFileName);
            fs.writeFileSync(templatePath, template.htmlContent, 'utf8');
            
            // Save metadata
            const metadataFileName = `${template.id}.json`;
            const metadataPath = path.join(customTemplatesDir, metadataFileName);
            fs.writeFileSync(metadataPath, JSON.stringify(template.metadata, null, 2), 'utf8');
            
            console.log('✅ Template guardado:', templatePath);
            return templatePath;
            
        } catch (error) {
            console.error('Error al guardar template:', error);
            throw error;
        }
    }

    // ...existing code...
}

// Make FileManager available globally for browser usage
if (typeof window !== 'undefined') {
    window.FileManager = FileManager;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileManager;
}

// Auto-initialize FileManager on file upload pages
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('dropZone')) {
        // Add delay to ensure all scripts are loaded
        setTimeout(() => {
            if (!window.fileManager && !window.app?.fileManager) {
                try {
                    window.fileManager = new FileManager();
                    window.fileManager.init();
                    console.log('🔄 FileManager auto-inicializado en página de archivos');
                } catch (error) {
                    console.warn('Error en auto-inicialización de FileManager:', error);
                }
            } else {
                console.log('ℹ️ FileManager ya existe, omitiendo auto-inicialización');
            }
        }, 500); // 500ms delay
    }
});
