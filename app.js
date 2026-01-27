// Estado de la aplicación
let userData = {
    limiteTotal: 0,
    gastosMes: 0,
    cuotasActivas: 0,
    diaCierre: 0,
    gastosHoy: []
};

// Elementos del DOM
const configSection = document.getElementById('config-section');
const resultSection = document.getElementById('result-section');
const actionSection = document.getElementById('action-section');
const historialSection = document.getElementById('historial-section');

const btnCalcular = document.getElementById('btn-calcular');
const btnRegistrar = document.getElementById('btn-registrar');

const inputLimiteTotal = document.getElementById('limite-total');
const inputGastosMes = document.getElementById('gastos-mes');
const inputCuotasActivas = document.getElementById('cuotas-activas');
const inputDiaCierre = document.getElementById('dia-cierre');
const inputGastoMonto = document.getElementById('gasto-monto');

const disponibleHoyEl = document.getElementById('disponible-hoy');
const limiteRealEl = document.getElementById('limite-real');
const diasCierreEl = document.getElementById('dias-cierre');
const statusMessageEl = document.getElementById('status-message');
const gastosListaEl = document.getElementById('gastos-lista');
const totalHoyEl = document.getElementById('total-hoy');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Cargar datos guardados
    loadUserData();
    
    // Si ya hay datos configurados, calcular automáticamente
    if (userData.limiteTotal > 0) {
        updateUI();
    }

    // Event listeners
    btnCalcular.addEventListener('click', handleCalcular);
    btnRegistrar.addEventListener('click', handleRegistrarGasto);
    
    // Permitir Enter en inputs
    inputGastoMonto.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleRegistrarGasto();
        }
    });
});

/**
 * Maneja el cálculo del límite real
 */
async function handleCalcular() {
    // Validar inputs
    const limiteTotal = parseFloat(inputLimiteTotal.value);
    const gastosMes = parseFloat(inputGastosMes.value) || 0;
    const cuotasActivas = parseFloat(inputCuotasActivas.value) || 0;
    const diaCierre = parseInt(inputDiaCierre.value);

    if (!limiteTotal || limiteTotal <= 0) {
        alert('Por favor, ingresá el límite total de tu tarjeta');
        return;
    }

    if (!diaCierre || diaCierre < 1 || diaCierre > 31) {
        alert('Por favor, ingresá un día de cierre válido (1-31)');
        return;
    }

    // Guardar datos
    userData.limiteTotal = limiteTotal;
    userData.gastosMes = gastosMes;
    userData.cuotasActivas = cuotasActivas;
    userData.diaCierre = diaCierre;

    // Calcular límite real
    const resultado = await calcularLimiteReal(userData);
    
    // Actualizar UI
    updateUI(resultado);
    
    // Guardar en servidor
    saveUserData();
}

/**
 * Calcula el límite real llamando al backend
 */
