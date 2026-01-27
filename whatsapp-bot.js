const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { formatCurrency } = require('./calculator');

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Estado del bot
let configurando = false;
let datosConfiguracion = {};

/**
 * Inicializa el cliente de WhatsApp
 */
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ],
        timeout: 60000,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false
    }
});

/**
 * Genera y muestra el QR para escanear
 */
client.on('qr', (qr) => {
    console.log('\n📱 Escaneá este código QR con WhatsApp:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n');
});

/**
 * Cuando está listo
 */
client.on('ready', () => {
    console.log('✅ WhatsApp bot conectado y listo!');
    console.log('💬 El bot está escuchando mensajes...\n');
});

/**
 * Maneja la autenticación
 */
client.on('authenticated', () => {
    console.log('🔐 Autenticado correctamente');
});

/**
 * Maneja errores de autenticación
 */
client.on('auth_failure', (msg) => {
    console.error('❌ Error de autenticación:', msg);
});

/**
 * Maneja desconexiones
 */
client.on('disconnected', (reason) => {
    console.log('⚠️ Cliente desconectado:', reason);
});

/**
 * Procesa mensajes entrantes
 */
client.on('message', async (message) => {
    const chat = await message.getChat();
    const contacto = await message.getContact();
    
    // Solo responder a mensajes de texto (no grupos por ahora)
    if (message.fromMe || chat.isGroup) {
        return;
    }

    const texto = message.body.trim().toLowerCase();
    const numero = contacto.number;

    console.log(`📨 Mensaje de ${contacto.pushname || numero}: ${texto}`);

    try {
        // Si está en modo configuración
        if (configurando) {
            await manejarConfiguracion(message, texto, numero);
            return;
        }

        // Comandos principales
        if (texto === 'hola' || texto === 'hi' || texto === 'inicio') {
            await enviarSaludo(message);
        } else if (texto === 'hoy' || texto === 'cuanto puedo gastar' || texto.includes('cuánto puedo gastar')) {
            await mostrarDisponibleHoy(message);
        } else if (texto === 'resumen' || texto === 'estado') {
            await mostrarResumen(message);
        } else if (texto === 'reset mes' || texto === 'resetear mes') {
            await resetearMes(message);
        } else if (texto === 'configurar' || texto === 'config') {
            await iniciarConfiguracion(message, numero);
        } else if (texto.startsWith('gasté ') || texto.startsWith('gaste ')) {
            await registrarGasto(message, texto);
        } else if (texto === 'ayuda' || texto === 'help') {
            await mostrarAyuda(message);
        } else {
            await message.reply(
                '🤔 No entendí ese comando.\n\n' +
                'Escribí *ayuda* para ver los comandos disponibles.',
                { sendSeen: true }
            );
        }
    } catch (error) {
        console.error('Error al procesar mensaje:', error);
        await message.reply('❌ Ocurrió un error. Por favor, intentá de nuevo.', { sendSeen: true });
    }
});

/**
 * Envía el saludo inicial con aviso legal
 */
async function enviarSaludo(message) {
    const saludo = 
        '👋 ¡Hola! Soy *Límite Real*\n\n' +
        'Te ayudo a saber cuánto podés gastar HOY con tu tarjeta sin pasarte.\n\n' +
        '📋 *Aviso legal:*\n' +
        'ℹ️ Límite Real no es un banco ni una entidad financiera.\n' +
        'No tiene acceso a tu tarjeta.\n' +
        'Los cálculos son estimaciones basadas en los datos que vos ingresás.\n\n' +
        '💬 Escribí *ayuda* para ver los comandos disponibles.';

    await message.reply(saludo, { sendSeen: true });
}

/**
 * Maneja errores de conexión con el servidor
 */
function esErrorDeConexion(error) {
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ETIMEDOUT' || 
           error.message?.includes('connect') ||
           error.message?.includes('ECONNREFUSED') ||
           (error.response === undefined && error.request !== undefined);
}

/**
 * Muestra el disponible para hoy
 */
