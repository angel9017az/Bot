// economyManager.js
const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'database');
const filePath = path.join(dirPath, 'economia.json');

if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

const TARJETAS = {
  'Débito Clásica': { limiteBanco: 5000, cashback: 0, tasaInteresPrestamo: 0.15, icono: '💳' },
  'Visa Gold': { limiteBanco: 50000, cashback: 0.03, tasaInteresPrestamo: 0.10, icono: '🪙' },
  'Black Platinum': { limiteBanco: 250000, cashback: 0.07, tasaInteresPrestamo: 0.05, icono: '💎' },
  'Obsidian VIP': { limiteBanco: Infinity, cashback: 0.12, tasaInteresPrestamo: 0.02, icono: '👑' }
};

function cargarEconomia() {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
      return {};
    }
    const data = fs.readFileSync(filePath, 'utf-8').trim();
    if (!data) {
      fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
      return {};
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error al leer economia.json:', error.message);
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
    return {};
  }
}

function guardarEconomia(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function obtenerCuenta(userId) {
  const eco = cargarEconomia();
  if (!eco[userId]) {
    eco[userId] = {
      numeroCuenta: `ES-${Math.floor(100000 + Math.random() * 900000)}`,
      efectivo: 1000,
      banco: 2500,
      tarjeta: 'Débito Clásica',
      scoreCrediticio: 650,
      prestamoActivo: 0,
      inventario: [],
      transacciones: [],
      ultimoTrabajo: 0
    };
    guardarEconomia(eco);
  } else {
    let mod = false;
    if (!eco[userId].inventario) { eco[userId].inventario = []; mod = true; }
    if (!eco[userId].tarjeta) { eco[userId].tarjeta = 'Débito Clásica'; mod = true; }
    if (!eco[userId].transacciones) { eco[userId].transacciones = []; mod = true; }
    if (eco[userId].scoreCrediticio === undefined) { eco[userId].scoreCrediticio = 650; mod = true; }
    if (eco[userId].prestamoActivo === undefined) { eco[userId].prestamoActivo = 0; mod = true; }
    if (eco[userId].ultimoTrabajo === undefined) { eco[userId].ultimoTrabajo = 0; mod = true; }
    if (mod) guardarEconomia(eco);
  }
  return eco[userId];
}

function obtenerLimiteBanco(tarjetaNombre) {
  const tarjeta = TARJETAS[tarjetaNombre] || TARJETAS['Débito Clásica'];
  return tarjeta.limiteBanco;
}

function registrarTransaccion(userId, tipo, monto, detalle) {
  const eco = cargarEconomia();
  const cuenta = obtenerCuenta(userId);

  const nuevaTx = {
    fecha: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
    tipo,
    monto,
    detalle
  };

  cuenta.transacciones.unshift(nuevaTx);
  if (cuenta.transacciones.length > 10) cuenta.transacciones.pop();

  eco[userId] = cuenta;
  guardarEconomia(eco);
}

function depositar(userId, cantidad) {
  const eco = cargarEconomia();
  const cuenta = obtenerCuenta(userId);
  const infoTarjeta = TARJETAS[cuenta.tarjeta] || TARJETAS['Débito Clásica'];

  if (cantidad <= 0) return { exito: false, razon: 'Monto inválido.' };
  if (cuenta.efectivo < cantidad) return { exito: false, razon: 'No tienes suficiente efectivo en tu billetera.' };

  const espacio = infoTarjeta.limiteBanco - cuenta.banco;
  if (espacio <= 0) {
    return { exito: false, razon: `Tu **${cuenta.tarjeta}** alcanzó su límite bancario ($${infoTarjeta.limiteBanco.toLocaleString()}).` };
  }

  const montoReal = Math.min(cantidad, espacio);
  cuenta.efectivo -= montoReal;
  cuenta.banco += montoReal;

  eco[userId] = cuenta;
  guardarEconomia(eco);
  registrarTransaccion(userId, 'DEPOSITAR', montoReal, 'Abono en Ventanilla/ATM');

  return { exito: true, cuenta, montoReal };
}

function retirar(userId, cantidad) {
  const eco = cargarEconomia();
  const cuenta = obtenerCuenta(userId);

  if (cantidad <= 0) return { exito: false, razon: 'Monto inválido.' };
  if (cuenta.banco < cantidad) return { exito: false, razon: 'Saldo bancario insuficiente.' };

  cuenta.banco -= cantidad;
  cuenta.efectivo += cantidad;

  eco[userId] = cuenta;
  guardarEconomia(eco);
  registrarTransaccion(userId, 'RETIRAR', cantidad, 'Retiro de Cajero Automático');

  return { exito: true, cuenta };
}

function transferir(emisorId, receptorId, monto) {
  const eco = cargarEconomia();
  const emisor = obtenerCuenta(emisorId);
  const receptor = obtenerCuenta(receptorId);

  if (monto <= 0) return { exito: false, razon: 'Monto inválido.' };
  if (emisor.banco < monto) return { exito: false, razon: 'Saldo en banco insuficiente para transferir.' };

  const infoTarjetaReceptor = TARJETAS[receptor.tarjeta] || TARJETAS['Débito Clásica'];
  if (receptor.banco + monto > infoTarjetaReceptor.limiteBanco) {
    return { exito: false, razon: 'La cuenta de destino sobrepasaría su límite máximo de depósito.' };
  }

  emisor.banco -= monto;
  receptor.banco += monto;

  eco[emisorId] = emisor;
  eco[receptorId] = receptor;
  guardarEconomia(eco);

  registrarTransaccion(emisorId, 'TRANSFERIR', -monto, `Transferencia enviada a N° ${receptor.numeroCuenta}`);
  registrarTransaccion(receptorId, 'TRANSFERIR', monto, `Transferencia recibida de N° ${emisor.numeroCuenta}`);

  return { exito: true, emisor };
}

function calcularLimitePrestamo(score) {
  if (score < 500) return 0;
  if (score < 650) return 5000;
  if (score < 750) return 25000;
  return 100000;
}

function solicitarPrestamo(userId, monto) {
  const eco = cargarEconomia();
  const cuenta = obtenerCuenta(userId);
  const infoTarjeta = TARJETAS[cuenta.tarjeta] || TARJETAS['Débito Clásica'];

  if (monto <= 0) return { exito: false, razon: 'Ingresa un monto válido mayor a 0.' };

  if (cuenta.prestamoActivo > 0) {
    return { 
      exito: false, 
      razon: `Tienes un préstamo activo por **$${cuenta.prestamoActivo.toLocaleString()}**. Liquídalo antes de pedir otro.` 
    };
  }

  const limitePermitido = calcularLimitePrestamo(cuenta.scoreCrediticio);

  if (limitePermitido === 0) {
    return { 
      exito: false, 
      razon: `Tu historial crediticio es insuficiente (\`${cuenta.scoreCrediticio} pts\`). Mínimo requerido: **500 pts**.` 
    };
  }

  if (monto > limitePermitido) {
    return { 
      exito: false, 
      razon: `Con tu Score Crediticio (\`${cuenta.scoreCrediticio} pts\`), tu límite máximo de aprobación es **$${limitePermitido.toLocaleString()} USD**.` 
    };
  }

  const totalAPagar = Math.floor(monto * (1 + infoTarjeta.tasaInteresPrestamo));
  cuenta.banco += monto;
  cuenta.prestamoActivo = totalAPagar;

  eco[userId] = cuenta;
  guardarEconomia(eco);
  registrarTransaccion(userId, 'PRESTAMO', monto, `Préstamo aprobado (Tasa: ${(infoTarjeta.tasaInteresPrestamo * 100)}%)`);

  return { exito: true, monto, totalAPagar, score: cuenta.scoreCrediticio };
}

function pagarPrestamo(userId) {
  const eco = cargarEconomia();
  const cuenta = obtenerCuenta(userId);

  if (cuenta.prestamoActivo <= 0) {
    return { exito: false, razon: 'No registras ningún crédito bancario pendiente.' };
  }

  if (cuenta.banco < cuenta.prestamoActivo) {
    return { exito: false, razon: `Fondos bancarios insuficientes. Requieres **$${cuenta.prestamoActivo.toLocaleString()}**.` };
  }

  const montoPagado = cuenta.prestamoActivo;
  cuenta.banco -= montoPagado;
  cuenta.prestamoActivo = 0;
  cuenta.scoreCrediticio = Math.min(850, cuenta.scoreCrediticio + 25);

  eco[userId] = cuenta;
  guardarEconomia(eco);
  registrarTransaccion(userId, 'PAGO_PRESTAMO', -montoPagado, 'Pago total de crédito bancario');

  return { exito: true, montoPagado, nuevoScore: cuenta.scoreCrediticio };
}

function actualizarSaldo(userId, efectivoDiff, bancoDiff) {
  const eco = cargarEconomia();
  const cuenta = obtenerCuenta(userId);

  cuenta.efectivo += efectivoDiff;
  cuenta.banco += bancoDiff;

  eco[userId] = cuenta;
  guardarEconomia(eco);
  return cuenta;
}

function procesarCompra(userId, itemNombre, precio, tipoPago = 'banco', esTarjeta = false) {
  const eco = cargarEconomia();
  const cuenta = obtenerCuenta(userId);
  const infoTarjeta = TARJETAS[cuenta.tarjeta] || TARJETAS['Débito Clásica'];

  if (tipoPago === 'efectivo' && cuenta.efectivo < precio) {
    return { exito: false, razon: 'Efectivo insuficiente.' };
  }
  if (tipoPago === 'banco' && cuenta.banco < precio) {
    return { exito: false, razon: 'Saldo bancario insuficiente.' };
  }

  let cashbackGanado = 0;
  if (tipoPago === 'banco' && !esTarjeta && infoTarjeta.cashback > 0) {
    cashbackGanado = Math.floor(precio * infoTarjeta.cashback);
  }

  if (tipoPago === 'efectivo') cuenta.efectivo -= precio;
  else cuenta.banco = (cuenta.banco - precio) + cashbackGanado;

  if (esTarjeta) {
    cuenta.tarjeta = itemNombre;
  } else {
    if (!cuenta.inventario.includes(itemNombre)) {
      cuenta.inventario.push(itemNombre);
    }
  }

  eco[userId] = cuenta;
  guardarEconomia(eco);
  registrarTransaccion(userId, 'COMPRA', -precio, `Compra: ${itemNombre}`);

  return { exito: true, cuenta, cashbackGanado };
}

module.exports = {
  cargarEconomia,
  guardarEconomia,
  obtenerCuenta,
  obtenerLimiteBanco,
  depositar,
  retirar,
  transferir,
  solicitarPrestamo,
  pagarPrestamo,
  actualizarSaldo,
  procesarCompra,
  TARJETAS
};