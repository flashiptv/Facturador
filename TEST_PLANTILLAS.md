# Test del Sistema de Selección de Plantillas

## Funcionalidades Implementadas

### ✅ Selector de Plantillas en Nueva Factura
- Dropdown con 4 opciones de plantilla
- Vista previa de información de cada plantilla
- Botón de vista previa del diseño

### ✅ Plantillas Disponibles
1. **🏢 Profesional (Recomendada)** - `factura-profesional.html`
2. **📄 Clásica** - `factura-template.html`  
3. **✨ Minimalista** - Usa `factura-profesional.html` (placeholder)
4. **🎨 Moderna** - Usa `factura-profesional.html` (placeholder)

### ✅ Integración Completa
- FacturaTemplateManager actualizado para recibir nombre de plantilla
- PDFExporter actualizado para usar plantilla seleccionada
- InvoicePreviewManager preparado para diferentes plantillas
- Métodos de exportación e impresión usan plantilla seleccionada

## Cómo Usar

### 1. Seleccionar Plantilla
```
1. Ir a "Nueva Factura"
2. En la sección "Modelo de Factura", usar el dropdown
3. Seleccionar la plantilla deseada
4. Hacer clic en "Vista Previa" para ver información
```

### 2. Vista Previa con Plantilla
```
1. Completar datos de cliente y productos
2. Hacer clic en "Vista Previa" 
3. Se abrirá modal con la plantilla seleccionada
```

### 3. Exportación
```
- PDF: Usa la plantilla seleccionada
- Impresión: Usa la plantilla seleccionada
- HTML: Usa la plantilla seleccionada
```

## Archivos Modificados

### Frontend
- `pages/appfacturas.html`: Selector de plantillas y métodos

### Backend  
- `js/facturaTemplateManager.js`: Soporte para múltiples plantillas
- `js/pdfExporter.js`: Parámetro de plantilla en métodos
- `js/invoicePreviewManager.js`: Preparado para plantillas

## Estado de Plantillas

### Disponibles Inmediatamente
- ✅ **Profesional**: Completamente funcional
- ✅ **Clásica**: Usa factura-template.html existente

### Pendientes de Desarrollo
- 🔄 **Minimalista**: Necesita archivo HTML específico
- 🔄 **Moderna**: Necesita archivo HTML específico

## Próximos Pasos

### Para Plantillas Adicionales
1. Crear `factura-minimalista.html` en `/templates/`
2. Crear `factura-moderna.html` en `/templates/`
3. Actualizar `getTemplateInfo()` con rutas correctas

### Para Personalización
1. Modificar estilos CSS en cada plantilla
2. Agregar campos específicos por plantilla
3. Implementar preview visual en tiempo real

## Test Manual Recomendado

```
1. Abrir aplicación
2. Ir a "Nueva Factura"
3. Verificar selector de plantillas aparece
4. Cambiar entre diferentes plantillas
5. Hacer clic en "Vista Previa" del selector
6. Completar una factura de prueba
7. Probar "Vista Previa" de factura completa
8. Exportar PDF y verificar plantilla correcta
```

La funcionalidad está lista para uso básico con las plantillas Profesional y Clásica.