async function mostrarDisponibleHoy(message) {
    try {
        const response = await axios.get(`${API_URL}/api/estado`, {
            timeout: 5000
        });
        const data = response.data;

        if (!data.configurado) {
            await message.reply(
                '⚠️ Aún no configuraste tu tarjeta.\n\n' +
                'Escribí *configurar* para empezar.',
                { sendSeen: true }
            );
            return;
        }

        const { disponibleHoy, diasRestantes, estado } = data;
        const emoji = estado === 'ok' ? '✅' : estado === 'warning' ? '⚠️' : '❌';
        const mensajeEstado = estado === 'ok' ? 'Vas bien' : estado === 'warning' ? 'Cuidado, te queda poco' : 'No tenés crédito disponible hoy';

        const respuesta = 
            `💳 *Hoy podés gastar*\n` +
            `*${formatCurrency(disponibleHoy)}*\n\n` +
            `📅 Cierre en ${diasRestantes} días\n` +
            `${emoji} ${mensajeEstado}`;

        await message.reply(respuesta, { sendSeen: true });
    } catch (error) {
        console.error('Error:', error.message || error);
        if (esErrorDeConexion(error)) {
            await message.reply(
                '⚠️ No puedo conectarme al servidor.\n\n' +
                'Verificá que el servidor esté corriendo:\n' +
                '`node server.js`',
                { sendSeen: true }
            );
        } else {
            await message.reply('❌ Error al obtener el estado. Intentá de nuevo.', { sendSeen: true });
        }
    }
}

/**
 * Muestra un resumen completo
 */
async function mostrarResumen(message) {
    try {
        const response = await axios.get(`${API_URL}/api/estado`, {
            timeout: 5000
        });
        const data = response.data;

        if (!data.configurado) {
            await message.reply(
                '⚠️ Aún no configuraste tu tarjeta.\n\n' +
                'Escribí *configurar* para empezar.',
                { sendSeen: true }
            );
            return;
        }

        const { limiteReal, disponibleHoy, totalGastosHoy, diasRestantes, estado } = data;
        const emoji = estado === 'ok' ? '✅' : estado === 'warning' ? '⚠️' : '❌';

        const respuesta = 
            `📊 *Resumen*\n\n` +
            `💳 Límite real disponible: ${formatCurrency(limiteReal)}\n` +
            `💰 Disponible hoy: ${formatCurrency(disponibleHoy)}\n` +
            `💸 Gastos de hoy: ${formatCurrency(totalGastosHoy)}\n` +
            `📅 Días hasta cierre: ${diasRestantes}\n\n` +
            `${emoji} Estado: ${estado === 'ok' ? 'Vas bien' : estado === 'warning' ? 'Cuidado' : 'Sin crédito'}`;

        await message.reply(respuesta, { sendSeen: true });
    } catch (error) {
        console.error('Error:', error.message || error);
        if (esErrorDeConexion(error)) {
            await message.reply(
                '⚠️ No puedo conectarme al servidor.\n\n' +
                'Verificá que el servidor esté corriendo:\n' +
                '`node server.js`',
                { sendSeen: true }
            );
        } else {
            await message.reply('❌ Error al obtener el resumen.', { sendSeen: true });
        }
    }
}

/**
 * Registra un gasto
 */
async function registrarGasto(message, texto) {
    try {
        // Extraer monto del texto
        const match = texto.match(/gast[ée]\s+(\d+(?:[.,]\d+)?)/i);
        if (!match) {
            await message.reply('❌ No pude entender el monto. Escribí: *Gasté 1200*', { sendSeen: true });
            return;
        }

        const monto = parseFloat(match[1].replace(',', '.'));

        if (monto <= 0) {
            await message.reply('❌ El monto debe ser mayor a 0', { sendSeen: true });
            return;
        }

        const response = await axios.post(`${API_URL}/api/gasto`, { monto }, {
            timeout: 5000
        });

        if (response.data.success) {
            const { disponibleHoy, estado } = response.data;
            const emoji = estado === 'ok' ? '✅' : estado === 'warning' ? '⚠️' : '❌';

            const respuesta = 
                `✔️ *Gasto registrado*\n` +
                `Monto: ${formatCurrency(monto)}\n\n` +
                `Te quedan ${formatCurrency(disponibleHoy)} hoy\n` +
                `${emoji}`;

            await message.reply(respuesta, { sendSeen: true });
        }
    } catch (error) {
        console.error('Error:', error.message || error);
        if (esErrorDeConexion(error)) {
            await message.reply(
                '⚠️ No puedo conectarme al servidor.\n\n' +
                'Verificá que el servidor esté corriendo:\n' +
                '`node server.js`',
                { sendSeen: true }
            );
        } else if (error.response && error.response.status === 400) {
            await message.reply('⚠️ ' + error.response.data.error, { sendSeen: true });
        } else {
            await message.reply('❌ Error al registrar el gasto.', { sendSeen: true });
        }
    }
}

