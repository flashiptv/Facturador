// Navegación y funcionalidades globales mejoradas
// Verificar si ipcRenderer ya está disponible globalmente
let ipcRenderer;
if (window.ipcRenderer) {
    ipcRenderer = window.ipcRenderer;
} else {
    const { ipcRenderer: electronIpc } = require('electron');
    ipcRenderer = electronIpc;
    // Hacer ipcRenderer disponible globalmente para evitar declaraciones duplicadas
    window.ipcRenderer = ipcRenderer;
}

// Manejo global de errores
window.addEventListener('error', (event) => {
    console.error('Error global capturado:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });

    // Mostrar notificación al usuario si es posible
    if (window.app && typeof window.app.showNotification === 'function') {
        window.app.showNotification('Se ha producido un error inesperado', 'error');
    }

    // Prevenir que el error se propague
    return true;
});

// Manejo de promesas rechazadas no capturadas
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesa rechazada no capturada:', event.reason);

    // Mostrar notificación al usuario si es posible
    if (window.app && typeof window.app.showNotification === 'function') {
        window.app.showNotification('Error en operación asíncrona', 'error');
    }

    // Prevenir que aparezca en la consola del navegador
    event.preventDefault();
});

class FacturadorApp {
    constructor() {
        this.currentPage = '';
        this.currentUser = null;
        this.clients = [];
        this.invoices = [];

        // Inicializar componentes
        this.fileManager = null;
        this.pdfExporter = null;
        this.authSystem = null;

        // Configuración de timeouts
        this.defaultTimeout = 10000; // 10 segundos
        this.longTimeout = 30000; // 30 segundos para operaciones largas

        this.init();
    }

