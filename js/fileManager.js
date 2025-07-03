// Gestor de archivos para la aplicación Facturador
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

class FileManager {
    constructor() {
        this.uploadedFiles = [];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = ['.jpg', '.jpeg', '.png', '.pdf', '.docx', '.xlsx', '.txt', '.csv'];
        this.storageDir = path.join(require('os').homedir(), 'Facturador', 'uploads');
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
            this.uploadedFiles = await ipcRenderer.invoke('get-data', 'uploadedFiles') || [];
            
            // Verificar que los archivos aún existen en el sistema de archivos
            this.uploadedFiles = this.uploadedFiles.filter(file => {
                return fs.existsSync(file.path);
            });
            
            // Guardar la lista filtrada
            await ipcRenderer.invoke('save-data', 'uploadedFiles', this.uploadedFiles);
            
            this.renderFilesList();
        } catch (error) {
            console.error('Error al cargar archivos existentes:', error);
        }
    }

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const selectFilesBtn = document.getElementById('selectFilesBtn');
        const searchFiles = document.getElementById('searchFiles');

        if (!dropZone || !fileInput || !selectFilesBtn) {
            console.warn('Elementos de carga de archivos no encontrados en esta página');
            return;
        }

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
            this.showNotification(`${validFiles.length} archivo(s) subido(s) exitosamente`, 'success');
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
                        await ipcRenderer.invoke('save-data', 'uploadedFiles', this.uploadedFiles);
                        
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

        const files = filesToRender || this.uploadedFiles;

        if (files.length === 0) {
            filesList.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        filesList.innerHTML = files.map(file => `
            <div class="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="flex-shrink-0">
                        ${this.getFileIcon(file.extension)}
                    </div>
                    <div>
                        <h3 class="text-sm font-medium text-gray-900">${file.originalName}</h3>
                        <p class="text-xs text-gray-500">
                            ${this.formatFileSize(file.size)} • 
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
        `).join('');
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
            await ipcRenderer.invoke('open-file-externally', file.path);
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
            const result = await ipcRenderer.invoke('save-file-dialog', {
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
            await ipcRenderer.invoke('save-data', 'uploadedFiles', this.uploadedFiles);

            this.showNotification('Archivo eliminado exitosamente', 'success');
            this.renderFilesList();
        } catch (error) {
            console.error('Error al eliminar archivo:', error);
            this.showNotification('Error al eliminar el archivo', 'error');
        }
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

    showNotification(message, type = 'info') {
        // Usar el sistema de notificaciones de la app principal
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Inicializar el gestor de archivos cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('dropZone')) {
        window.fileManager = new FileManager();
    }
});
