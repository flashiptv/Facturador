# Guía: Selección de Modelos de Factura

## 📋 **Cómo Seleccionar el Modelo de Factura**

### 🎯 **Ubicación del Selector**

El selector de plantillas se encuentra en la página **"Nueva Factura"**:

1. **Ir a:** Nueva Factura
2. **Ubicación:** Justo debajo del encabezado, antes del formulario de factura
3. **Sección:** "Modelo de Factura"

### 🖼️ **Interfaz del Selector**

```
┌─────────────────────────────────────────────────────────────┐
│ 🏢 Modelo de Factura                                        │
│ Selecciona el diseño de plantilla para tu factura          │
│                                                             │
│ Plantilla: [🏢 Profesional (Recomendada) ▼] [👁 Vista Previa] │
│                                                             │
│ ┌─ Vista Previa ──────────────────────────────────────────┐ │
│ │ [📄] Plantilla Profesional                              │ │
│ │ Diseño elegante con cabecera empresarial...             │ │
│ │ ✓ Optimizada A4  ✓ Impresión  ✓ PDF                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 📄 **Modelos Disponibles**

#### 1. **🏢 Profesional (Recomendada)**
- **Archivo:** `factura-profesional.html`
- **Descripción:** Diseño elegante con cabecera empresarial, tablas organizadas y pie de página profesional
- **Ideal para:** Empresas y profesionales
- **Características:**
  - ✅ Tablas con fondo gris claro
  - ✅ Texto negro para impresión
  - ✅ Márgenes A4 optimizados
  - ✅ Diseño sobrio y elegante

#### 2. **📄 Clásica**
- **Archivo:** `factura-template.html`
- **Descripción:** Diseño tradicional y limpio, perfecto para uso general
- **Ideal para:** Uso general y tradicional
- **Características:**
  - ✅ Diseño simple y funcional
  - ✅ Elementos esenciales
  - ✅ Compatible con impresión

#### 3. **✨ Minimalista**
- **Archivo:** `factura-profesional.html` (variante)
- **Descripción:** Diseño simple y limpio con elementos esenciales
- **Ideal para:** Freelancers y pequeños negocios
- **Estado:** En desarrollo (usa plantilla profesional)

#### 4. **🎨 Moderna**
- **Archivo:** `factura-profesional.html` (variante)
- **Descripción:** Diseño contemporáneo con elementos visuales atractivos
- **Ideal para:** Empresas creativas y startups
- **Estado:** En desarrollo (usa plantilla profesional)

## 🔧 **Cómo Usar el Selector**

### Paso 1: Seleccionar Plantilla
1. En "Nueva Factura", localiza la sección "Modelo de Factura"
2. Haz clic en el desplegable "Plantilla"
3. Selecciona el modelo deseado

### Paso 2: Vista Previa (Opcional)
1. Haz clic en el botón **"👁 Vista Previa"**
2. Se mostrará una descripción de la plantilla seleccionada
3. Incluye características y detalles del diseño

### Paso 3: Crear Factura
1. Completa el formulario de factura normalmente
2. La plantilla seleccionada se aplicará automáticamente
3. Usa los botones de acción:
   - **Vista Previa:** Ver la factura con el diseño aplicado
   - **Imprimir:** Abrir para impresión directa
   - **PDF:** Generar archivo con la plantilla

## 🎛️ **Funcionalidades del Sistema**

### Cambio Dinámico
- ✅ **Selección en tiempo real:** Cambios se aplican inmediatamente
- ✅ **Vista previa integrada:** Descripción y características
- ✅ **Persistencia:** La selección se mantiene durante la sesión

### Compatibilidad
- ✅ **Todas las funciones:** Vista previa, impresión, PDF
- ✅ **Datos dinámicos:** Placeholders automáticos
- ✅ **Configuración empresa:** Datos desde ajustes

## 📁 **Estructura Técnica**

### Archivos de Plantillas
```
templates/
├── factura-profesional.html      ← Plantilla principal
├── factura-template.html         ← Plantilla clásica
├── factura-ejemplo-completo.html ← Ejemplo con datos
└── factura-ejemplo.html          ← Ejemplo clásico
```

### JavaScript Responsable
- **`InvoiceManager`:** Maneja la selección en la interfaz
- **`FacturaTemplateManager`:** Procesa las plantillas
- **`PDFExporter`:** Genera archivos con plantilla seleccionada
- **`InvoicePreviewManager`:** Vista previa con plantilla

## 🔄 **Flujo de Funcionamiento**

```
1. Usuario selecciona plantilla ↓
2. JavaScript actualiza selectedTemplate ↓
3. Vista previa muestra información ↓
4. Usuario completa factura ↓
5. Al generar: se usa plantilla seleccionada ↓
6. Resultado: PDF/HTML con diseño aplicado
```

## ⚙️ **Configuración Técnica**

### Valores del Selector
```javascript
'factura-profesional'  → Plantilla Profesional
'factura-template'     → Plantilla Clásica  
'factura-minimalista'  → Plantilla Minimalista
'factura-moderna'      → Plantilla Moderna
```

### Método de Selección
```javascript
// En InvoiceManager
this.selectedTemplate = 'factura-profesional'; // Por defecto

// Al cambiar
document.getElementById('templateSelect').addEventListener('change', (e) => {
    this.selectedTemplate = e.target.value;
    this.updateTemplatePreview();
});
```

## 🚀 **Funcionalidades Avanzadas**

### Desarrollo Futuro
- **Más plantillas:** Diseños adicionales según necesidades
- **Personalización:** Editor visual de plantillas
- **Presets por cliente:** Plantilla automática por tipo de cliente
- **Temas de color:** Variaciones de color para cada plantilla

### Extensibilidad
El sistema está diseñado para agregar fácilmente nuevas plantillas:

1. **Crear archivo HTML** en `/templates/`
2. **Agregar opción** en el selector
3. **Definir características** en `getTemplateInfo()`
4. **Listo** para usar

## 📝 **Notas Importantes**

### Estado Actual
- ✅ **Selector funcional:** Interfaz completa implementada
- ✅ **Plantilla profesional:** Totalmente funcional
- ✅ **Plantilla clásica:** Disponible como alternativa
- 🔄 **Plantillas adicionales:** En desarrollo (usan profesional como base)

### Recomendaciones
- **Usar "Profesional"** para la mayoría de casos
- **Probar vista previa** antes de generar facturas finales
- **Verificar impresión** en cada plantilla según tus necesidades

¡El selector de plantillas está completamente integrado y listo para usar! 🎉