    // Helper para agregar timeout a operaciones IPC
    async invokeWithTimeout(channel, ...args) {
        const timeout = channel.includes('pdf') || channel.includes('file') ? this.longTimeout : this.defaultTimeout;

        return Promise.race([
            ipcRenderer.invoke(channel, ...args),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout: Operación ${channel} tardó más de ${timeout/1000} segundos`)), timeout)
            )
        ]);
    }

    async init() {
        try {
            this.currentPage = this.getCurrentPageName();
            await this.loadCurrentUser();
            await this.loadData();
            this.setupEventListeners();
            this.setupFormValidation();
            await this.loadPageSpecificData();
            
            // Inicializar componentes adicionales
            this.initializeComponents();
            
            console.log('Aplicación inicializada correctamente:', {
                page: this.currentPage,
                user: this.currentUser?.email || 'No autenticado',
                clients: this.clients.length,
                invoices: this.invoices.length
            });
        } catch (error) {
            console.error('Error al inicializar la aplicación:', error);
            this.showNotification('Error al inicializar la aplicación', 'error');
        }
    }

    initializeComponents() {
        try {
            // Inicializar FileManager si está disponible globalmente
            if (typeof FileManager !== 'undefined') {
                try {
                    this.fileManager = new FileManager();
                    // Initialize FileManager asynchronously
                    this.fileManager.init().then(() => {
                        // Make FileManager globally available
                        window.fileManager = this.fileManager;
                        console.log('✅ FileManager inicializado y disponible globalmente');
                    }).catch(error => {
                        console.warn('Error al inicializar FileManager:', error);
                    });
                } catch (e) {
                    console.warn('FileManager no disponible:', e.message);
                }
            } else {
                console.log('ℹ️ FileManager class no está disponible en esta página');
            }

            // Inicializar PDFExporter
            if (typeof require !== 'undefined') {
                try {
                    const PDFExporter = require('../js/pdfExporter');
                    this.pdfExporter = new PDFExporter();
                } catch (e) {
                    console.warn('PDFExporter no disponible:', e.message);
                }

                // Inicializar sistema de autenticación
                try {
                    const AuthenticationSystem = require('../js/authenticationSystem');
                    this.authSystem = new AuthenticationSystem();
                    console.log('✅ Sistema de autenticación inicializado correctamente');
                } catch (e) {
                    console.error('❌ Error al inicializar autenticación:', e.message);
                    this.authSystem = null;
                }
            }
        } catch (error) {
            console.error('❌ Error al inicializar componentes:', error.message);
        }
    }

    getCurrentPageName() {
        const path = window.location.pathname;
        return path.split('/').pop().replace('.html', '');
    }

    async loadCurrentUser() {
        try {
            this.currentUser = await this.invokeWithTimeout('get-data', 'currentUser');
        } catch (error) {
            console.error('Error al cargar usuario actual:', error);
            this.currentUser = null;
        }
    }

    async loadData() {
        // Cargar datos desde SQLite
        try {
            this.clients = await this.invokeWithTimeout('db-get-all-clients') || [];
            this.invoices = await this.invokeWithTimeout('db-get-all-invoices') || [];
        } catch (error) {
            console.error('Error al cargar datos de la base de datos:', error);
            // Fallback a electron-store para compatibilidad
            try {
                this.clients = await this.invokeWithTimeout('get-data', 'clients') || [];
                this.invoices = await this.invokeWithTimeout('get-data', 'invoices') || [];
            } catch (fallbackError) {
                console.error('Error en fallback:', fallbackError);
                this.clients = [];
                this.invoices = [];
            }
        }
    }

    setupEventListeners() {
        // Navegación
        document.addEventListener('click', (e) => {
            const navButton = e.target.closest('[data-navigate]');
            if (navButton) {
                e.preventDefault();
                const page = navButton.getAttribute('data-navigate');
                this.navigateTo(page);
            }

            // Botón de logout
            if (e.target.closest('#logoutBtn') || e.target.closest('[data-action="logout"]')) {
                e.preventDefault();
                this.handleLogout();
            }
        });

        // Formularios
        document.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(e.target);
        });

        // Búsqueda en tiempo real
        document.addEventListener('input', (e) => {
            if (e.target.matches('[data-search]')) {
                this.handleSearch(e.target);
            }
        });
    }

    setupFormValidation() {
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[required], textarea[required]')) {
                this.validateField(e.target);
            }
        });
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'Este campo es requerido';
        } else if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Formato de email inválido';
            }
        } else if (field.type === 'tel' && value) {
            const phoneRegex = /^[\d\s\-\+\(\)]+$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                errorMessage = 'Formato de teléfono inválido';
            }
        }

        if (isValid) {
            this.clearFieldError(field);
        } else {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error text-red-500 text-sm mt-1';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
        field.classList.add('border-red-500', 'border-2');
    }

    clearFieldError(field) {
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        field.classList.remove('border-red-500', 'border-2');
    }

    async navigateTo(page) {
        try {
            await ipcRenderer.invoke('navigate-to', page);
        } catch (error) {
            console.error('Error de navegación:', error);
            this.showNotification('Error al navegar a la página', 'error');
        }
    }

    async handleFormSubmit(form) {
        console.log('📋 Formulario enviado:', form);
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const formType = form.getAttribute('data-form-type');
        console.log('📊 Datos del formulario:', data);
        console.log('🏷️ Tipo de formulario:', formType);

        // Validar todos los campos requeridos
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        for (const field of requiredFields) {
            if (!this.validateField(field)) {
                isValid = false;
            }
        }

        if (!isValid) {
            console.error('❌ Formulario inválido');
            this.showNotification('Por favor, corrija los errores en el formulario', 'error');
            return;
        }

        // Mostrar indicador de carga
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Guardando...';
        submitButton.disabled = true;

        try {
            console.log('🔄 Procesando formulario tipo:', formType);
            switch (formType) {
                case 'login':
                    console.log('🔑 Procesando login...');
                    await this.handleLogin(data);
                    break;
                case 'register':
                    console.log('📝 Procesando registro...');
                    await this.handleRegister(data);
                    break;
                case 'invoice':
                    console.log('🧾 Procesando factura...');
                    await this.handleInvoice(data);
                    break;
                case 'client':
                    console.log('👤 Procesando cliente...');
                    await this.handleClient(data);
                    break;
                case 'product':
                    console.log('📦 Procesando producto...');
                    await this.handleProduct(data, form);
                    break;
                case 'company':
                    console.log('🏢 Procesando información de empresa...');
                    await this.handleCompanySettings(data);
                    break;
                case 'invoice-settings':
                    console.log('⚙️ Procesando configuración de facturas...');
                    await this.handleInvoiceSettings(data);
                    break;
                case 'user-profile':
                    console.log('👤 Procesando perfil de usuario...');
                    await this.handleUserProfile(data);
                    break;
                case 'change-password':
                    console.log('🔒 Procesando cambio de contraseña...');
                    await this.handleChangePassword(data);
                    break;
                case 'quote':
                    console.log('📋 Procesando presupuesto...');
                    await this.handleQuote(data);
                    break;
                default:
                    throw new Error(`Tipo de formulario no reconocido: ${formType}`);
            }
        } catch (error) {
            console.error('❌ Error al procesar formulario:', error);
            this.showNotification('Error al procesar los datos: ' + error.message, 'error');
        } finally {
            // Restaurar botón
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    async handleLogin(data) {
        try {
            if (this.authSystem) {
                // Usar el sistema de autenticación real
                const result = await this.authSystem.login(data.email, data.password);
                
                if (result.success) {
                    this.currentUser = result.user;
                    this.showNotification(`Bienvenido, ${result.user.nombre}!`, 'success');
                    setTimeout(() => {
                        this.navigateTo('totalfacturas');
                    }, 1500);
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Fallback a usuarios demo
                const demoUsers = [
                    { email: 'admin@facturador.com', password: 'admin123', name: 'Administrador' },
                    { email: 'demo@ejemplo.com', password: 'demo123', name: 'Usuario Demo' },
                    { email: 'test@test.com', password: 'test123', name: 'Usuario Test' }
                ];

                const user = demoUsers.find(u => u.email === data.email && u.password === data.password);

                if (user) {
                    await ipcRenderer.invoke('save-data', 'currentUser', user);
                    this.currentUser = user;
                    this.showNotification(`¡Bienvenido ${user.name}!`, 'success');
                    
                    setTimeout(() => {
                        this.navigateTo('totalfacturas');
                    }, 1500);
                } else {
                    throw new Error('Credenciales incorrectas. Use: admin@facturador.com / admin123');
                }
            }
        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    }

    async handleRegister(data) {
        try {
            console.log('📝 handleRegister llamado con datos:', data);
            if (this.authSystem) {
                console.log('🔧 Sistema de autenticación disponible, llamando register...');
                const result = await this.authSystem.register(data);
                console.log('📤 Resultado del registro:', result);
                if (result.success) {
                    this.showNotification(result.message, 'success');
                    setTimeout(() => {
                        this.navigateTo('iniciosesion');
                    }, 2000);
                } else {
                    throw new Error(result.error);
                }
            } else {
                console.error('❌ Sistema de autenticación no disponible');
                throw new Error('El sistema de autenticación no está disponible.');
            }
        } catch (error) {
            console.error('❌ Error en handleRegister:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async registerUserDirect(userData) {
        try {
            const { nombre, email, password, confirmPassword } = userData;

            // Validaciones
            if (!nombre || !email || !password || !confirmPassword) {
                throw new Error('Todos los campos son requeridos');
            }

            if (password !== confirmPassword) {
                throw new Error('Las contraseñas no coinciden');
            }

            if (password.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }

            if (!this.isValidEmail(email)) {
                throw new Error('Email no válido');
            }

            // Verificar si el usuario ya existe
            const existingUser = await ipcRenderer.invoke('db-get-user-by-email', email);
            if (existingUser) {
                throw new Error('Ya existe un usuario con este email');
            }

            // Hash de la contraseña usando bcrypt en el main process
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Crear usuario en la base de datos
            const newUser = {
                nombre: nombre.trim(),
                email: email.trim().toLowerCase(),
                password_hash: passwordHash,
                activo: true
            };

            const userId = await ipcRenderer.invoke('db-create-user', newUser);

            if (userId) {
                return {
                    success: true,
                    message: 'Usuario registrado exitosamente'
                };
            } else {
                throw new Error('Error al crear usuario');
            }

        } catch (error) {
            console.error('Error en registro directo:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async handleClient(data) {
        try {
            const clientData = {
                nombre: data.nombre,
                email: data.email,
                telefono: data.telefono,
                direccion: data.direccion,
                ciudad: data.ciudad,
                codigo_postal: data.codigo_postal,
                nif_cif: data.nif_cif,
                notas: data.notas
            };

            // Verificar si es edición o creación
            const editId = document.querySelector('[data-form-type="client"]')?.getAttribute('data-edit-id');
            
            let savedClient;
            if (editId) {
                // Actualizar cliente existente
                savedClient = await ipcRenderer.invoke('db-update-client', parseInt(editId), clientData);
                this.showNotification('Cliente actualizado exitosamente', 'success');
            } else {
                // Crear nuevo cliente
                savedClient = await ipcRenderer.invoke('db-create-client', clientData);
                this.showNotification('Cliente creado exitosamente', 'success');
            }

            // Recargar lista de clientes
            await this.loadData();

            // Cerrar modal si existe
            const modal = document.getElementById('newClientModal');
            if (modal) {
                modal.classList.add('hidden');
                // Limpiar el formulario
                const form = document.querySelector('[data-form-type="client"]');
                if (form) {
                    form.reset();
                    form.removeAttribute('data-edit-id');
                    document.querySelector('#newClientModal h3').textContent = 'Nuevo Cliente';
                }
            }

            // Actualizar lista de clientes si estamos en esa página
            if (this.currentPage === 'clientes') {
                this.renderClientsList();
            }

        } catch (error) {
            console.error('Error al guardar cliente:', error);
            throw new Error('Error al guardar el cliente: ' + error.message);
        }
    }

    async handleInvoice(data) {
        try {
            const invoiceData = {
                numero: await ipcRenderer.invoke('db-generate-invoice-number'),
                client_id: parseInt(data.clienteId),
                fecha_emision: data.fechaEmision || new Date().toISOString().split('T')[0],
                fecha_vencimiento: data.fechaVencimiento,
                subtotal: parseFloat(data.subtotal) || 0,
                total_iva: parseFloat(data.impuestos) || 0,
                total: parseFloat(data.total) || 0,
                descuento: parseFloat(data.descuento) || 0,
                estado: 'borrador',
                notas: data.notas,
                condiciones_pago: data.condiciones_pago,
                metodo_pago: data.metodo_pago
            };

            const savedInvoice = await ipcRenderer.invoke('db-create-invoice', invoiceData);
            
            // Recargar datos
            await this.loadData();

            this.showNotification(`Factura ${savedInvoice.numero} creada exitosamente`, 'success');

            // Limpiar formulario
            const form = document.querySelector('[data-form-type="invoice"]');
            if (form) {
                form.reset();
            }

        } catch (error) {
            console.error('Error al crear factura:', error);
            throw new Error('Error al crear la factura: ' + error.message);
        }
    }

    async handleProduct(data, form) {
        try {
            const productData = {
                codigo: data.codigo,
                nombre: data.nombre,
                descripcion: data.descripcion,
                precio: parseFloat(data.precio),
                iva: parseInt(data.iva) || 21,
                stock: parseInt(data.stock) || 0
            };

            // Verificar si es edición o creación
            const editId = form?.getAttribute('data-edit-id');

            let savedProduct;
            if (editId) {
                // Actualizar producto existente
                savedProduct = await ipcRenderer.invoke('db-update-product', parseInt(editId), productData);
                this.showNotification('Artículo actualizado exitosamente', 'success');
            } else {
                // Crear nuevo producto
                savedProduct = await ipcRenderer.invoke('db-create-product', productData);
                this.showNotification('Artículo creado exitosamente', 'success');
            }

            // Cerrar modal si existe
            const modal = document.getElementById('productModal');
            if (modal) {
                modal.classList.add('hidden');
                // Limpiar el formulario
                if (form) {
                    form.reset();
                    form.removeAttribute('data-edit-id');
                    document.querySelector('#productModalTitle').textContent = 'Nuevo Artículo';
                }
            }

            // Recargar productos si estamos en esa página
            if (this.currentPage === 'productos' && typeof window.loadProducts === 'function') {
                await window.loadProducts();
            }

        } catch (error) {
            console.error('Error al guardar producto:', error);
            throw new Error('Error al guardar el artículo: ' + error.message);
        }
    }

    async handleQuote(data) {
        try {
            console.log('📋 Procesando presupuesto con datos:', data);

            // Delegar al manager de presupuestos si está disponible
            if (window.presupuestosManager && typeof window.presupuestosManager.saveQuote === 'function') {
                // El manager de presupuestos manejará el guardado
                this.showNotification('Presupuesto procesado por el manager específico', 'info');
                return;
            }

            // Fallback: procesar aquí si no hay manager específico
            const quoteData = {
                cliente: data.cliente,
                fecha: data.fecha || new Date().toISOString().split('T')[0],
                validez: data.validez,
                total: parseFloat(data.total) || 0,
                estado: 'borrador',
                notas: data.notas
            };

            console.log('💾 Guardando presupuesto:', quoteData);
            this.showNotification('Presupuesto guardado exitosamente', 'success');

        } catch (error) {
            console.error('Error al procesar presupuesto:', error);
            throw new Error('Error al procesar el presupuesto: ' + error.message);
        }
    }

    async handleCompanySettings(data) {
        try {
            const companyData = {
                company_name: data.company_name,
                company_nif: data.company_nif,
                company_address: data.company_address,
                company_city: data.company_city,
                company_postal_code: data.company_postal_code,
                company_country: data.company_country,
                company_phone: data.company_phone,
                company_email: data.company_email,
                company_website: data.company_website
            };

            await ipcRenderer.invoke('save-company-settings', companyData);
            this.showNotification('Información de empresa guardada exitosamente', 'success');

        } catch (error) {
            console.error('Error al guardar configuración de empresa:', error);
            throw new Error('Error al guardar la información de empresa: ' + error.message);
        }
    }

    async handleInvoiceSettings(data) {
        try {
            const invoiceSettings = {
                invoice_prefix: data.invoice_prefix,
                invoice_start_number: parseInt(data.invoice_start_number) || 1,
                default_vat: parseInt(data.default_vat) || 21,
                default_due_days: parseInt(data.default_due_days) || 30,
                default_invoice_notes: data.default_invoice_notes
            };

            await ipcRenderer.invoke('save-invoice-settings', invoiceSettings);
            this.showNotification('Configuración de facturas guardada exitosamente', 'success');

        } catch (error) {
            console.error('Error al guardar configuración de facturas:', error);
            throw new Error('Error al guardar la configuración de facturas: ' + error.message);
        }
    }

    async handleUserProfile(data) {
        try {
            const profileData = {
                name: data.user_name,
                email: data.user_email
            };

            // Actualizar perfil del usuario actual
            const result = await ipcRenderer.invoke('update-user-profile', this.currentUser.id, profileData);
            
            if (result.success) {
                this.currentUser.name = profileData.name;
                this.showNotification('Perfil actualizado exitosamente', 'success');
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            throw new Error('Error al actualizar el perfil: ' + error.message);
        }
    }

    async handleChangePassword(data) {
        try {
            if (data.new_password !== data.confirm_password) {
                throw new Error('Las contraseñas no coinciden');
            }

            if (data.new_password.length < 6) {
                throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
            }

            const result = await ipcRenderer.invoke('change-user-password', {
                userId: this.currentUser.id,
                currentPassword: data.current_password,
                newPassword: data.new_password
            });

            if (result.success) {
                // Limpiar el formulario
                const form = document.querySelector('[data-form-type="change-password"]');
                if (form) form.reset();
                
                this.showNotification('Contraseña cambiada exitosamente', 'success');
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            throw new Error('Error al cambiar la contraseña: ' + error.message);
        }
    }

    async handleSearch(searchField) {
        const query = searchField.value.toLowerCase().trim();
        const searchType = searchField.getAttribute('data-search');

        if (searchType === 'clients') {
            try {
                let filteredClients;
                if (query) {
                    // Usar búsqueda de la base de datos
                    filteredClients = await ipcRenderer.invoke('db-search-clients', query);
                } else {
                    // Mostrar todos los clientes
                    filteredClients = this.clients;
                }
                
                this.renderClientsList(filteredClients);
            } catch (error) {
                console.error('Error en búsqueda:', error);
                // Fallback a búsqueda local
                const filteredClients = query 
                    ? this.clients.filter(client => 
                        client.nombre.toLowerCase().includes(query) ||
                        client.email.toLowerCase().includes(query) ||
                        client.telefono.includes(query)
                      )
                    : this.clients;
                
                this.renderClientsList(filteredClients);
            }
        }
    }

    showNotification(message, type = 'info') {
        console.log(`📢 Notificación [${type}]: ${message}`);
        
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-black' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        // Añadir al documento
        document.body.appendChild(notification);
        
        // Eliminar después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // También usar alert como fallback
        if (type === 'error') {
            setTimeout(() => alert(`Error: ${message}`), 100);
        }
    }



    async loadPageSpecificData() {
        switch (this.currentPage) {
            case 'totalfacturas':
                await this.loadDashboard();
                break;
            case 'clientes':
                await this.loadClientsPage();
                break;
            case 'appfacturas':
                await this.loadInvoiceForm();
                break;
        }
    }

    async loadDashboard() {
        await this.updateDashboardStats();
        await this.renderInvoicesList();
        this.setupInvoiceSearch();
        this.setupInvoiceTabs();
    }

    async loadClientsPage() {
        this.renderClientsList();
        this.setupClientSearch();
    }

    populateClientSelect() {
        const clientSelect = document.getElementById('clientSelect');
        if (!clientSelect) return;

        clientSelect.innerHTML = '<option value="">Seleccionar cliente...</option>';
        
        this.clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.nombre} (${client.email || 'Sin email'})`;
            clientSelect.appendChild(option);
        });
    }

