// src/controllers/kardexMovimientos.controller.js
const { getPool, sql } = require('../db');

/**
 * 📊 Obtener registros de Kardex
 */
async function getKardexMovimientos(req, res, next) {
  try {
    const { op, p1, p2, p3, p4, p5 } = req.query;

    console.log('📥 Consulta Kardex Movimientos:', { op, p1, p2, p3, p4, p5 });

    const pool = await getPool();

    const result = await pool.request()
      .input('op', sql.Int, parseInt(op) || 1)
      .input('p1', sql.VarChar(sql.MAX), p1 || '0')
      .input('p2', sql.VarChar(sql.MAX), p2 || '0')
      .input('p3', sql.VarChar(sql.MAX), p3 || '0')
      .input('p4', sql.VarChar(sql.MAX), p4 || '0')
      .input('p5', sql.VarChar(sql.MAX), p5 || '0')
      .execute('dbo.usp_GetKardexMovimientos');

    console.log('✅ Registros obtenidos:', result.recordset.length);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('❌ Error en getKardexMovimientos:', error);
    next(error);
  }
}

/**
 * 💾 Crear nuevo registro de Kardex (ENTRADA)
 */

async function crearKardexMovimiento(req, res, next) {
  try {
    const {
      kardexIn,
      remisionIn,
      cisternaIn
    } = req.body;

    console.log('📥 Datos recibidos:', req.body);

    // Validación
    if (!kardexIn || kardexIn <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El Kardex IN es obligatorio y debe ser mayor a 0'
      });
    }

    const pool = await getPool();

    // ✅ Solo 3 parámetros
    const result = await pool.request()
      .input('KardexIn', sql.Float, kardexIn)
      .input('RemisionIn', sql.VarChar(50), remisionIn || null)
      .input('CisternaIn', sql.VarChar(250), cisternaIn || null)
      .execute('usp_InsertKardexMovimiento');

    console.log('✅ Kardex insertado:', result.recordset[0]);

    res.json({
      success: true,
      message: 'Kardex registrado correctamente',
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('❌ Error:', error);
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
      .query('SELECT IdKardex FROM KardexMovimientos WHERE IdKardex = @idKardex');

    if (check.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registro de kardex no encontrado'
      });
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

    console.log('✅ Kardex actualizado:', id);

    res.json({
      success: true,
      message: 'Kardex actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en actualizarKardexMovimiento:', error);
    next(error);
  }
}

/**
 * 🗑️ Eliminar registro de Kardex
 */
async function eliminarKardexMovimiento(req, res, next) {
  try {
    const { id } = req.params;

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
      .query('SELECT IdKardex FROM KardexMovimientos WHERE IdKardex = @idKardex');

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

    console.log('✅ Kardex eliminado:', id);

    res.json({
      success: true,
      message: 'Kardex eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en eliminarKardexMovimiento:', error);
    next(error);
  }
}

module.exports = {
  getKardexMovimientos,
  crearKardexMovimiento,
  actualizarKardexMovimiento,
  eliminarKardexMovimiento
};