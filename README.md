# Facturador - Sistema de Facturación para Windows

Una aplicación nativa de Windows desarrollada con Electron para la gestión completa de facturas, clientes y archivos.

## 🚀 Características Principales

### ✅ Completado
- **Aplicación Nativa**: Aplicación de escritorio para Windows con Electron
- **Autenticación**: Sistema de login y registro con encriptación de contraseñas
- **Gestión de Clientes**: CRUD completo de clientes con búsqueda y validación
- **Facturación Avanzada**: 
  - Creación de facturas con múltiples líneas de productos
  - Cálculo automático de subtotales, IVA y totales
  - Estados de factura (borrador, enviada, pagada, vencida, cancelada)
  - Selección de cliente desde base de datos
- **Dashboard Interactivo**: 
  - Estadísticas en tiempo real
  - Lista de facturas con filtros y búsqueda
  - Vista por estado (todas, pendientes, pagadas, vencidas)
- **Base de Datos SQLite**: 
  - Almacenamiento persistente y confiable
  - Tablas optimizadas con índices
  - Respaldo automático de datos
- **Gestión de Archivos**: 
  - Subida de archivos con drag & drop
  - Previsualización de documentos
  - Asociación de archivos a facturas
- **Exportación a PDF**: 
  - Generación de facturas en PDF profesional
  - Plantilla moderna y personalizable
  - Apertura automática de carpeta de destino
- **UI/UX Moderna**: 
  - Interfaz nativa con Tailwind CSS
  - Notificaciones informativas
  - Navegación fluida entre páginas
  - Validación de formularios en tiempo real

### 🔧 Tecnologías Utilizadas
- **Frontend**: HTML5, CSS3, JavaScript ES6+, Tailwind CSS
- **Backend**: Node.js, Electron
- **Base de Datos**: SQLite3
- **Seguridad**: bcrypt para encriptación de contraseñas
- **PDF**: Puppeteer para generación de PDFs
- **Build**: electron-builder para instaladores

## 📦 Instalación y Configuración

1. **Instalar Node.js**
   - Descargar desde [nodejs.org](https://nodejs.org/)
   - Verificar instalación: `node --version` y `npm --version`

2. **Instalar dependencias**
   ```bash
   cd "C:\Users\Nick\Documents\Facturador"
   npm install
   ```

3. **Ejecutar la aplicación**
   ```bash
   npm start
   ```

## Compilar para Distribución

1. **Crear instalador ejecutable**
   ```bash
   npm run build
   ```

2. **El archivo .exe se generará en la carpeta `dist/`**

## Características Principales

- ✅ **Autenticación de usuarios**
- ✅ **Gestión de clientes**
- ✅ **Creación de facturas**
- ✅ **Base de datos local**
- ✅ **Interfaz moderna**
- ✅ **Menús nativos de Windows**
- ✅ **Almacenamiento seguro**

## Estructura del Proyecto

```
Facturador/
├── main.js              # Proceso principal de Electron
├── package.json         # Configuración del proyecto
├── pages/              # Páginas HTML
│   ├── iniciosesion.html
│   ├── registro.html
│   ├── appfacturas.html
│   ├── clientes.html
│   └── totalfacturas.html
├── js/                 # Scripts JavaScript
│   ├── app.js          # Lógica principal
│   └── database.js     # Gestión de datos
└── assets/             # Recursos (iconos, imágenes)
```

## Funcionalidades Implementadas

### Sistema de Autenticación
- Registro de nuevos usuarios
- Inicio de sesión
- Validación de credenciales

### Gestión de Clientes
- Agregar nuevos clientes
- Listar clientes existentes
- Buscar clientes

### Facturación
- Crear nuevas facturas
- Generar números de factura automáticos
- Calcular totales e impuestos

### Base de Datos
- Almacenamiento local seguro
- Respaldo automático
- Datos persistentes

## Comandos Disponibles

- `npm start` - Ejecutar aplicación en modo desarrollo
- `npm run dev` - Ejecutar con herramientas de desarrollo
- `npm run build` - Crear instalador para distribución

## Próximas Funcionalidades

- [ ] Generación de PDF
- [ ] Exportar a Excel
- [ ] Envío por email
- [ ] Reportes y estadísticas
- [ ] Respaldo en la nube
- [ ] Plantillas personalizables

## Soporte

Para soporte técnico o reportar problemas, contactar al desarrollador.

## Licencia

MIT License - Ver archivo LICENSE para más detalles.