    setupInvoiceCalculations() {
        // This would setup invoice form calculations
        console.log('Invoice calculations setup completed');
    }

    async loadClients() {
        try {
            this.clients = await ipcRenderer.invoke('db-get-all-clients') || [];
            this.renderClientsList();
        } catch (error) {
            console.error('Error loading clients:', error);
            this.showNotification('Error al cargar clientes', 'error');
        }
    }

    async loadInvoiceForm() {
        this.populateClientSelect();
        this.setupInvoiceCalculations();
    }

    async updateDashboardStats() {
        try {
            const stats = await ipcRenderer.invoke('db-get-dashboard-stats');
            
            // Actualizar elementos del dashboard si existen
            const totalClientsEl = document.querySelector('[data-stat="total-clients"]');
            const totalInvoicesEl = document.querySelector('[data-stat="total-invoices"]');
            const pendingInvoicesEl = document.querySelector('[data-stat="pending-invoices"]');
            const totalRevenueEl = document.querySelector('[data-stat="total-revenue"]');
            const invoicesThisMonthEl = document.querySelector('[data-stat="invoices-this-month"]');
            
            if (totalClientsEl) totalClientsEl.textContent = stats.totalClients || 0;
            if (totalInvoicesEl) totalInvoicesEl.textContent = stats.totalInvoices || 0;
            if (pendingInvoicesEl) pendingInvoicesEl.textContent = stats.pendingInvoices || 0;
            if (totalRevenueEl) totalRevenueEl.textContent = this.formatCurrency(stats.totalRevenue || 0);
            if (invoicesThisMonthEl) invoicesThisMonthEl.textContent = stats.invoicesThisMonth || 0;
            
            console.log('Dashboard actualizado:', stats);
        } catch (error) {
            console.error('Error al actualizar estadísticas:', error);
            // Fallback a datos locales
            const totalInvoices = this.invoices.length;
            const totalClients = this.clients.length;
            const pendingInvoices = this.invoices.filter(inv => inv.estado === 'pendiente').length;
            
            console.log('Dashboard actualizado (fallback):', {
                facturas: totalInvoices,
                clientes: totalClients,
                pendientes: pendingInvoices
            });
        }
    }

