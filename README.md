# 💳 Límite Real

**Saber cuánto podés gastar HOY con tu tarjeta sin pasarte**

Aplicación móvil simple y fácil de usar que permite mantener el control del consumo con tarjeta de crédito, con integración de WhatsApp Web como interfaz principal.

## 🎯 Características

- **Un solo número importante**: El foco está en cuánto podés gastar HOY
- **Cero jerga financiera**: Interfaz simple y clara
- **Uso diario sin fricción**: Diseño mobile-first optimizado
- **Integración WhatsApp**: Consultá y registrá gastos desde WhatsApp
- **Tranquilidad mental**: Sabé siempre cuánto tenés disponible

## 📋 Requisitos

- Node.js 16 o superior
- npm o yarn
- WhatsApp en tu teléfono (para escanear QR)

## 🚀 Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias:**
```bash
npm install
```

3. **Iniciar el servidor:**
```bash
npm start
```

El servidor se iniciará en `http://localhost:3000`

4. **Abrir en el navegador:**
```
http://localhost:3000
```

## 📱 Uso de la Aplicación Web

### Configuración inicial

1. Abrí la aplicación en tu navegador móvil
2. Completá los datos:
   - **Límite total de la tarjeta**: Tu límite de crédito
   - **Gastos del mes**: Gastos acumulados hasta ahora
   - **Cuotas activas**: Total de cuotas que estás pagando
   - **Día de cierre**: Día del mes en que cierra tu tarjeta
3. Tocá "Calcular mi límite real"

### Uso diario

- La aplicación muestra cuánto podés gastar HOY
- Registrá tus gastos con el botón "Registrar gasto"
- El disponible se actualiza automáticamente
- Podés ver el historial de gastos del día

## 💬 Uso del Bot de WhatsApp

### Iniciar el bot

En una terminal separada:

```bash
npm run whatsapp
```

O directamente:

```bash
node whatsapp-bot.js
```

### Primera vez

1. El bot mostrará un código QR en la terminal
2. Abrí WhatsApp en tu teléfono
3. Ve a Configuración > Dispositivos vinculados > Vincular un dispositivo
4. Escaneá el código QR
5. El bot estará listo para usar

### Comandos disponibles

- **`hoy`** o **`cuanto puedo gastar`** - Ver cuánto podés gastar hoy
- **`resumen`** - Ver resumen completo de tu situación
- **`Gasté 1200`** - Registrar un gasto (reemplazá 1200 por el monto)
- **`configurar`** - Configurar tu tarjeta paso a paso
- **`reset mes`** - Resetear los gastos del mes
- **`ayuda`** - Ver todos los comandos

### Ejemplos de uso

```
Tú: hoy
Bot: 💳 Hoy podés gastar
     $7.450
     
     📅 Cierre en 9 días
     ✅ Vas bien

Tú: Gasté 3500
Bot: ✔️ Gasto registrado
     Monto: $3.500
     
     Te quedan $3.950 hoy
     ✅

Tú: resumen
Bot: 📊 Resumen
     
     💳 Límite real disponible: $25.000
     💰 Disponible hoy: $3.950
     💸 Gastos de hoy: $3.500
     📅 Días hasta cierre: 9
     
     ✅ Estado: Vas bien
```

## 📁 Estructura del Proyecto

```
limite-real/
├── index.html          # Frontend HTML
├── styles.css          # Estilos CSS mobile-first
├── app.js              # Lógica del frontend
├── server.js           # Servidor Express
├── calculator.js       # Lógica de cálculo
├── whatsapp-bot.js     # Bot de WhatsApp
├── package.json        # Dependencias
├── README.md           # Este archivo
└── data/               # Datos del usuario (se crea automáticamente)
    └── user-data.json
```

## 🔧 Configuración

### Variables de entorno

Puedes configurar el puerto del servidor:

```bash
PORT=3000 npm start
```

Para el bot de WhatsApp, puedes configurar la URL de la API:

```bash
API_URL=http://localhost:3000 node whatsapp-bot.js
```

## 📝 Notas Importantes

### Aviso Legal

**Límite Real no es un banco ni una entidad financiera.**
- No tiene acceso a tu tarjeta
- Los cálculos son estimaciones basadas en los datos que vos ingresás
- No se conecta a entidades financieras
- Todo funciona con datos ingresados manualmente

### Persistencia de Datos

Por defecto, los datos se guardan en un archivo JSON local (`data/user-data.json`). 

**Para producción**, se recomienda:
- Usar una base de datos (MongoDB, PostgreSQL, etc.)
- Implementar autenticación de usuarios
- Agregar encriptación de datos sensibles

## 🛠️ Desarrollo

### Modo desarrollo con auto-reload

```bash
npm run dev
```

Requiere `nodemon` instalado globalmente o como dependencia de desarrollo.

### Extender la funcionalidad

- **Agregar más comandos**: Editar `whatsapp-bot.js`
- **Modificar cálculos**: Editar `calculator.js`
- **Cambiar UI**: Editar `index.html` y `styles.css`
- **Agregar endpoints**: Editar `server.js`

## 🐛 Solución de Problemas

### El bot de WhatsApp no se conecta

- Verificá que el servidor esté corriendo (`npm start`)
- Asegurate de escanear el QR correctamente
- Si el QR expira, reiniciá el bot y escaneá de nuevo

### Error al calcular

- Verificá que todos los campos estén completos
- Asegurate de que los valores sean números válidos
- El día de cierre debe estar entre 1 y 31

### Los datos no se guardan

- Verificá que la carpeta `data/` tenga permisos de escritura
- Revisá los logs del servidor para ver errores

## 📄 Licencia

MIT

## 🤝 Contribuciones

Este es un proyecto MVP. Las contribuciones son bienvenidas para:
- Mejorar la UI/UX
- Agregar nuevas funcionalidades
- Optimizar el código
- Mejorar la documentación

---

**Hecho con ❤️ para ayudarte a mantener el control de tus gastos**
