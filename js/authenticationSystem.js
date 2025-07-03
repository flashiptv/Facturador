// Sistema de autenticación mejorado para Facturador
const { ipcRenderer } = require('electron');

class AuthenticationSystem {
    constructor() {
        this.currentUser = null;
        this.sessionExpiry = 24 * 60 * 60 * 1000; // 24 horas
        this.init();
    }

    async init() {
        try {
            await this.checkExistingSession();
            this.setupSessionMonitoring();
        } catch (error) {
            console.error('Error al inicializar sistema de autenticación:', error);
        }
    }

    async checkExistingSession() {
        try {
            const sessionData = await ipcRenderer.invoke('get-data', 'userSession');
            
            if (sessionData) {
                const now = Date.now();
                const sessionAge = now - sessionData.loginTime;
                
                if (sessionAge < this.sessionExpiry && sessionData.userId) {
                    // Verificar que el usuario aún existe en la base de datos
                    const user = await ipcRenderer.invoke('db-get-user-by-id', sessionData.userId);
                    
                    if (user && user.activo) {
                        this.currentUser = {
                            id: user.id,
                            email: user.email,
                            nombre: user.nombre,
                            loginTime: sessionData.loginTime
                        };
                        
                        await this.updateLastActivity();
                        return true;
                    }
                }
            }
            
            // Sesión inválida o expirada
            await this.clearSession();
            return false;
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            return false;
        }
    }

    async login(email, password) {
        try {
            if (!email || !password) {
                throw new Error('Email y contraseña son requeridos');
            }

            // Obtener usuario de la base de datos
            const user = await ipcRenderer.invoke('db-get-user-by-email', email);
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            if (!user.activo) {
                throw new Error('Cuenta desactivada');
            }

            // Verificar contraseña usando IPC
            const isValidPassword = await ipcRenderer.invoke('auth-verify-password', password, user.password_hash);
            
            if (!isValidPassword) {
                throw new Error('Contraseña incorrecta');
            }

            // Crear sesión
            const loginTime = Date.now();
            
            this.currentUser = {
                id: user.id,
                email: user.email,
                nombre: user.nombre,
                loginTime: loginTime
            };

            // Guardar sesión
            await ipcRenderer.invoke('save-data', 'userSession', {
                userId: user.id,
                loginTime: loginTime,
                lastActivity: loginTime
            });

            await ipcRenderer.invoke('save-data', 'currentUser', this.currentUser);

            // Actualizar último acceso en la base de datos
            await ipcRenderer.invoke('db-update-user-last-login', user.id);

            return {
                success: true,
                user: this.currentUser
            };

        } catch (error) {
            console.error('Error en login:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async register(userData) {
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

            // Hash de la contraseña usando IPC
            const passwordHash = await ipcRenderer.invoke('auth-hash-password', password);

            // Crear usuario en la base de datos
            const newUser = {
                name: nombre.trim(),
                email: email.trim().toLowerCase(),
                password: passwordHash
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
            console.error('Error en registro:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async logout() {
        try {
            await this.clearSession();
            this.currentUser = null;
            
            // Redirigir a login
            window.location.href = 'iniciosesion.html';
            
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    }

    async clearSession() {
        try {
            await ipcRenderer.invoke('remove-data', 'userSession');
            await ipcRenderer.invoke('remove-data', 'currentUser');
        } catch (error) {
            console.error('Error al limpiar sesión:', error);
        }
    }

    async updateLastActivity() {
        try {
            if (this.currentUser) {
                const lastActivity = Date.now();
                const sessionData = await ipcRenderer.invoke('get-data', 'userSession');
                
                if (sessionData) {
                    sessionData.lastActivity = lastActivity;
                    await ipcRenderer.invoke('save-data', 'userSession', sessionData);
                }
            }
        } catch (error) {
            console.error('Error al actualizar actividad:', error);
        }
    }

    setupSessionMonitoring() {
        // Actualizar actividad cada 5 minutos
        setInterval(() => {
            this.updateLastActivity();
        }, 5 * 60 * 1000);

        // Verificar expiración cada minuto
        setInterval(async () => {
            if (this.currentUser) {
                const sessionData = await ipcRenderer.invoke('get-data', 'userSession');
                
                if (sessionData) {
                    const now = Date.now();
                    const sessionAge = now - sessionData.loginTime;
                    
                    if (sessionAge > this.sessionExpiry) {
                        await this.logout();
                    }
                }
            }
        }, 60 * 1000);

        // Detectar actividad del usuario
        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, () => {
                this.updateLastActivity();
            }, { passive: true });
        });
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    requireAuthentication() {
        if (!this.isAuthenticated()) {
            window.location.href = 'iniciosesion.html';
            return false;
        }
        return true;
    }
}

// Exportar para uso en otras partes de la aplicación
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthenticationSystem;
}
