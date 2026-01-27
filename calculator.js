/**
 * Módulo de cálculo de límite real
 * Contiene toda la lógica de negocio para calcular el límite disponible
 */

/**
 * Calcula el límite real disponible para el usuario
 * @param {Object} userData - Datos del usuario
 * @param {number} userData.limiteTotal - Límite total de la tarjeta
 * @param {number} userData.gastosMes - Gastos acumulados del mes
 * @param {number} userData.cuotasActivas - Total de cuotas activas
 * @param {number} userData.diaCierre - Día del mes en que cierra la tarjeta
 * @param {Array} userData.gastosHoy - Gastos registrados hoy
 * @returns {Object} Resultado del cálculo
 */
function calcularLimiteReal(userData) {
    const { limiteTotal, gastosMes, cuotasActivas, diaCierre, gastosHoy = [] } = userData;

    // Validaciones básicas
    if (!limiteTotal || limiteTotal <= 0) {
        throw new Error('El límite total debe ser mayor a 0');
    }

    if (!diaCierre || diaCierre < 1 || diaCierre > 31) {
        throw new Error('El día de cierre debe estar entre 1 y 31');
    }

    // Calcular límite real (límite total - gastos del mes - cuotas activas)
    const limiteReal = Math.max(0, limiteTotal - gastosMes - cuotasActivas);

    // Calcular días hasta el cierre
    const diasRestantes = calcularDiasHastaCierre(diaCierre);

    // Calcular disponible por día
    const disponiblePorDia = diasRestantes > 0 ? limiteReal / diasRestantes : 0;

    // Calcular gastos de hoy
    const totalGastosHoy = gastosHoy.reduce((sum, gasto) => sum + (gasto.monto || 0), 0);

    // Calcular disponible restante para hoy
    const disponibleHoy = Math.max(0, disponiblePorDia - totalGastosHoy);

    // Determinar estado
    const estado = determinarEstado(disponibleHoy, limiteReal, diasRestantes);

    return {
        limiteReal: Math.round(limiteReal * 100) / 100,
        diasRestantes,
        disponiblePorDia: Math.round(disponiblePorDia * 100) / 100,
        disponibleHoy: Math.round(disponibleHoy * 100) / 100,
        totalGastosHoy: Math.round(totalGastosHoy * 100) / 100,
        estado
    };
}

/**
 * Calcula los días restantes hasta el próximo cierre
 * @param {number} diaCierre - Día del mes en que cierra la tarjeta
 * @returns {number} Días restantes hasta el cierre
 */
function calcularDiasHastaCierre(diaCierre) {
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();

    // Crear fecha de cierre para este mes
    let fechaCierre = new Date(añoActual, mesActual, diaCierre);
    
    // Si el día de cierre ya pasó este mes, calcular para el próximo mes
    if (diaActual >= diaCierre) {
        fechaCierre = new Date(añoActual, mesActual + 1, diaCierre);
    }

    // Calcular diferencia en días
    const diferenciaMs = fechaCierre - hoy;
    const diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

    return Math.max(0, diasRestantes);
}

/**
 * Determina el estado del usuario según su situación financiera
 * @param {number} disponibleHoy - Disponible restante para hoy
 * @param {number} limiteReal - Límite real total disponible
 * @param {number} diasRestantes - Días hasta el cierre
 * @returns {string} Estado: 'ok', 'warning', 'danger'
 */
function determinarEstado(disponibleHoy, limiteReal, diasRestantes) {
    if (disponibleHoy <= 0) {
        return 'danger';
    }

    if (disponibleHoy < limiteReal * 0.1 || diasRestantes <= 3) {
        return 'warning';
    }

    return 'ok';
}

/**
 * Formatea un número como moneda argentina
 * @param {number} amount - Monto a formatear
 * @returns {string} Monto formateado
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
 * Valida los datos del usuario antes de calcular
 * @param {Object} userData - Datos del usuario
 * @returns {Object} { valid: boolean, error: string }
 */
function validarDatos(userData) {
    if (!userData.limiteTotal || userData.limiteTotal <= 0) {
        return { valid: false, error: 'El límite total debe ser mayor a 0' };
    }

    if (userData.gastosMes < 0) {
        return { valid: false, error: 'Los gastos del mes no pueden ser negativos' };
    }

    if (userData.cuotasActivas < 0) {
        return { valid: false, error: 'Las cuotas activas no pueden ser negativas' };
    }

    if (!userData.diaCierre || userData.diaCierre < 1 || userData.diaCierre > 31) {
        return { valid: false, error: 'El día de cierre debe estar entre 1 y 31' };
    }

    return { valid: true };
}

module.exports = {
    calcularLimiteReal,
    calcularDiasHastaCierre,
    determinarEstado,
    formatCurrency,
    validarDatos
};