async function calcularLimiteReal(data) {
    try {
        const response = await fetch('/api/calcular', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Error al calcular');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        // Fallback a cálculo local
        return calcularLocal(data);
    }
}

/**
 * Cálculo local (fallback)
 */
function calcularLocal(data) {
    const { limiteTotal, gastosMes, cuotasActivas, diaCierre } = data;
    
    // Calcular límite real
    const limiteReal = limiteTotal - gastosMes - cuotasActivas;
    
    // Calcular días hasta cierre
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();
    
    let fechaCierre = new Date(añoActual, mesActual, diaCierre);
    
    // Si el día de cierre ya pasó este mes, calcular para el próximo mes
    if (diaActual >= diaCierre) {
        fechaCierre = new Date(añoActual, mesActual + 1, diaCierre);
    }
    
    const diasRestantes = Math.ceil((fechaCierre - hoy) / (1000 * 60 * 60 * 24));
    
    // Calcular disponible hoy
    const disponibleHoy = diasRestantes > 0 ? limiteReal / diasRestantes : 0;
    
    return {
        limiteReal: Math.max(0, limiteReal),
        diasRestantes: Math.max(0, diasRestantes),
        disponibleHoy: Math.max(0, disponibleHoy)
    };
}

/**
 * Actualiza la interfaz con los resultados
 */
function updateUI(resultado = null) {
    // Si no hay resultado, calcular localmente
    if (!resultado) {
        resultado = calcularLocal(userData);
    }

    const { limiteReal, diasRestantes, disponibleHoy } = resultado;
    const totalGastosHoy = userData.gastosHoy.reduce((sum, g) => sum + g.monto, 0);
    const disponibleRestante = disponibleHoy - totalGastosHoy;

    // Actualizar valores
    disponibleHoyEl.textContent = formatCurrency(disponibleRestante);
    limiteRealEl.textContent = formatCurrency(limiteReal);
    diasCierreEl.textContent = `${diasRestantes} días`;

    // Actualizar mensaje de estado
    updateStatusMessage(disponibleRestante, limiteReal, diasRestantes);

    // Mostrar secciones
    configSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    actionSection.classList.remove('hidden');
    historialSection.classList.remove('hidden');

    // Actualizar historial
    updateHistorial();
}

/**
 * Actualiza el mensaje de estado según la situación
 */
function updateStatusMessage(disponible, limiteReal, diasRestantes) {
    statusMessageEl.className = 'status-message';
    
    if (disponible <= 0) {
        statusMessageEl.classList.add('danger');
        statusMessageEl.innerHTML = '<span class="icon">⚠️</span><span>No tenés crédito disponible hoy</span>';
    } else if (disponible < limiteReal * 0.1) {
        statusMessageEl.classList.add('warning');
        statusMessageEl.innerHTML = '<span class="icon">⚠️</span><span>Cuidado, te queda poco</span>';
    } else {
        statusMessageEl.classList.add('success');
        statusMessageEl.innerHTML = '<span class="icon">✅</span><span>Vas bien</span>';
    }
}

/**
 * Maneja el registro de un gasto
 */
function handleRegistrarGasto() {
    const monto = parseFloat(inputGastoMonto.value);

    if (!monto || monto <= 0) {
        alert('Por favor, ingresá un monto válido');
        return;
    }

    // Agregar gasto
    const gasto = {
        monto: monto,
        fecha: new Date().toISOString(),
        timestamp: Date.now()
    };

    userData.gastosHoy.push(gasto);
    
    // Guardar en servidor
    saveUserData();
    
    // Actualizar UI
    updateUI();
    
    // Limpiar input
    inputGastoMonto.value = '';
    inputGastoMonto.focus();

    // Mostrar confirmación
    showNotification(`Gasto de ${formatCurrency(monto)} registrado`);
}

/**
 * Actualiza el historial de gastos
 */
function updateHistorial() {
    gastosListaEl.innerHTML = '';
    
    if (userData.gastosHoy.length === 0) {
        gastosListaEl.innerHTML = '<li style="text-align: center; color: var(--text-secondary);">No hay gastos registrados hoy</li>';
        totalHoyEl.textContent = formatCurrency(0);
        return;
    }

    userData.gastosHoy.forEach((gasto, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${formatCurrency(gasto.monto)}</span>
            <button class="btn-eliminar" data-index="${index}" style="background: var(--danger); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Eliminar</button>
        `;
        gastosListaEl.appendChild(li);
    });

    // Total
    const total = userData.gastosHoy.reduce((sum, g) => sum + g.monto, 0);
    totalHoyEl.textContent = formatCurrency(total);

    // Event listeners para eliminar
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            userData.gastosHoy.splice(index, 1);
            saveUserData();
            updateUI();
        });
    });
}

/**
 * Formatea un número como moneda
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Guarda los datos del usuario en el servidor
 */
async function saveUserData() {
    try {
        await fetch('/api/user-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
    } catch (error) {
        console.error('Error al guardar:', error);
        // Guardar en localStorage como fallback
        localStorage.setItem('limiteRealData', JSON.stringify(userData));
    }
}

/**
 * Carga los datos del usuario desde el servidor
 */
async function loadUserData() {
    try {
        const response = await fetch('/api/user-data');
        if (response.ok) {
            const data = await response.json();
            if (data && data.limiteTotal) {
                userData = { ...userData, ...data };
                // Restaurar valores en inputs
                inputLimiteTotal.value = userData.limiteTotal || '';
                inputGastosMes.value = userData.gastosMes || '';
                inputCuotasActivas.value = userData.cuotasActivas || '';
                inputDiaCierre.value = userData.diaCierre || '';
            }
        }
    } catch (error) {
        console.error('Error al cargar:', error);
        // Cargar desde localStorage como fallback
        const saved = localStorage.getItem('limiteRealData');
        if (saved) {
            userData = { ...userData, ...JSON.parse(saved) };
            inputLimiteTotal.value = userData.limiteTotal || '';
            inputGastosMes.value = userData.gastosMes || '';
            inputCuotasActivas.value = userData.cuotasActivas || '';
            inputDiaCierre.value = userData.diaCierre || '';
        }
    }
}

/**
 * Muestra una notificación temporal
 */
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}
