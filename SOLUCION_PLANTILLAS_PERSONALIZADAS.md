# Corrección del Error ENOENT de Plantillas Personalizadas
**Facturador - Sistema de Facturación Profesional**
*Fecha: 8 de julio, 2025*

## Problema Identificado

### Error Original
```
Uncaught Error: ENOENT, templates\factura-custom-1751922782268.html not found in C:\Users\Nick\AppData\Local\Temp\2zYyNq9qF6KyfdQiGaLdBy1ENvP\resources\app.asar
    at appfacturas.html:1564:23
```

### Causa Raíz
Las plantillas personalizadas se estaban guardando dentro del directorio `templates` de la aplicación, que en una aplicación empaquetada está dentro del archivo `app.asar` (read-only). Cuando la aplicación intentaba acceder a estas plantillas posteriormente, no podía encontrarlas porque:

1. **En desarrollo:** Las plantillas se guardaban en `./templates/` y funcionaban correctamente
2. **En producción:** El directorio `templates` está dentro de `app.asar` (read-only), por lo que las plantillas personalizadas no se podían crear ni acceder

## Solución Implementada

### 1. Cambio de Ubicación de Plantillas Personalizadas

**Archivo:** `main.js`
- **Antes:** `path.join(__dirname, 'templates', templateId + '.html')`
- **Después:** `path.join(userDataPath, 'custom-templates', templateId + '.html')`

```javascript
// Guardar la nueva plantilla en el directorio de datos del usuario (writable)
const { app } = require('electron');
const userDataPath = app.getPath('userData');
const customTemplatesDir = path.join(userDataPath, 'custom-templates');

// Crear directorio si no existe
if (!fs.existsSync(customTemplatesDir)) {
  fs.mkdirSync(customTemplatesDir, { recursive: true });
}

const customTemplatePath = path.join(customTemplatesDir, `${templateId}.html`);
fs.writeFileSync(customTemplatePath, templateContent, 'utf-8');
```

### 2. Mejora del Sistema de Carga de Plantillas

**Archivo:** `js/facturaTemplateManager.js`

#### Método `loadCustomTemplates()` Actualizado:
- Ahora es `async` para manejar la comunicación IPC
- Busca plantillas en dos ubicaciones:
  1. **Legacy:** `./templates/` (para compatibilidad con versiones anteriores)
  2. **Nuevo:** `{userData}/custom-templates/` (ubicación principal)

```javascript
async loadCustomTemplates() {
    // ... existing code ...
    
    // Buscar plantillas personalizadas en el directorio de datos del usuario
    try {
        const { ipcRenderer } = require('electron');
        if (ipcRenderer) {
            const userDataPath = await ipcRenderer.invoke('get-user-data-path');
            const customTemplatesDir = path.join(userDataPath, 'custom-templates');
            
            if (fs.existsSync(customTemplatesDir)) {
                const customFiles = fs.readdirSync(customTemplatesDir);
                // ... proceso de carga ...
            }
        }
    } catch (error) {
        console.log('Could not load custom templates from userData (renderer context):', error.message);
        // This is expected in main process context
    }
}
```

#### Método `templateExists()` Mejorado:
- Verifica plantillas personalizadas en `userData` primero
- Fallback a ubicaciones legacy
- Manejo específico para plantillas por defecto vs. personalizadas

```javascript
templateExists(templateName) {
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
        // ... fallback logic ...
    }
    // ... rest of method ...
}
```

#### Método `generarFacturaHTML()` Actualizado:
- Ahora es `async` para soportar la carga de plantillas personalizadas
- Lógica de lectura diferenciada para plantillas personalizadas vs. por defecto

```javascript
async generarFacturaHTML(datosFactura, templateName = 'factura-profesional.html') {
    // Recargar plantillas personalizadas
    await this.loadCustomTemplates();
    
    // ... verificaciones ...
    
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
    }
    // ... rest of method ...
}
```

### 3. Nuevo Handler IPC

**Archivo:** `main.js`
```javascript
// Handler to get user data path
ipcMain.handle('get-user-data-path', async () => {
  return app.getPath('userData');
});
```

### 4. Actualización de Métodos Dependientes

**Archivo:** `js/pdfExporter.js`
- Métodos que usan `generarFacturaHTML()` actualizados para manejar `async/await`

```javascript
// Antes
const htmlContent = this.templateManager.generarFacturaHTML(sampleData);

// Después  
const htmlContent = await this.templateManager.generarFacturaHTML(sampleData);
```

## Ubicaciones de Archivos

### Estructura Anterior (Problemática)
```
Facturador/
├── templates/
│   ├── factura-profesional.html
│   ├── factura-custom-123456.html ❌ (Read-only en producción)
│   └── factura-custom-123456.json ❌ (Read-only en producción)
```

### Estructura Nueva (Solucionada)
```
Facturador/
├── templates/
│   └── factura-profesional.html (plantillas por defecto)

{UserData}/Facturador/
├── custom-templates/
│   ├── factura-custom-123456.html ✅ (Writable)
│   └── factura-custom-123456.json ✅ (Writable)
├── database/
│   └── facturador.db
└── exports/
    └── facturas_generadas.pdf
```

### Ubicaciones por SO:
- **Windows:** `C:\Users\{username}\AppData\Roaming\Facturador\custom-templates\`
- **macOS:** `~/Library/Application Support/Facturador/custom-templates/`
- **Linux:** `~/.config/Facturador/custom-templates/`

## Beneficios de la Solución

### ✅ **Compatibilidad Total**
- Funciona tanto en desarrollo como en aplicaciones empaquetadas
- Mantiene compatibilidad con plantillas legacy existentes

### ✅ **Persistencia Segura**
- Las plantillas personalizadas se guardan en ubicación writable
- Superviven a actualizaciones de la aplicación

### ✅ **Separación de Responsabilidades**
- Plantillas por defecto: dentro de la aplicación (read-only)
- Plantillas personalizadas: en userData (writable)

### ✅ **Manejo Robusto de Errores**
- Fallbacks automáticos si plantillas no se encuentran
- Mensajes informativos para debugging

### ✅ **Detección Automática del Entorno**
- Rutas dinámicas que se adaptan al contexto de ejecución
- Sin configuración manual requerida

## Archivos Modificados

1. **`main.js`:**
   - Handler `generate-custom-template` actualizado
   - Nuevo handler `get-user-data-path`
   - Cambio de ubicación de guardado de plantillas

2. **`js/facturaTemplateManager.js`:**
   - Método `loadCustomTemplates()` → `async`
   - Método `templateExists()` mejorado
   - Método `generarFacturaHTML()` → `async`
   - Lógica dual para plantillas por defecto vs. personalizadas

3. **`js/pdfExporter.js`:**
   - Llamadas a `generarFacturaHTML()` actualizadas con `await`
   - Métodos que usan plantillas ahora son `async`

## Resultado

✅ **Error ENOENT completamente resuelto**
✅ **Plantillas personalizadas funcionan en aplicaciones empaquetadas**
✅ **Backwards compatibility mantenida**
✅ **Sistema robusto con fallbacks automáticos**

---

**Estado:** Implementado y verificado en build `Facturador 1.0.0.exe`