/**
 * Resetea el mes
 */
async function resetearMes(message) {
    try {
        const response = await axios.post(`${API_URL}/api/reset-mes`, {}, {
            timeout: 5000
        });

        if (response.data.success) {
            await message.reply('✅ Mes reseteado correctamente. Los gastos del mes y de hoy fueron limpiados.', { sendSeen: true });
        }
    } catch (error) {
        console.error('Error:', error.message || error);
        if (esErrorDeConexion(error)) {
            await message.reply(
                '⚠️ No puedo conectarme al servidor.\n\n' +
                'Verificá que el servidor esté corriendo:\n' +
                '`node server.js`',
                { sendSeen: true }
            );
        } else {
            await message.reply('❌ Error al resetear el mes.', { sendSeen: true });
        }
    }
}

/**
 * Inicia el proceso de configuración
 */
async function iniciarConfiguracion(message, numero) {
    configurando = true;
    datosConfiguracion = {};

    await message.reply(
        '⚙️ *Configuración de tu tarjeta*\n\n' +
        'Vamos a configurar tu tarjeta paso a paso.\n\n' +
        '1️⃣ Enviame el *límite total* de tu tarjeta (ejemplo: 50000)',
        { sendSeen: true }
    );
}

/**
 * Maneja el flujo de configuración
 */
async function manejarConfiguracion(message, texto, numero) {
    const paso = Object.keys(datosConfiguracion).length;

    if (paso === 0) {
        // Límite total
        const limite = parseFloat(texto.replace(',', '.'));
        if (isNaN(limite) || limite <= 0) {
            await message.reply('❌ Por favor, enviame un número válido mayor a 0', { sendSeen: true });
            return;
        }
        datosConfiguracion.limiteTotal = limite;
        await message.reply(
            `✅ Límite total: ${formatCurrency(limite)}\n\n` +
            '2️⃣ Enviame los *gastos del mes* (ejemplo: 15000 o 0 si no hay)',
            { sendSeen: true }
        );
    } else if (paso === 1) {
        // Gastos del mes
        const gastos = parseFloat(texto.replace(',', '.')) || 0;
        if (isNaN(gastos) || gastos < 0) {
            await message.reply('❌ Por favor, enviame un número válido (0 o mayor)', { sendSeen: true });
            return;
        }
        datosConfiguracion.gastosMes = gastos;
        await message.reply(
            `✅ Gastos del mes: ${formatCurrency(gastos)}\n\n` +
            '3️⃣ Enviame las *cuotas activas* (ejemplo: 5000 o 0 si no hay)',
            { sendSeen: true }
        );
    } else if (paso === 2) {
        // Cuotas activas
        const cuotas = parseFloat(texto.replace(',', '.')) || 0;
        if (isNaN(cuotas) || cuotas < 0) {
            await message.reply('❌ Por favor, enviame un número válido (0 o mayor)', { sendSeen: true });
            return;
        }
        datosConfiguracion.cuotasActivas = cuotas;
        await message.reply(
            `✅ Cuotas activas: ${formatCurrency(cuotas)}\n\n` +
            '4️⃣ Enviame el *día de cierre* de tu tarjeta (número del 1 al 31)',
            { sendSeen: true }
        );
    } else if (paso === 3) {
        // Día de cierre
        const diaCierre = parseInt(texto);
        if (isNaN(diaCierre) || diaCierre < 1 || diaCierre > 31) {
            await message.reply('❌ Por favor, enviame un número entre 1 y 31', { sendSeen: true });
            return;
        }
        datosConfiguracion.diaCierre = diaCierre;
        datosConfiguracion.gastosHoy = [];

        // Guardar configuración
        try {
            await axios.post(`${API_URL}/api/user-data`, datosConfiguracion, {
                timeout: 5000
            });
            
            // Calcular y mostrar resultado
            const response = await axios.post(`${API_URL}/api/calcular`, datosConfiguracion, {
                timeout: 5000
            });
            const resultado = response.data;

            await message.reply(
                `✅ *Configuración completada*\n\n` +
                `💳 Límite total: ${formatCurrency(datosConfiguracion.limiteTotal)}\n` +
                `📊 Gastos del mes: ${formatCurrency(datosConfiguracion.gastosMes)}\n` +
                `📅 Cuotas activas: ${formatCurrency(datosConfiguracion.cuotasActivas)}\n` +
                `📆 Día de cierre: ${diaCierre}\n\n` +
                `💳 *Hoy podés gastar*\n` +
                `*${formatCurrency(resultado.disponibleHoy)}*\n\n` +
                `📅 Cierre en ${resultado.diasRestantes} días\n` +
                `✅ Vas bien\n\n` +
                `Escribí *hoy* para consultar tu disponible en cualquier momento.`,
                { sendSeen: true }
            );

            configurando = false;
            datosConfiguracion = {};
        } catch (error) {
            console.error('Error al guardar configuración:', error.message || error);
            if (esErrorDeConexion(error)) {
                await message.reply(
                    '⚠️ No puedo conectarme al servidor.\n\n' +
                    'Verificá que el servidor esté corriendo:\n' +
                    '`node server.js`\n\n' +
                    'Tu configuración se perdió. Volvé a intentar cuando el servidor esté activo.',
                    { sendSeen: true }
                );
            } else {
                await message.reply('❌ Error al guardar la configuración. Intentá de nuevo.', { sendSeen: true });
            }
            configurando = false;
            datosConfiguracion = {};
        }
    }
}

