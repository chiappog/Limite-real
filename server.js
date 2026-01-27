const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { calcularLimiteReal, validarDatos } = require('./calculator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Ruta para servir el HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta para calcular límite real
app.post('/api/calcular', (req, res) => {
    try {
        const userData = req.body;

        // Validar datos
        const validacion = validarDatos(userData);
        if (!validacion.valid) {
            return res.status(400).json({ error: validacion.error });
        }

        // Calcular
        const resultado = calcularLimiteReal(userData);

        res.json(resultado);
    } catch (error) {
        console.error('Error al calcular:', error);
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
});

// Ruta para guardar datos del usuario
app.post('/api/user-data', async (req, res) => {
    try {
        const userData = req.body;
        
        // Guardar en archivo JSON (en producción usar base de datos)
        const dataPath = path.join(__dirname, 'data', 'user-data.json');
        await fs.mkdir(path.dirname(dataPath), { recursive: true });
        await fs.writeFile(dataPath, JSON.stringify(userData, null, 2));

        res.json({ success: true });
    } catch (error) {
        console.error('Error al guardar:', error);
        res.status(500).json({ error: 'Error al guardar los datos' });
    }
});

// Ruta para obtener datos del usuario
app.get('/api/user-data', async (req, res) => {
    try {
        const dataPath = path.join(__dirname, 'data', 'user-data.json');
        
        try {
            const data = await fs.readFile(dataPath, 'utf8');
            const userData = JSON.parse(data);
            res.json(userData);
        } catch (error) {
            // Si el archivo no existe, devolver objeto vacío
            if (error.code === 'ENOENT') {
                res.json({});
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Error al cargar:', error);
        res.status(500).json({ error: 'Error al cargar los datos' });
    }
});

// Ruta para obtener el estado actual (usado por WhatsApp bot)
app.get('/api/estado', async (req, res) => {
    try {
        const dataPath = path.join(__dirname, 'data', 'user-data.json');
        
        try {
            const data = await fs.readFile(dataPath, 'utf8');
            const userData = JSON.parse(data);
            
            if (!userData.limiteTotal) {
                return res.json({ 
                    configurado: false,
                    mensaje: 'Aún no configuraste tu tarjeta. Enviá "configurar" para empezar.' 
                });
            }

            const resultado = calcularLimiteReal(userData);
            res.json({
                configurado: true,
                ...resultado
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                res.json({ 
                    configurado: false,
                    mensaje: 'Aún no configuraste tu tarjeta. Enviá "configurar" para empezar.' 
                });
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Error al obtener estado:', error);
        res.status(500).json({ error: 'Error al obtener el estado' });
    }
});

// Ruta para registrar un gasto desde WhatsApp
app.post('/api/gasto', async (req, res) => {
    try {
        const { monto } = req.body;

        if (!monto || monto <= 0) {
            return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
        }

        const dataPath = path.join(__dirname, 'data', 'user-data.json');
        let userData;

        try {
            const data = await fs.readFile(dataPath, 'utf8');
            userData = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(400).json({ error: 'Primero debes configurar tu tarjeta' });
            }
            throw error;
        }

        // Agregar gasto
        if (!userData.gastosHoy) {
            userData.gastosHoy = [];
        }

        const gasto = {
            monto: parseFloat(monto),
            fecha: new Date().toISOString(),
            timestamp: Date.now()
        };

        userData.gastosHoy.push(gasto);

        // Guardar
        await fs.writeFile(dataPath, JSON.stringify(userData, null, 2));

        // Calcular nuevo estado
        const resultado = calcularLimiteReal(userData);

        res.json({
            success: true,
            gasto: gasto,
            ...resultado
        });
    } catch (error) {
        console.error('Error al registrar gasto:', error);
        res.status(500).json({ error: 'Error al registrar el gasto' });
    }
});

// Ruta para resetear el mes
app.post('/api/reset-mes', async (req, res) => {
    try {
        const dataPath = path.join(__dirname, 'data', 'user-data.json');
        
        try {
            const data = await fs.readFile(dataPath, 'utf8');
            const userData = JSON.parse(data);

            // Resetear gastos del mes y gastos de hoy
            userData.gastosMes = 0;
            userData.gastosHoy = [];

            await fs.writeFile(dataPath, JSON.stringify(userData, null, 2));

            res.json({ success: true, mensaje: 'Mes reseteado correctamente' });
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(400).json({ error: 'No hay datos para resetear' });
            }
            throw error;
        }
    } catch (error) {
        console.error('Error al resetear:', error);
        res.status(500).json({ error: 'Error al resetear el mes' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📱 Abrí tu navegador y visitá http://localhost:${PORT}`);
});
