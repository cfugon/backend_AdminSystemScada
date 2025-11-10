const { sql, getPool } = require('../db');


//con procedimiento almacenado
async function getOrders(req, res) {
  try {
    const { op, p1, p2, p3, p4, p5 } = req.query; // parámetros desde la URL
    if (!op) return res.status(400).json({ success: false, message: 'Parámetro "op" requerido' });

    const pool = await getPool();

    const request = pool.request()
      .input('op', sql.Int, parseInt(op, 10))
      .input('p1', sql.VarChar(sql.MAX), p1 || null)
      .input('p2', sql.VarChar(sql.MAX), p2 || null)
      .input('p3', sql.VarChar(sql.MAX), p3 || null)
      .input('p4', sql.VarChar(sql.MAX), p4 || null)
      .input('p5', sql.VarChar(sql.MAX), p5 || null);


      console.log('op', op, 'p1', p1, 'p2', p2);


    const result = await request.execute('usp_GetOrders'); // llamar al procedimiento almacenado

      console.log('op',op);
      console.log('p1',p1);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error al ejecutar acción', err);
    res.status(500).json({ success: false, message: 'Error al ejecutar acción' });
  }
}

//sin procedimiento almacenado
// async function getClientes_test(req, res) {
//   try {
//     const pool = await getPool();
//     const result = await pool.request().query(`
//       select *
//       FROM clientes
//       ORDER BY nombre
//     `);


//     res.json({ success: true, data: result.recordset });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Error al obtener Ordenes' });
//   }
// }

// async function postOrders(req, res) {
//   try {
//     const { clienteId, IdProyecto, volumen, IdReceta, IdUsuario_ } = req.body;

//     // Validaciones básicas
//     if (!clienteId || !IdProyecto || !volumen || !IdUsuario_) {
//       return res.status(400).json({
//         success: false,
//         message: 'Faltan datos obligatorios: clienteId, IdProyecto, volumen, IdUsuario_'
//       });
//     }

//     const pool = await getPool();
//     const request = pool.request();

//     request.input('op', sql.Int, 1); // opcional
//     request.input('p1', sql.Int, clienteId);
//     request.input('p2', sql.Int, IdProyecto);
//     request.input('p3', sql.Decimal(18, 2), volumen);
//     request.input('p4', sql.Int, IdReceta ?? null);
//     request.input('p5', sql.Int, IdUsuario_);

//     const result = await request.execute('usp_PostOrders');

//     const resultData = result.recordset[0];

//     if (!resultData || resultData.Success === 0) {
//       return res.status(400).json({
//         success: false,
//         message: resultData?.Message || 'Error al crear orden'
//       });
//     }

//     res.json({
//       success: true,
//       message: resultData.Message,
//       data: {
//         orderId: resultData.OrderId,
//         orderNumber: resultData.OrderNumber,
//         fecha: resultData.FechaLocal
//       }
//     });

//   } catch (err) {
//     console.error('Error al crear orden:', err);
//     res.status(500).json({
//       success: false,
//       message: 'Error al crear la orden',
//       error: err.message
//     });
//   }
// }


// POST: crear orden

// ============================================
// 🔹 POST - Crear orden
// ============================================
async function postOrders(req, res) {
  try {
    const { clienteId, IdProyecto, volumen, IdReceta, IdUsuario, ProyectoGrande } = req.body;

    // Validación básica
    if (
      clienteId == null ||
      IdProyecto == null ||
      volumen == null ||
      IdUsuario == null ||
      (ProyectoGrande !== 0 && ProyectoGrande !== 1)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos obligatorios o ProyectoGrande inválido: clienteId, IdProyecto, volumen, IdUsuario, ProyectoGrande'
      });
    }

    const pool = await getPool();
    const request = pool.request();

    // ⚡ Usar los nombres exactos de los parámetros del SP
    request.input('ClienteId', sql.Int, clienteId);
    request.input('IdProyecto', sql.Int, IdProyecto);
    request.input('Volumen', sql.Decimal(18,2), volumen);
    request.input('IdReceta', sql.Int, IdReceta ?? null);
    request.input('IdUsuario', sql.Int, IdUsuario);
    request.input('ProyectoGrande', sql.Bit, ProyectoGrande);

    // Ejecutar el procedimiento
    const result = await request.execute('usp_PostOrders');

    const resultData = result.recordset[0];

    if (!resultData || resultData.Success === 0) {
      return res.status(400).json({
        success: false,
        message: resultData?.Message || 'Error al crear orden'
      });
    }

    res.json({
      success: true,
      message: resultData.Message,
      data: {
        orderId: resultData.OrderId,
        orderNumber: resultData.OrderNumber,
        fecha: resultData.FechaLocal
      }
    });

  } catch (err) {
    console.error('Error al crear orden:', err);
    res.status(500).json({
      success: false,
      message: 'Error al crear la orden',
      error: err.message
    });
  }
}



module.exports = { getOrders,postOrders };