const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const SQLiteDatabase = require('./js/sqliteDatabase');
const bcrypt = require('bcryptjs');

// Configuración de almacenamiento
const store = new Store();
let database;
let mainWindow;

// Simple file logger
const logPath = path.join(app.getPath('userData'), 'app.log');
function log(message) {
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
}

log('App starting...');

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
    database = new SQLiteDatabase();
    await database.init();
    log('Database initialized successfully.');
  } catch (error) {
    log(`Error initializing database: ${error}`);
    dialog.showErrorBox('Error de Base de Datos', 'No se pudo inicializar la base de datos. La aplicación se cerrará.');
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

// Handlers para la base de datos SQLite

// Clientes
ipcMain.handle('db-create-client', async (event, clientData) => {
  return await database.createClient(clientData);
});

ipcMain.handle('db-get-all-clients', async () => {
  return await database.getAllClients();
});

ipcMain.handle('db-get-client-by-id', async (event, id) => {
  return await database.getClientById(id);
});

ipcMain.handle('db-update-client', async (event, id, clientData) => {
  return await database.updateClient(id, clientData);
});

ipcMain.handle('db-delete-client', async (event, id) => {
  return await database.deleteClient(id);
});

ipcMain.handle('db-search-clients', async (event, searchTerm) => {
  return await database.searchClients(searchTerm);
});

// Facturas
ipcMain.handle('db-create-invoice', async (event, invoiceData) => {
  return await database.createInvoice(invoiceData);
});

ipcMain.handle('db-get-all-invoices', async () => {
  return await database.getAllInvoices();
});

ipcMain.handle('db-get-invoice-by-id', async (event, id) => {
  return await database.getInvoiceById(id);
});

ipcMain.handle('db-generate-invoice-number', async () => {
  return await database.generateNextInvoiceNumber();
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

// Cerrar base de datos al salir
app.on('before-quit', () => {
  if (database) {
    database.close();
  }
});

module.exports = { mainWindow };
