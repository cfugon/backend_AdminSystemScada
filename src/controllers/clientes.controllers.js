// controllers/clientesController.js
const { sql, getPool } = require('../db');

/**
 * GET - Obtener clientes (consultas)
 * Usa el SP: usp_GetClientes
 */
async function getClientes(req, res) {
  try {
    const { op, p1, p2, p3, p4, p5 } = req.query;
    
    if (!op) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parámetro "op" requerido' 
      });
    }

    const pool = await getPool();

    const request = pool.request()
      .input('op', sql.Int, parseInt(op, 10))
      .input('p1', sql.VarChar(sql.MAX), p1 || null)
      .input('p2', sql.VarChar(sql.MAX), p2 || null)
      .input('p3', sql.VarChar(sql.MAX), p3 || null)
      .input('p4', sql.VarChar(sql.MAX), p4 || null)
      .input('p5', sql.VarChar(sql.MAX), p5 || null);

    const result = await request.execute('usp_GetClientes');

    res.json({ 
      success: true, 
      data: result.recordset 
    });
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener clientes',
      error: err.message 
    });
  }
}

/**
 * POST - Crear, actualizar o eliminar clientes
 * Usa el SP: usp_PostClientes
 * 
 * Body esperado:
 * {
 *   "op": 1,           // 1=Crear, 2=Actualizar, 3=Eliminar
 *   "rtn": "...",      // p1
 *   "nombre": "...",   // p2
 *   "contacto": "...", // p3 (opcional)
 *   "telefono": "...", // p4 (opcional)
 *   "id": 123          // p5 (requerido para actualizar/eliminar)
 * }
 */
async function postClientes(req, res) {
  try {
    const { op, rtn, nombre, contacto, telefono, id } = req.body;

    // Validar operación
    if (!op) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parámetro "op" requerido. Use: 1=Crear, 2=Actualizar, 3=Eliminar' 
      });
    }

    // Validaciones específicas por operación
    if (op === 1) {
      // Crear: requiere RTN y nombre
      if (!rtn || !nombre) {
        return res.status(400).json({ 
          success: false, 
          message: 'Para crear un cliente se requieren RTN y nombre' 
        });
      }
    } else if (op === 2 || op === 3) {
      // Actualizar o Eliminar: requiere ID
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: 'Para actualizar o eliminar se requiere el ID del cliente' 
        });
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Operación no válida. Use: 1=Crear, 2=Actualizar, 3=Eliminar' 
      });
    }

    const pool = await getPool();

    const request = pool.request()
      .input('op', sql.Int, parseInt(op, 10))
      .input('p1', sql.VarChar(sql.MAX), rtn || null)
      .input('p2', sql.VarChar(sql.MAX), nombre || null)
      .input('p3', sql.VarChar(sql.MAX), contacto || null)
      .input('p4', sql.VarChar(sql.MAX), telefono || null)
      .input('p5', sql.Int, id || null);

    const result = await request.execute('usp_PostClientes');

    // El SP retorna: Resultado, Mensaje, ClienteID (opcional)
    const respuesta = result.recordset[0];

    if (respuesta.Resultado === 1) {
      // Éxito
      res.json({ 
        success: true, 
        message: respuesta.Mensaje,
        data: respuesta.ClienteID ? { id: respuesta.ClienteID } : null
      });
    } else {
      // Error del negocio (validación del SP)
      res.status(400).json({ 
        success: false, 
        message: respuesta.Mensaje 
      });
    }

  } catch (err) {
    console.error('Error en postClientes:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al procesar la solicitud',
      error: err.message 
    });
  }
}


/**
 * GET - Obtener un cliente por ID
 */
async function getClienteById(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID del cliente requerido' 
      });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .query(`
        SELECT id, rtn, nombre, contacto, telefono
        FROM Clientes
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }

    res.json({ 
      success: true, 
      data: result.recordset[0] 
    });
  } catch (err) {
    console.error('Error al obtener cliente:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener cliente',
      error: err.message 
    });
  }
}

module.exports = { 
  getClientes, 
  postClientes,
  getClienteById
};