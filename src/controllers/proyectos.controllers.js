const { sql, getPool } = require('../db');

// ============================================
// 🔹 GET - Obtener proyectos
// ============================================
async function getProyectos(req, res) {
  try {
    const { op, p1, p2, p3, p4, p5 } = req.query;
    if (!op) return res.status(400).json({ success: false, message: 'Parámetro "op" requerido' });

    const pool = await getPool();
    const request = pool.request()
      .input('op', sql.Int, parseInt(op, 10))
      .input('p1', sql.VarChar(sql.MAX), p1 || null)
      .input('p2', sql.VarChar(sql.MAX), p2 || null)
      .input('p3', sql.VarChar(sql.MAX), p3 || null)
      .input('p4', sql.VarChar(sql.MAX), p4 || null)
      .input('p5', sql.VarChar(sql.MAX), p5 || null);

    const result = await request.execute('usp_GetProyectos');

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error al obtener los proyectos:', err);
    res.status(500).json({ success: false, message: 'Error al obtener los proyectos' });
  }
}

// ============================================
// 🔹 POST - Agregar nuevo proyecto
// ============================================
async function postProyectos(req, res) {
  try {
    const {
      op,
      clienteId,
      recetaId,
      nombre,
      ubicacion,
      activo,
      proyectoGrandeNumber,
      volumen,
      usuarioId
    } = req.body;


    // Validaciones básicas
    if (!clienteId || !recetaId || !nombre || !ubicacion || volumen === undefined || volumen === null) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos. Campos requeridos: clienteId, recetaId, nombre, ubicacion, volumen' 
      });
    }

    const pool = await getPool();
    const request = pool.request();

    // Cargar parámetros
    request.input('op', sql.Int, op || 1);
    request.input('p1', sql.Int, clienteId);
    request.input('p2', sql.Int, recetaId);
    request.input('p3', sql.VarChar(200), nombre);
    request.input('p4', sql.VarChar(500), ubicacion);
    request.input('p5', sql.Bit, activo ? 1 : 0);
    request.input('p6', sql.Bit, proyectoGrandeNumber ? 1 : 0);
    request.input('p7', sql.Decimal(18, 2), volumen);
    request.input('p8', sql.Int, usuarioId || null);

    // Ejecutar procedimiento
    const result = await request.execute('usp_PostProyectos');


    // Verificar si hay datos en el recordset
    if (!result.recordset || result.recordset.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'El procedimiento no retornó datos'
      });
    }

    const resultData = result.recordset[0];

    // Verificar si fue exitoso
    if (resultData.Success === 0) {
      return res.status(400).json({
        success: false,
        message: resultData.Message || 'Error al crear proyecto',
        error: resultData
      });
    }

    // Respuesta exitosa
    res.json({
      success: true,
      message: resultData.Message,
      data: {
        projectId: resultData.ProjectId,
        orderNumber: resultData.OrderNumber,
        fechaLocal: resultData.FechaLocal
      }
    });

  } catch (err) {
    console.error('❌ Error al insertar proyecto:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al agregar el proyecto',
      error: err.message 
    });
  }
}

module.exports = {
  getProyectos,
  postProyectos
};