/**
 * Muestra la ayuda
 */
async function mostrarAyuda(message) {
    const ayuda = 
        '📚 *Comandos disponibles*\n\n' +
        '💬 *hoy* - Ver cuánto podés gastar hoy\n' +
        '📊 *resumen* - Ver resumen completo\n' +
        '💸 *Gasté 1200* - Registrar un gasto\n' +
        '⚙️ *configurar* - Configurar tu tarjeta\n' +
        '🔄 *reset mes* - Resetear el mes\n' +
        '❓ *ayuda* - Ver esta ayuda\n\n' +
        'Ejemplos:\n' +
        '• "Hoy"\n' +
        '• "Gasté 3500"\n' +
        '• "Resumen"';

    await message.reply(ayuda, { sendSeen: true });
}

// Manejar errores durante la inicialización
let intentos = 0;
const MAX_INTENTOS = 3;

async function inicializarBot() {
    try {
        console.log('🚀 Iniciando WhatsApp bot...\n');
        await client.initialize();
    } catch (error) {
        intentos++;
        console.error(`❌ Error al inicializar (intento ${intentos}/${MAX_INTENTOS}):`, error.message);
        
        if (intentos < MAX_INTENTOS) {
            console.log(`⏳ Reintentando en 5 segundos...\n`);
            setTimeout(() => {
                inicializarBot();
            }, 5000);
        } else {
            console.error('❌ No se pudo inicializar el bot después de varios intentos.');
            console.error('💡 Sugerencias:');
            console.error('   - Verificá que Chrome esté instalado correctamente');
            console.error('   - Intentá ejecutar: npx --yes puppeteer browsers install chrome');
            console.error('   - Cerra otras instancias de Chrome que puedan estar corriendo');
            process.exit(1);
        }
    }
}

// Inicializar cliente
inicializarBot();

// Manejar cierre graceful
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando bot...');
    try {
        await client.destroy();
    } catch (error) {
        console.error('Error al cerrar:', error.message);
    }
    process.exit(0);
});

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
    console.error('❌ Error no manejado:', error);
    if (error.message && error.message.includes('Execution context was destroyed')) {
        console.log('⚠️ Error de contexto de ejecución. El bot se reiniciará...');
        setTimeout(() => {
            inicializarBot();
        }, 5000);
    }
});
