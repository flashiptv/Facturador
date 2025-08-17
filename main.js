require('dotenv').config();
const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const PostgreSQLDatabase = require('./js/postgresDatabase');
const JSONDatabase = require('./js/jsonDatabase');
const bcrypt = require('bcryptjs');

// Configuración de almacenamiento
const store = new Store();
let database;
let mainWindow;

// Simple file logger
let logPath;
function log(message) {
  if (logPath) {
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
  }
}

// Helper function to add timeout to database operations


// Helper function to add timeout to database operations
function withTimeout(promise, timeoutMs = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    )
  ]);
}

function createWindow() {
  log('Creating main window...');
  // Crear la ventana principal
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  // Cargar la página de inicio de sesión
  mainWindow.loadFile('pages/iniciosesion.html');

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Crear menú de la aplicación
  createMenu();

  // Evento cuando se cierra la ventana
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Nueva Factura',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.loadFile('pages/appfacturas.html');
          }
        },
        {
          label: 'Abrir',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            // Implementar funcionalidad de abrir archivo
          }
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Navegación',
      submenu: [
        {
          label: 'Panel Principal',
          click: () => {
            mainWindow.loadFile('pages/totalfacturas.html');
          }
        },
        {
          label: 'Clientes',
          click: () => {
            mainWindow.loadFile('pages/clientes.html');
          }
        },
        {
          label: 'Nueva Factura',
          click: () => {
            mainWindow.loadFile('pages/appfacturas.html');
          }
        },
        {
          label: 'Subir Archivos',
          click: () => {
            mainWindow.loadFile('pages/subir archivos.html');
          }
        }
      ]
    },
    {
      label: 'Herramientas',
      submenu: [
        {
          label: 'Configuración',
          click: () => {
            // Abrir ventana de configuración
            createSettingsWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Herramientas de Desarrollador',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Acerca de Facturador',
              message: 'Facturador v1.0.0',
              detail: 'Aplicación de facturación para Windows\nDesarrollada por Nick'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createSettingsWindow() {
  const settingsWindow = new BrowserWindow({
    width: 600,
    height: 400,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  settingsWindow.loadFile('pages/configuracion.html');
}

// Eventos de la aplicación
app.whenReady().then(async () => {
  log('App is ready.');
  // Inicializar base de datos
  try {
    // Intentar PostgreSQL primero
    try {
      database = new PostgreSQLDatabase();
      await database.init();
      log('PostgreSQL database initialized successfully.');
    } catch (pgError) {
      log(`PostgreSQL not available: ${pgError.message}`);
      log('Falling back to JSON database...');

      // Fallback a base de datos JSON
      database = new JSONDatabase();
      await database.init();
      log('JSON database initialized successfully.');
    }
  } catch (error) {
    log(`Error initializing any database: ${error}`);
    dialog.showErrorBox('Error de Base de Datos', 'No se pudo inicializar ninguna base de datos. La aplicación se cerrará.');
    app.quit();
    return;
  }
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers para comunicación con renderer
ipcMain.handle('get-app-data', () => {
  return {
    version: app.getVersion(),
    platform: process.platform
  };
});

ipcMain.handle('save-data', (event, key, data) => {
  store.set(key, data);
  return true;
});

ipcMain.handle('get-data', (event, key) => {
  return store.get(key);
});

ipcMain.handle('remove-data', (event, key) => {
  return store.delete(key);
});

ipcMain.handle('navigate-to', (event, page) => {
  mainWindow.loadFile(`pages/${page}.html`);
});

// Handler to get user data path
ipcMain.handle('get-user-data-path', async () => {
  return app.getPath('userData');
});

// Handlers para la base de datos SQLite

// Clientes
ipcMain.handle('db-create-client', async (event, clientData) => {
  return await withTimeout(database.createClient(clientData));
});

ipcMain.handle('db-get-all-clients', async () => {
  return await withTimeout(database.getAllClients());
});

ipcMain.handle('db-get-client-by-id', async (event, id) => {
  return await withTimeout(database.getClientById(id));
});

ipcMain.handle('db-update-client', async (event, id, clientData) => {
  return await withTimeout(database.updateClient(id, clientData));
});

ipcMain.handle('db-delete-client', async (event, id) => {
  return await withTimeout(database.deleteClient(id));
});

ipcMain.handle('db-search-clients', async (event, searchTerm) => {
  return await withTimeout(database.searchClients(searchTerm));
});

// Facturas
ipcMain.handle('db-create-invoice', async (event, invoiceData) => {
  return await withTimeout(database.createInvoice(invoiceData));
});

ipcMain.handle('db-get-all-invoices', async () => {
  return await withTimeout(database.getAllInvoices());
});

ipcMain.handle('db-get-invoice-by-id', async (event, id) => {
  return await withTimeout(database.getInvoiceById(id));
});

ipcMain.handle('db-generate-invoice-number', async () => {
  return await withTimeout(database.generateNextInvoiceNumber());
});

ipcMain.handle('db-get-invoice-lines', async (event, invoiceId) => {
  return await database.getInvoiceLines(invoiceId);
});

ipcMain.handle('db-add-invoice-line', async (event, invoiceId, lineData) => {
  return await database.addInvoiceLine(invoiceId, lineData);
});

ipcMain.handle('db-get-invoices', async () => {
  return await database.getInvoices();
});

ipcMain.handle('db-update-invoice-status', async (event, id, status) => {
  return await database.updateInvoiceStatus(id, status);
});

// Productos
ipcMain.handle('db-create-product', async (event, productData) => {
  return await database.createProduct(productData);
});

ipcMain.handle('db-update-product', async (event, id, productData) => {
  return await database.updateProduct(id, productData);
});

ipcMain.handle('db-delete-product', async (event, id) => {
  return await database.deleteProduct(id);
});

ipcMain.handle('db-get-all-products', async () => {
  return await database.getAllProducts();
});

// Archivos
ipcMain.handle('db-save-file-attachment', async (event, invoiceId, fileName, filePath, fileSize, mimeType) => {
  return await database.saveFileAttachment(invoiceId, fileName, filePath, fileSize, mimeType);
});

ipcMain.handle('db-get-file-attachments', async (event, invoiceId) => {
  return await database.getFileAttachments(invoiceId);
});

ipcMain.handle('db-delete-file-attachment', async (event, id) => {
  return await database.deleteFileAttachment(id);
});

// Estadísticas
ipcMain.handle('db-get-dashboard-stats', async () => {
  return await database.getDashboardStats();
});

// Configuración
ipcMain.handle('db-set-setting', async (event, key, value, category, description) => {
  return await database.setSetting(key, value, category, description);
});

ipcMain.handle('db-get-setting', async (event, key) => {
  return await database.getSetting(key);
});

// Usuarios
ipcMain.handle('db-create-user', async (event, userData) => {
  return await database.createUser(userData);
});

ipcMain.handle('db-get-user-by-email', async (event, email) => {
  return await database.getUserByEmail(email);
});

ipcMain.handle('db-get-user-by-id', async (event, id) => {
  return await database.getUserById(id);
});

ipcMain.handle('db-update-user-last-login', async (event, userId) => {
  return await database.updateUserLastLogin(userId);
});

ipcMain.handle('db-update-user-password', async (event, userId, newPasswordHash) => {
  return await database.updateUserPassword(userId, newPasswordHash);
});

ipcMain.handle('db-deactivate-user', async (event, userId) => {
  return await database.deactivateUser(userId);
});

// Nuevos handlers para gestión de archivos
ipcMain.handle('open-file-externally', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    console.error('Error al abrir archivo externamente:', error);
    throw error;
  }
});

ipcMain.handle('save-file-dialog', async (event, options) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  } catch (error) {
    console.error('Error al mostrar diálogo de guardado:', error);
    throw error;
  }
});

ipcMain.handle('open-file-dialog', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  } catch (error) {
    console.error('Error al mostrar diálogo de apertura:', error);
    throw error;
  }
});

// Handler para logout
ipcMain.handle('auth-logout', async (event) => {
  try {
    // El proceso principal no puede limpiar los datos directamente
    // El proceso renderizador debe hacerlo después de recibir confirmación
    return { success: true };
  } catch (error) {
    console.error('Error en logout:', error);
    throw error;
  }
});

// Handlers para autenticación con bcrypt
ipcMain.handle('auth-hash-password', async (event, password) => {
  try {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    console.error('Error al hashear contraseña:', error);
    throw error;
  }
});

ipcMain.handle('auth-verify-password', async (event, password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error al verificar contraseña:', error);
    throw error;
  }
});

// Settings handlers
ipcMain.handle('save-company-settings', async (event, companyData) => {
  try {
    log('Saving company settings: ' + JSON.stringify(companyData));
    
    const result = await withTimeout(database.saveCompanySettings(companyData));
    return { success: true };
    
  } catch (error) {
    log('Error saving company settings: ' + error.message);
    console.error('Error al guardar configuración de empresa:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

ipcMain.handle('save-invoice-settings', async (event, invoiceSettings) => {
  try {
    log('Saving invoice settings: ' + JSON.stringify(invoiceSettings));
    
    const result = await withTimeout(database.saveInvoiceSettings(invoiceSettings));
    return { success: true };
    
  } catch (error) {
    log('Error saving invoice settings: ' + error.message);
    console.error('Error al guardar configuración de facturas:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

ipcMain.handle('get-app-settings', async () => {
  try {
    return await withTimeout(database.getAppSettings());
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return {};
  }
});

// Alias para compatibilidad con el código existente
ipcMain.handle('db-get-settings', async () => {
  try {
    return await database.getAppSettings();
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return {};
  }
});

ipcMain.handle('update-user-profile', async (event, userId, profileData) => {
  try {
    const result = await database.updateUserProfile(userId, profileData);
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('change-user-password', async (event, data) => {
  try {
    // Verify current password first
    const user = await database.getUserById(data.userId);
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }
    
    const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return { success: false, error: 'Contraseña actual incorrecta' };
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);
    
    // Update password
    await database.updateUserPassword(data.userId, hashedNewPassword);
    return { success: true };
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-app-data', async () => {
  try {
    // Implementation for data export would go here
    return { success: true };
  } catch (error) {
    console.error('Error al exportar datos:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-app-cache', async () => {
  try {
    // Implementation for cache clearing would go here
    return { success: true };
  } catch (error) {
    console.error('Error al limpiar caché:', error);
    return { success: false, error: error.message };
  }
});

// Handler para generar plantillas personalizadas
ipcMain.handle('generate-custom-template', async (event, templateData) => {
  try {
    log('Generating custom template with data: ' + JSON.stringify(templateData));
    
    const { fileName, fileType, templateName, baseStyle, options } = templateData;
    
    // Crear un ID único para la plantilla
    const templateId = `factura-custom-${Date.now()}`;
    
    // Obtener la plantilla base
    let baseTemplateFile = 'factura-profesional.html';
    switch (baseStyle) {
      case 'minimalista':
        baseTemplateFile = 'factura-profesional.html'; // Por ahora todas usan la misma
        break;
      case 'moderno':
        baseTemplateFile = 'factura-profesional.html';
        break;
      default:
        baseTemplateFile = 'factura-profesional.html';
    }

    // Leer la plantilla base
    let baseTemplatePath;
    if (process.env.NODE_ENV === 'development' || !process.resourcesPath) {
      baseTemplatePath = path.join(__dirname, 'templates', baseTemplateFile);
    } else {
      // In packaged app
      baseTemplatePath = path.join(process.resourcesPath, 'app.asar', 'templates', baseTemplateFile);
    }
    
    let templateContent;
    try {
      templateContent = fs.readFileSync(baseTemplatePath, 'utf-8');
    } catch (error) {
      console.error('Error reading base template:', error);
      // Fallback to a basic template content
      templateContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Factura</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; }
        .content { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{EMPRESA_NOMBRE}}</h1>
    </div>
    <div class="content">
        <p>Factura personalizada generada</p>
        <p>Cliente: {{CLIENTE_NOMBRE}}</p>
        <p>Total: {{TOTAL}}</p>
    </div>
</body>
</html>`;
    }

    // Personalizar la plantilla basada en las opciones
    if (options.coloredHeaders) {
      // Agregar estilos para encabezados con color
      templateContent = templateContent.replace(
        '</style>',
        `
        .colored-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 10px;
        }
        .colored-table-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        </style>`
      );

      // Aplicar clases a los encabezados
      templateContent = templateContent.replace(
        '<h1 class="invoice-title">',
        '<h1 class="invoice-title colored-header">'
      );
      
      templateContent = templateContent.replace(
        '<thead>',
        '<thead class="colored-table-header">'
      );
    }

    if (!options.includeHeader) {
      // Remover la sección del header
      templateContent = templateContent.replace(
        /<div class="header">.*?<\/div>/s,
        ''
      );
    }

    if (!options.includeFooter) {
      // Remover la sección del footer
      templateContent = templateContent.replace(
        /<div class="footer">.*?<\/div>/s,
        ''
      );
    }

    // Agregar comentario identificativo
    templateContent = templateContent.replace(
      '<!-- Plantilla de Factura -->',
      `<!-- Plantilla Personalizada: ${templateName} -->\n<!-- Basada en: ${baseStyle} -->\n<!-- Generada desde: ${fileName} -->`
    );

    // Guardar la nueva plantilla en el directorio de datos del usuario (writable)
    const userDataPath = app.getPath('userData');
    const customTemplatesDir = path.join(userDataPath, 'custom-templates');
    
    // Crear directorio si no existe
    if (!fs.existsSync(customTemplatesDir)) {
      fs.mkdirSync(customTemplatesDir, { recursive: true });
    }
    
    const customTemplatePath = path.join(customTemplatesDir, `${templateId}.html`);
    fs.writeFileSync(customTemplatePath, templateContent, 'utf-8');

    // Guardar metadatos de la plantilla en el mismo directorio
    const metadataPath = path.join(customTemplatesDir, `${templateId}.json`);
    const metadata = {
      id: templateId,
      name: templateName,
      baseStyle: baseStyle,
      createdAt: new Date().toISOString(),
      sourceFile: fileName,
      options: options
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    log(`Custom template created successfully: ${templateId}`);
    
    return {
      success: true,
      templateId: templateId,
      templateName: templateName,
      message: 'Plantilla personalizada creada exitosamente'
    };

  } catch (error) {
    log('Error generating custom template: ' + error.message);
    console.error('Error al generar plantilla personalizada:', error);
    return {
      success: false,
      message: error.message
    };
  }
});

// Cerrar base de datos al salir
app.on('before-quit', () => {
  if (database) {
    database.close();
  }
});

module.exports = { mainWindow };
