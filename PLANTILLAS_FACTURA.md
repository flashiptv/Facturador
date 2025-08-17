# Plantillas de Factura Profesional

## Descripción

Este sistema incluye plantillas de factura profesionales en HTML y CSS optimizadas para impresión y exportación a PDF. Las plantillas están diseñadas con un estilo moderno y sobrio, con tablas de fondo gris claro, texto negro y márgenes apropiados para tamaño A4.

## Archivos Incluidos

### Plantillas HTML

1. **`templates/factura-profesional.html`** - Plantilla principal con placeholders dinámicos
2. **`templates/factura-ejemplo-completo.html`** - Ejemplo con datos reales para referencia visual

### Archivos JavaScript

1. **`js/facturaTemplateManager.js`** - Gestor de plantillas con utilidades para generar facturas
2. **`js/pdfExporter.js`** - Exportador actualizado que usa las nuevas plantillas
3. **`js/invoicePreviewManager.js`** - Gestor de vista previa e impresión de facturas

## Características de la Plantilla

### Diseño Profesional
- **Título prominente**: "FACTURA" en la parte superior
- **Información del emisor**: Nombre, dirección, N.I.F., teléfono en sección destacada
- **Tabla de información**: FECHA, FACTURA, N.I.F., TELÉFONO, EMAIL, PÁG.
- **Tabla de productos**: DESCRIPCIÓN, UNIDAD, PRECIO, IMPORTE
- **Resumen de totales**: BASE IMPONIBLE, IVA, TOTAL
- **Pie de página**: Información de pago

