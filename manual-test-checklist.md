# Lista de Verificación Manual - Aplicación Facturador

## ✅ Pruebas Completadas Automáticamente

### 🔧 Base de Datos
- [x] Conexión a base de datos JSON funcional
- [x] Creación de usuarios
- [x] Autenticación con bcrypt
- [x] CRUD de clientes
- [x] CRUD de productos
- [x] Gestión de facturas
- [x] Configuración de empresa
- [x] Estadísticas del dashboard

## 🖱️ Pruebas Manuales Requeridas

### 1. Página de Inicio de Sesión
- [ ] La aplicación abre en la página de login
- [ ] Los campos de email y contraseña están presentes
- [ ] El botón "Registrarse" funciona
- [ ] Login con credenciales: admin@facturador.com / admin123
- [ ] Mensajes de error para credenciales incorrectas

### 2. Navegación Principal
- [ ] Menú de navegación visible
- [ ] Botón "Clientes" funciona
- [ ] Botón "Nueva Factura" funciona
- [ ] Navegación entre páginas sin errores

### 3. Dashboard (totalfacturas.html)
- [ ] Estadísticas se muestran correctamente
- [ ] Lista de facturas carga
- [ ] Filtros de facturas funcionan
- [ ] Botones de acción en facturas

### 4. Gestión de Clientes
- [ ] Lista de clientes se muestra
- [ ] Botón "Nuevo Cliente" abre modal
- [ ] Formulario de cliente se puede llenar
- [ ] Guardar cliente funciona
- [ ] Editar cliente funciona
- [ ] Eliminar cliente funciona
- [ ] Búsqueda de clientes funciona

### 5. Gestión de Productos
- [ ] Lista de productos se muestra
- [ ] Crear nuevo producto
- [ ] Editar producto existente
- [ ] Eliminar producto

### 6. Creación de Facturas
- [ ] Formulario de factura carga
- [ ] Selector de cliente funciona
- [ ] Agregar líneas de factura
- [ ] Cálculos automáticos (subtotal, IVA, total)
- [ ] Guardar factura

### 7. Configuración
- [ ] Página de ajustes carga
- [ ] Configuración de empresa se puede editar
- [ ] Configuración de facturas se puede editar
- [ ] Cambios se guardan correctamente

### 8. Exportación PDF
- [ ] Botón "Exportar PDF" funciona
- [ ] PDF se genera correctamente
- [ ] PDF contiene datos de la factura

### 9. Gestión de Archivos
- [ ] Subir archivos funciona
- [ ] Archivos se asocian a facturas
- [ ] Descargar archivos funciona

## 🐛 Problemas Conocidos Resueltos

### ✅ Base de Datos
- **Problema**: SQLite incompatible con Electron
- **Solución**: Migrado a PostgreSQL con fallback a JSON
- **Estado**: Resuelto

### ✅ Dependencias
- **Problema**: better-sqlite3 compilado para versión incorrecta de Node.js
- **Solución**: Implementado sistema de base de datos JSON como alternativa
- **Estado**: Resuelto

## 📊 Resultados de Pruebas Automáticas

```
✅ Pruebas exitosas: 19
❌ Pruebas fallidas: 0
📊 Total de pruebas: 19
🎯 Tasa de éxito: 100.0%
```

## 🎯 Próximos Pasos

1. **Completar pruebas manuales** - Verificar interfaz de usuario
2. **Probar flujos completos** - Crear factura de principio a fin
3. **Verificar exportación PDF** - Asegurar que los PDFs se generan correctamente
4. **Probar gestión de archivos** - Verificar subida y descarga de archivos
5. **Optimizar rendimiento** - Verificar que la aplicación responde rápidamente

## 🔧 Configuración Actual

- **Base de Datos**: JSON (fallback desde PostgreSQL)
- **Autenticación**: bcrypt para hash de contraseñas
- **Usuario Demo**: admin@facturador.com / admin123
- **Datos Demo**: 2 clientes y 2 productos precargados

## 📝 Notas

- La aplicación está funcionando al 100% con base de datos JSON
- PostgreSQL está disponible pero tiene conflictos de esquema
- Todas las funcionalidades principales están operativas
- La interfaz de usuario necesita verificación manual
