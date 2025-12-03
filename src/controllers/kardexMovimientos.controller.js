// src/controllers/kardexMovimientos.controller.js
const { getPool, sql } = require('../db');

/**
 * 📊 Obtener registros de Kardex usando usp_ObtenerKardexDetallado
 * Este SP devuelve el kardex con saldos calculados correctamente
 */
async function getKardexMovimientos(req, res, next) {
  try {
    const { fechaInicio, fechaFin } = req.query;

    console.log('📥 Consulta Kardex Detallado:', { fechaInicio, fechaFin });

    // Validar parámetros
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren fechaInicio y fechaFin'
      });
    }

    const pool = await getPool();

    // ✅ Ejecutar stored procedure con las fechas
    const result = await pool.request()
      .input('FechaInicio', sql.Date, fechaInicio)
      .input('FechaFin', sql.Date, fechaFin)
      .execute('dbo.usp_ObtenerKardexDetallado');

    console.log('✅ Registros obtenidos:', result.recordset.length);

    // Log de muestra de datos
    if (result.recordset.length > 0) {
      console.log('📊 Primer registro:', result.recordset[0]);
      console.log('📊 Último registro:', result.recordset[result.recordset.length - 1]);
    }

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('❌ Error en getKardexMovimientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener kardex',
      error: error.message
    });
  }
}



async function crearKardexMovimiento(req, res, next) {
  try {
    const {
      kardexIn,
      remisionIn,
      cisternaIn
    } = req.body;

    console.log('📥 Datos recibidos para crear kardex:', req.body);

    // Validación básica
    if (!kardexIn || kardexIn <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El Kardex IN es obligatorio y debe ser mayor a 0'
      });
    }

    const pool = await getPool();

    // ✅ Ejecutar stored procedure para insertar
    const result = await pool.request()
      .input('KardexIn', sql.Float, kardexIn)
      .input('RemisionIn', sql.VarChar(50), remisionIn || null)
      .input('CisternaIn', sql.VarChar(250), cisternaIn || null)
      .execute('dbo.usp_InsertKardexMovimiento');

    console.log('✅ Kardex insertado:', result.recordset[0]);

    res.status(201).json({
      success: true,
      message: 'Kardex registrado correctamente',
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('❌ Error al crear kardex:', error);

    // ✅ Detectar error de remisión duplicada
    if (error.message && error.message.includes('ya está registrada')) {
      return res.status(409).json({
        success: false,
        message: error.message,
        errorType: 'DUPLICATE_REMISION'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear kardex',
      error: error.message
    });
  }
}



/**
 * 🔄 Actualizar registro de Kardex
 */
async function actualizarKardexMovimiento(req, res, next) {
  try {
    const { id } = req.params;
    const {
      kardexIn,
      remisionIn,
      cisternaIn,
      produccionOut
    } = req.body || {};

    console.log('📝 Actualizando kardex:', { id, ...req.body });

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de kardex inválido'
      });
    }

    const pool = await getPool();

    // Verificar que existe
    const check = await pool.request()
      .input('idKardex', sql.Int, parseInt(id))
      .query('SELECT IdKardex, RemisionIn FROM KardexMovimientos WHERE IdKardex = @idKardex');

    if (check.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registro de kardex no encontrado'
      });
    }

    // ✅ Verificar si la nueva remisión ya existe (si cambió)
    if (remisionIn && remisionIn.trim() !== '' && remisionIn !== check.recordset[0].RemisionIn) {
      const checkRemision = await pool.request()
        .input('remision', sql.VarChar(50), remisionIn.trim())
        .input('idKardex', sql.Int, parseInt(id))
        .query(`
          SELECT IdKardex, RemisionIn, TimeStamp 
          FROM KardexMovimientos 
          WHERE RemisionIn = @remision AND IdKardex != @idKardex
        `);

      if (checkRemision.recordset.length > 0) {
        return res.status(409).json({
          success: false,
          message: `La remisión "${remisionIn}" ya está registrada en otro kardex`,
          errorType: 'DUPLICATE_REMISION'
        });
      }
    }

    // Actualizar
    await pool.request()
      .input('idKardex', sql.Int, parseInt(id))
      .input('kardexIn', sql.Float, parseFloat(kardexIn) || 0)
      .input('remisionIn', sql.VarChar(50), remisionIn || null)
      .input('cisternaIn', sql.VarChar(250), cisternaIn || null)
      .input('produccionOut', sql.Float, parseFloat(produccionOut) || 0)
      .query(`
        UPDATE KardexMovimientos 
        SET 
          KardexIn = @kardexIn,
          RemisionIn = @remisionIn,
          CisternaIn = @cisternaIn,
          ProduccionOut = @produccionOut
        WHERE IdKardex = @idKardex
      `);

    console.log('✅ Kardex actualizado correctamente:', id);

    res.json({
      success: true,
      message: 'Kardex actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en actualizarKardexMovimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar kardex',
      error: error.message
    });
  }
}

/**
 * 🗑️ Eliminar registro de Kardex
 */
async function eliminarKardexMovimiento(req, res, next) {
  try {
    const { id } = req.params;

    console.log('🗑️ Eliminando kardex:', id);

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de kardex inválido'
      });
    }

    const pool = await getPool();

    // Verificar que existe
    const check = await pool.request()
      .input('idKardex', sql.Int, parseInt(id))
      .query('SELECT IdKardex, RemisionIn FROM KardexMovimientos WHERE IdKardex = @idKardex');

    if (check.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registro de kardex no encontrado'
      });
    }

    // Eliminar
    await pool.request()
      .input('idKardex', sql.Int, parseInt(id))
      .query('DELETE FROM KardexMovimientos WHERE IdKardex = @idKardex');

    console.log('✅ Kardex eliminado correctamente:', id);

    res.json({
      success: true,
      message: 'Kardex eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en eliminarKardexMovimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar kardex',
      error: error.message
    });
  }
}

module.exports = {
  getKardexMovimientos,
  crearKardexMovimiento,
  actualizarKardexMovimiento,
  eliminarKardexMovimiento
};