### Estilos
- **Colores**: Paleta sobria con grises y azules profesionales
- **Tipografía**: Arial, fuente limpia y legible
- **Tablas**: Fondos grises claros (#f8f9fa, #ecf0f1) con bordes definidos
- **Impresión**: Optimizada para tamaño A4 con márgenes de 20mm

### Placeholders Dinámicos

La plantilla utiliza el sistema de placeholders `{{variable}}` para reemplazar datos dinámicamente:

#### Información del Emisor
- `{{nombreEmisor}}`
- `{{direccionEmisor}}`
- `{{nifEmisor}}`
- `{{telefonoEmisor}}`
- `{{emailEmisor}}`

#### Información de la Factura
- `{{numeroFactura}}`
- `{{fechaFactura}}`
- `{{numeroPagina}}`

#### Información del Cliente
- `{{nombreCliente}}`
- `{{direccionCliente}}`
- `{{nifCliente}}`
- `{{telefonoCliente}}`
- `{{emailCliente}}`

#### Productos/Servicios
- `{{producto1Descripcion}}`, `{{producto2Descripcion}}`, `{{producto3Descripcion}}`
- `{{producto1Cantidad}}`, `{{producto2Cantidad}}`, `{{producto3Cantidad}}`
- `{{producto1Precio}}`, `{{producto2Precio}}`, `{{producto3Precio}}`
- `{{producto1Importe}}`, `{{producto2Importe}}`, `{{producto3Importe}}`

#### Totales
- `{{baseImponible}}`
- `{{porcentajeIva}}`
- `{{importeIva}}`
- `{{totalFactura}}`

## Uso en la Aplicación

### Vista Previa de Facturas

```javascript
// Mostrar vista previa de una factura
await window.invoicePreview.showInvoicePreview(facturaId);
```

### Impresión Directa

```javascript
// Abrir factura para impresión
await window.invoicePreview.printInvoice(facturaId);
```

### Exportación

```javascript
// Exportar como HTML
await window.invoicePreview.downloadHTML(facturaId);

// Exportar como PDF
await window.invoicePreview.downloadPDF(facturaId);
```

### Generar con Plantilla

```javascript
const templateManager = new FacturaTemplateManager();

// Datos de ejemplo
const datosFactura = {
  emisor: {
    nombre: 'MI EMPRESA S.L.',
    direccion: 'Calle Principal, 123 - 28001 Madrid',
    nif: 'B12345678',
    telefono: '+34 915 123 456',
    email: 'facturacion@miempresa.es'
  },
  factura: {
    numero: 'F2024-001',
    fecha: new Date(),
    pagina: '1 de 1'
  },
  cliente: {
    nombre: 'Cliente Ejemplo S.A.',
    direccion: 'Avenida Ejemplo, 456',
    nif: 'A87654321',
    telefono: '+34 954 987 654',
    email: 'cliente@ejemplo.com'
  },
  productos: [
    {
      descripcion: 'Producto 1',
      cantidad: 2,
      precio: 150.00,
      importe: 300.00
    }
  ],
  totales: {
    baseImponible: 300.00,
    porcentajeIva: 21,
    importeIva: 63.00,
    total: 363.00
  }
};

// Generar HTML
const htmlFactura = templateManager.generarFacturaHTML(datosFactura);
```

## Funciones de Utilidad

### FacturaTemplateManager

- `generarFacturaHTML(datos)` - Genera HTML completo con datos
- `reemplazarPlaceholders(template, datos)` - Reemplaza placeholders
- `calcularTotales(productos, iva)` - Calcula totales automáticamente
- `formatearFecha(fecha)` - Formatea fechas al estilo español
- `formatearMoneda(cantidad)` - Formatea números como moneda
- `generarDatosEjemplo()` - Genera datos de ejemplo para pruebas

### InvoicePreviewManager

- `showInvoicePreview(id)` - Muestra vista previa en modal
- `printInvoice(id)` - Abre para impresión
- `downloadHTML(id)` - Descarga como HTML
- `downloadPDF(id)` - Descarga como PDF

## Personalización

### Modificar Estilos

Para personalizar los estilos, edita las secciones CSS en `factura-profesional.html`:

```css
/* Cambiar colores principales */
.factura-titulo {
    color: #2c3e50; /* Cambiar color del título */
}

.info-factura th,
.tabla-productos th {
    background-color: #34495e; /* Cambiar color de encabezados */
}

/* Cambiar fondos de tablas */
.info-factura {
    background-color: #ecf0f1; /* Color de fondo de tabla de info */
}
```

### Agregar Campos

Para agregar nuevos campos dinámicos:

1. Agregar placeholder en la plantilla HTML: `{{nuevoCampo}}`
2. Actualizar `reemplazarPlaceholders()` en `facturaTemplateManager.js`
3. Incluir el campo en la estructura de datos

### Cambiar Pie de Página

Modificar la sección `.pie-pagina` en la plantilla:

```html
<div class="pie-pagina">
    <p><strong>Forma de pago:</strong> {{formaPago}}</p>
    <p>{{mensajeAdicional}}</p>
</div>
```

## Integración con la Aplicación

Las plantillas están completamente integradas con:

- ✅ Sistema de autenticación
- ✅ Base de datos SQLite
- ✅ Gestión de clientes y productos
- ✅ Cálculos automáticos de IVA
- ✅ Exportación PDF con Puppeteer
- ✅ Vista previa en modal responsiva
- ✅ Impresión directa desde navegador

## Archivos de Configuración

La información del emisor se obtiene automáticamente de la configuración de la aplicación almacenada en la base de datos (tabla `settings`).

## Compatibilidad

- ✅ Navegadores modernos (Chrome, Firefox, Safari, Edge)
- ✅ Impresión en tamaño A4
- ✅ Exportación PDF
- ✅ Responsive design para vista previa
- ✅ Caracteres especiales y acentos españoles

## Notas Técnicas

- Las plantillas usan charset UTF-8 para caracteres españoles
- Estilos optimizados para impresión con `@media print`
- Márgenes configurados para impresión A4 estándar
- Colores contrastantes para legibilidad en impresión
- Fallback de fuentes para compatibilidad máxima