    renderClientsList(clientsToRender = null) {
        const clients = clientsToRender || this.clients;
        const tbody = document.querySelector('table tbody');
        
        if (!tbody) return;

        tbody.innerHTML = '';

        if (clients.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" class="text-center py-8 text-gray-500">
                    No hay clientes registrados
                </td>
            `;
            tbody.appendChild(row);
            return;
        }

        clients.forEach(client => {
            const row = document.createElement('tr');
            row.className = 'border-t border-t-[#d4dce2] hover:bg-gray-100';
            row.innerHTML = `
                <td class="h-[72px] px-4 py-2 text-[#101518] text-sm font-normal leading-normal">
                    ${client.nombre || 'Sin nombre'}
                </td>
                <td class="h-[72px] px-4 py-2 text-[#5c748a] text-sm font-normal leading-normal">
                    ${client.email || 'Sin email'}
                </td>
                <td class="h-[72px] px-4 py-2 text-[#5c748a] text-sm font-normal leading-normal">
                    ${client.telefono || 'Sin teléfono'}
                </td>
                <td class="h-[72px] px-4 py-2 text-[#5c748a] text-sm font-normal leading-normal">
                    ${client.direccion || 'Sin dirección'}
                </td>
                <td class="h-[72px] px-4 py-2">
                    <button onclick="app.editClient(${client.id})" 
                            class="text-blue-600 hover:text-blue-800 font-medium">
                        Editar
                    </button>
                    <button onclick="app.deleteClient(${client.id})" 
                            class="text-red-600 hover:text-red-800 font-medium ml-2">
                        Eliminar
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async renderInvoicesList(invoicesToRender = null) {
        try {
            let invoices;
            if (invoicesToRender) {
                invoices = invoicesToRender;
            } else {
                invoices = await ipcRenderer.invoke('db-get-invoices');
            }
            
            const invoicesList = document.getElementById('invoicesList');
            const emptyState = document.getElementById('emptyState');
            
            if (!invoicesList) return;
            
            if (invoices.length === 0) {
                invoicesList.innerHTML = '';
                if (emptyState) emptyState.classList.remove('hidden');
                return;
            }
            
            if (emptyState) emptyState.classList.add('hidden');
            
            invoicesList.innerHTML = invoices.map(invoice => this.createInvoiceRow(invoice)).join('');
            
            // Setup row event listeners
            this.setupInvoiceRowEvents();
            
        } catch (error) {
            console.error('Error al cargar lista de facturas:', error);
            this.showNotification('Error al cargar las facturas', 'error');
        }
    }

    createInvoiceRow(invoice) {
        const statusColors = {
            'borrador': 'bg-gray-100 text-gray-700',
            'enviada': 'bg-yellow-100 text-yellow-700',
            'pagada': 'bg-green-100 text-green-700',
            'vencida': 'bg-red-100 text-red-700',
            'cancelada': 'bg-red-100 text-red-700'
        };
        
        const statusText = {
            'borrador': 'Borrador',
            'enviada': 'Enviada',
            'pagada': 'Pagada',
            'vencida': 'Vencida',
            'cancelada': 'Cancelada'
        };
        
        const fechaEmision = new Date(invoice.fecha_emision).toLocaleDateString('es-ES');
        const fechaVencimiento = new Date(invoice.fecha_vencimiento).toLocaleDateString('es-ES');
        
        return `
            <div class="p-4 hover:bg-gray-50 cursor-pointer" data-invoice-id="${invoice.id}">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-4">
                            <div class="flex-shrink-0">
                                <div class="text-sm font-medium text-gray-900">
                                    Factura #${invoice.numero_factura}
                                </div>
                                <div class="text-sm text-gray-500">
                                    ${invoice.cliente_nombre || 'Cliente no encontrado'}
                                </div>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm text-gray-900">
                                    Emisión: ${fechaEmision}
                                </div>
                                <div class="text-sm text-gray-500">
                                    Vencimiento: ${fechaVencimiento}
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm font-medium text-gray-900">
                                    ${this.formatCurrency(invoice.total)}
                                </div>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[invoice.estado] || statusColors.borrador}">
                                    ${statusText[invoice.estado] || 'Borrador'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 ml-4">
                        <button 
                            class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            data-action="view-invoice" 
                            data-invoice-id="${invoice.id}"
                        >
                            Ver
                        </button>
                        <button 
                            class="text-green-600 hover:text-green-800 text-sm font-medium"
                            data-action="edit-invoice" 
                            data-invoice-id="${invoice.id}"
                        >
                            Editar
                        </button>
                        <button 
                            class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            data-action="export-pdf" 
                            data-invoice-id="${invoice.id}"
                        >
                            PDF
                        </button>
                        ${invoice.estado === 'enviada' ? `
                            <button 
                                class="text-purple-600 hover:text-purple-800 text-sm font-medium"
                                data-action="mark-paid" 
                                data-invoice-id="${invoice.id}"
                            >
                                Marcar Pagada
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    setupInvoiceRowEvents() {
        const invoicesList = document.getElementById('invoicesList');
        if (!invoicesList) return;
        
        invoicesList.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            const invoiceId = e.target.dataset.invoiceId;
            
            if (!action || !invoiceId) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            switch (action) {
                case 'view-invoice':
                    await this.viewInvoice(invoiceId);
                    break;
                case 'edit-invoice':
                    await this.editInvoice(invoiceId);
                    break;
                case 'mark-paid':
                    await this.markInvoicePaid(invoiceId);
                    break;
                case 'export-pdf':
                    await this.exportInvoiceToPDF(invoiceId);
                    break;
            }
        });
    }

    async viewInvoice(invoiceId) {
        try {
            const invoice = await ipcRenderer.invoke('db-get-invoice-by-id', parseInt(invoiceId));
            if (invoice) {
                // Por ahora mostrar un alert, después se puede implementar un modal
                alert(`Factura #${invoice.numero_factura}\nCliente: ${invoice.cliente_nombre}\nTotal: ${this.formatCurrency(invoice.total)}\nEstado: ${invoice.estado}`);
            }
        } catch (error) {
            console.error('Error al ver factura:', error);
            this.showNotification('Error al cargar la factura', 'error');
        }
    }

    async editInvoice(invoiceId) {
        // Navegar a la página de facturas con el ID para editar
        this.navigateTo('appfacturas', { editInvoiceId: invoiceId });
    }

    async markInvoicePaid(invoiceId) {
        try {
            const success = await ipcRenderer.invoke('db-update-invoice-status', parseInt(invoiceId), 'pagada');
            if (success) {
                this.showNotification('Factura marcada como pagada', 'success');
                await this.renderInvoicesList(); // Recargar lista
                await this.updateDashboardStats(); // Actualizar estadísticas
            } else {
                this.showNotification('Error al actualizar la factura', 'error');
            }
        } catch (error) {
            console.error('Error al marcar factura como pagada:', error);
            this.showNotification('Error al actualizar la factura', 'error');
        }
    }

    async exportInvoiceToPDF(invoiceId) {
        try {
            if (!this.pdfExporter) {
                this.showNotification('El exportador PDF no está disponible', 'error');
                return;
            }

            this.showNotification('Generando PDF...', 'info');
            
            const result = await this.pdfExporter.exportInvoiceToPDF(invoiceId);
            
            if (result.success) {
                this.showNotification(`PDF generado exitosamente: ${result.fileName}`, 'success');
                
                // Preguntar si quiere abrir la carpeta
                const response = confirm('¿Desea abrir la carpeta donde se guardó el PDF?');
                if (response) {
                    await this.pdfExporter.openExportFolder();
                }
            } else {
                this.showNotification('Error al generar PDF: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error al exportar factura a PDF:', error);
            this.showNotification('Error al exportar la factura', 'error');
        }
    }

    setupInvoiceSearch() {
        const searchInput = document.getElementById('searchInvoices');
        const statusFilter = document.getElementById('statusFilter');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterInvoices();
            });
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterInvoices();
            });
        }
    }

    setupClientSearch() {
        const searchInput = document.getElementById('clientSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filteredClients = this.clients.filter(client =>
                    client.nombre.toLowerCase().includes(searchTerm) ||
                    (client.email && client.email.toLowerCase().includes(searchTerm)) ||
                    (client.nif_cif && client.nif_cif.toLowerCase().includes(searchTerm))
                );
                this.renderClientsList(filteredClients);
            });
        }
    }

    setupInvoiceTabs() {
        const tabs = document.querySelectorAll('[data-tab]');
        const tabContents = document.querySelectorAll('[data-tab-content]');
        
        if (tabs.length === 0) return;
        
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = tab.dataset.tab;
                
                // Remove active classes from all tabs
                tabs.forEach(t => t.classList.remove('active', 'border-blue-500', 'text-blue-600'));
                tabContents.forEach(content => content.classList.add('hidden'));
                
                // Add active classes to clicked tab
                tab.classList.add('active', 'border-blue-500', 'text-blue-600');
                
                // Show corresponding content
                const targetContent = document.querySelector(`[data-tab-content="${targetTab}"]`);
                if (targetContent) {
                    targetContent.classList.remove('hidden');
                }
                
                // Load specific data for tab if needed
                if (targetTab === 'pending') {
                    this.renderInvoicesList(this.invoices.filter(inv => inv.estado === 'pendiente'));
                } else if (targetTab === 'paid') {
                    this.renderInvoicesList(this.invoices.filter(inv => inv.estado === 'pagada'));
                } else if (targetTab === 'all') {
                    this.renderInvoicesList(this.invoices);
                }
            });
        });
    }

    async filterInvoices() {
        const searchInput = document.getElementById('searchInvoices');
        const statusFilter = document.getElementById('statusFilter');
        
        if (!searchInput || !statusFilter) return;
        
        const searchTerm = searchInput.value.toLowerCase();
        const statusValue = statusFilter.value;
        
        try {
            let invoices = await ipcRenderer.invoke('db-get-invoices');
            
            // Apply filters
            if (searchTerm) {
                invoices = invoices.filter(invoice => 
                    invoice.numero_factura.toLowerCase().includes(searchTerm) ||
                    (invoice.cliente_nombre && invoice.cliente_nombre.toLowerCase().includes(searchTerm))
                );
            }
            
            if (statusValue) {
                invoices = invoices.filter(invoice => invoice.estado === statusValue);
            }
            
            await this.renderInvoicesList(invoices);
        } catch (error) {
            console.error('Error al filtrar facturas:', error);
        }
    }

    async filterInvoicesByTab(tabValue) {
        try {
            let invoices = await ipcRenderer.invoke('db-get-invoices');
            
            if (tabValue !== 'all') {
                const statusMap = {
                    'pending': 'enviada',
                    'paid': 'pagada',
                    'overdue': 'vencida'
                };
                
                const filterStatus = statusMap[tabValue];
                if (filterStatus) {
                    invoices = invoices.filter(invoice => invoice.estado === filterStatus);
                }
            }
            
            await this.renderInvoicesList(invoices);
        } catch (error) {
            console.error('Error al filtrar facturas por tab:', error);
        }
    }

    // Métodos de gestión de clientes
    async editClient(clientId) {
        try {
            const client = await ipcRenderer.invoke('db-get-client-by-id', clientId);
            if (!client) {
                this.showNotification('Cliente no encontrado', 'error');
                return;
            }

            // Llenar el formulario con los datos del cliente
            const form = document.querySelector('[data-form-type="client"]');
            if (form) {
                form.querySelector('[name="nombre"]').value = client.nombre || '';
                form.querySelector('[name="email"]').value = client.email || '';
                form.querySelector('[name="telefono"]').value = client.telefono || '';
                form.querySelector('[name="direccion"]').value = client.direccion || '';
                form.querySelector('[name="nif_cif"]').value = client.nif_cif || '';
                form.querySelector('[name="notas"]').value = client.notas || '';

                // Marcar el formulario como edición
                form.setAttribute('data-edit-id', clientId);

                // Cambiar el título del modal
                document.querySelector('#newClientModal h3').textContent = 'Editar Cliente';

                // Mostrar el modal
                document.getElementById('newClientModal').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error al cargar cliente para edición:', error);
            this.showNotification('Error al cargar datos del cliente', 'error');
        }
    }

    async deleteClient(clientId) {
        if (!confirm('¿Está seguro de que desea eliminar este cliente?')) {
            return;
        }

        try {
            await ipcRenderer.invoke('db-delete-client', clientId);
            this.showNotification('Cliente eliminado correctamente', 'success');
            
            // Recargar la lista de clientes
            await this.loadClients();
        } catch (error) {
            console.error('Error al eliminar cliente:', error);
            this.showNotification('Error al eliminar cliente: ' + error.message, 'error');
        }
    }

    // Métodos utilitarios
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('es-ES').format(new Date(date));
    }

    // Método para inicializar datos de demostración
    async initializeDemoData() {
        try {
            // Verificar si ya existen clientes
            const existingClients = await ipcRenderer.invoke('db-get-all-clients');
            
            if (existingClients.length === 0) {
                const demoClients = [
                    {
                        nombre: 'Ricardo García',
                        email: 'ricardo.garcia@example.com',
                        telefono: '555-123-4567',
                        direccion: 'Calle Principal 123',
                        ciudad: 'Madrid',
                        codigo_postal: '28001',
                        nif_cif: '12345678A',
                        notas: 'Cliente de demostración'
                    },
                    {
                        nombre: 'Isabel Fernández',
                        email: 'isabel.fernandez@example.com',
                        telefono: '555-987-6543',
                        direccion: 'Avenida Central 456',
                        ciudad: 'Barcelona',
                        codigo_postal: '08001',
                        nif_cif: '87654321B',
                        notas: 'Cliente frecuente'
                    },
                    {
                        nombre: 'Empresa Demo S.L.',
                        email: 'contacto@empresademo.com',
                        telefono: '555-555-5555',
                        direccion: 'Polígono Industrial 789',
                        ciudad: 'Valencia',
                        codigo_postal: '46001',
                        nif_cif: 'B12345678',
                        notas: 'Cliente corporativo'
                    }
                ];

                for (const clientData of demoClients) {
                    await ipcRenderer.invoke('db-create-client', clientData);
                }

                console.log('Datos de demostración inicializados');
            }

            // Recargar datos
            await this.loadData();

        } catch (error) {
            console.error('Error al inicializar datos de demostración:', error);
            // Fallback al método anterior
            if (this.clients.length === 0) {
                const demoClients = [
                    {
                        id: 1,
                        nombre: 'Ricardo García',
                        email: 'ricardo.garcia@example.com',
                        telefono: '555-123-4567',
                        direccion: 'Calle Principal 123, Ciudad',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 2,
                        nombre: 'Isabel Fernández',
                        email: 'isabel.fernandez@example.com',
                        telefono: '555-987-6543',
                        direccion: 'Avenida Central 456, Pueblo',
                        createdAt: new Date().toISOString()
                    }
                ];

                this.clients = demoClients;
                await ipcRenderer.invoke('save-data', 'clients', this.clients);
            }
        }
    }

    async handleLogout() {
        try {
            if (this.authSystem) {
                await this.authSystem.logout();
            } else {
                // Fallback: limpiar sesión manualmente
                await ipcRenderer.invoke('remove-data', 'currentUser');
                await ipcRenderer.invoke('remove-data', 'userSession');
                this.currentUser = null;
                this.navigateTo('iniciosesion');
            }
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            // Forzar navegación a login incluso si hay error
            this.navigateTo('iniciosesion');
        }
    }
}

// Crear instancia global de la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, iniciando FacturadorApp...');
    window.app = new FacturadorApp();
    
    // Agregar debugging para el registro
    window.app.debugRegister = function() {
        console.log('AuthSystem disponible:', !!this.authSystem);
        console.log('Página actual:', this.currentPage);
        const form = document.querySelector('[data-form-type="register"]');
        console.log('Formulario encontrado:', !!form);
        if (form) {
            console.log('Campos del formulario:', [...form.querySelectorAll('input')].map(i => i.name));
        }
    };
    
    // Inicializar datos de demostración si es necesario
    await window.app.initializeDemoData();
    
    console.log('FacturadorApp inicializado completamente');
});

// Funciones globales para compatibilidad
window.formatCurrency = (amount) => window.app?.formatCurrency(amount) || amount;
window.formatDate = (date) => window.app?.formatDate(date) || date;
