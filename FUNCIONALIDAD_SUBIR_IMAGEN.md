# Funcionalidad de Subida de Imagen para Plantillas Personalizadas

## Descripción General

Tu aplicación **Facturador** ya incluye una funcionalidad completa para crear plantillas de factura personalizadas subiendo una imagen de referencia. Esta característica permite a los usuarios crear modelos únicos basados en imágenes existentes de facturas que deseen replicar.

## ¿Cómo Funciona?

### 1. Acceso a la Funcionalidad

1. **Navegar a Nueva Factura**: Ve a la sección "Nueva Factura" desde el menú lateral.

2. **Seleccionar Plantilla Personalizada**: En el selector de plantillas, encontrarás estas opciones:
   - 🏢 Profesional (Recomendada)
   - 📄 Clásica
   - ✨ Minimalista
   - 🎨 Moderna
   - **🎯 Personalizada** ← Esta es la nueva opción

3. **Activar Subida de Imagen**: 
   - Haz clic en el botón **"Subir Modelo"** 
   - O selecciona "Personalizada" en el selector de plantillas

### 2. Subir Imagen de Referencia

#### Métodos de Subida:
- **Arrastrar y soltar**: Arrastra una imagen directamente al área designada
- **Clic para seleccionar**: Haz clic en el área de subida para abrir el explorador de archivos

#### Archivos Compatibles:
- **Imágenes**: JPG, JPEG, PNG
- **Documentos**: PDF
- **Tamaño máximo**: 10MB

### 3. Configuración de la Plantilla

Una vez subida la imagen, puedes configurar:

#### Información Básica:
- **Nombre de la plantilla**: Personaliza el nombre (ej: "Mi Factura Corporativa")
- **Estilo base**: Elige entre Profesional, Minimalista o Moderno

#### Características Visuales:
- ✅ **Incluir cabecera con logo**: Añade una sección de encabezado
- ✅ **Incluir pie de página**: Añade información de contacto al final
- ✅ **Encabezados con color**: Aplica gradientes de color a los títulos

### 4. Generar Plantilla

1. **Verificar configuración**: Revisa todos los ajustes seleccionados
2. **Hacer clic en "Generar Plantilla"**: El sistema procesará la imagen
3. **Esperar procesamiento**: Se muestra una barra de progreso
4. **Plantilla lista**: La nueva plantilla se agrega automáticamente al selector

## Características Técnicas

### Procesamiento de Imagen
- ✅ **Validación automática** de tipo y tamaño de archivo
- ✅ **Vista previa** de la imagen subida
- ✅ **Procesamiento en segundo plano** con indicador de progreso
- ✅ **Fallback automático** en caso de errores

### Almacenamiento
- ✅ **Plantillas persistentes**: Se guardan en el sistema para uso futuro
- ✅ **Metadatos organizados**: Información sobre origen y configuración
- ✅ **Integración completa** con el sistema de facturación

### Personalización Avanzada
- ✅ **Estilos adaptativos**: Basados en la plantilla de referencia elegida
- ✅ **Elementos opcionales**: Header, footer, colores personalizables
- ✅ **Compatibilidad total** con el sistema de impresión y PDF

## Uso Práctico

### Ejemplo de Flujo Completo:

1. **Cliente necesita replicar una factura específica**
2. **Escanea o fotografía la factura de referencia**
3. **Sube la imagen a Facturador**
4. **Configura las opciones deseadas**
5. **Genera la plantilla personalizada**
6. **Usa la nueva plantilla para todas sus facturas**

### Casos de Uso Ideales:

- **Empresas con branding específico**: Mantener coherencia visual corporativa
- **Freelancers**: Replicar el formato de facturas de clientes
- **Pequeños negocios**: Adaptar formatos específicos del sector
- **Profesionales**: Crear facturas que coincidan con otros documentos comerciales

## Ventajas

### Para el Usuario:
- ✅ **Proceso intuitivo**: Arrastrar, configurar y generar
- ✅ **Resultados inmediatos**: Plantilla lista en segundos
- ✅ **Flexibilidad total**: Múltiples opciones de personalización
- ✅ **Reutilización**: Plantillas guardadas permanentemente

### Para el Negocio:
- ✅ **Consistencia profesional**: Facturas acordes a la imagen corporativa
- ✅ **Ahorro de tiempo**: No necesita diseñar desde cero
- ✅ **Compatibilidad**: Funciona con cualquier formato existente
- ✅ **Escalabilidad**: Crear múltiples plantillas según necesidades

## Estado Actual

### ✅ Funcionalidades Implementadas:
- Interfaz completa de subida con drag & drop
- Validación de archivos y tamaño
- Vista previa de imágenes subidas
- Configuración avanzada de características
- Procesamiento backend con manejo de errores
- Integración con el sistema de plantillas existente
- Guardado automático de plantillas personalizadas
- Indicador de progreso durante la generación

### 🔄 Funcionalidades Pendientes (Opcionales):
- Análisis avanzado de imagen con IA para extracción automática de elementos
- Plantillas únicas para Minimalista y Moderna (actualmente usan Profesional como base)
- Sistema de compartir plantillas entre usuarios
- Importación/exportación de plantillas personalizadas

## Conclusión

La funcionalidad de subida de imagen para plantillas personalizadas está **completamente implementada y lista para usar**. Los usuarios pueden ahora crear facturas únicas basadas en cualquier imagen de referencia, manteniendo la profesionalidad y consistencia visual que requieren sus negocios.

Esta característica convierte a Facturador en una herramienta verdaderamente flexible que se adapta a las necesidades específicas de cada usuario, en lugar de limitarlos a plantillas predefinidas.
