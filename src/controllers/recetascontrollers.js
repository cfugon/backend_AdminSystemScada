const { sql, getPool } = require('../db');


//con procedimiento almacenado
async function getRecetas(req, res) {
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
      .input('p5', sql.VarChar(sql.MAX), p5 || null)


    const result = await request.execute('usp_GetRecetas'); // llamar al procedimiento almacenado


    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error al obtener recetas:', err);
    res.status(500).json({ success: false, message: 'Error al obtener Recetas' });
  }
}


// ============================================
// CREAR RECETA (usa usp_PostRecetas)
// ============================================
async function postCrearRecetas(req, res) {
  console.log('📥 POST crear receta ejecutado');
  try {
    const {
      codigo,
      cemento,
      agua,
      resistencia,
      arena,
      gravaTipo1,
      gravaTipo2,
      aditivo1,
      aditivo2,
      estado
    } = req.body;

    // Validación
    if (!codigo || codigo.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El código de receta es obligatorio'
      });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input('op', sql.Int, 1) // op = 1 para insertar
      .input('p1', sql.VarChar(sql.MAX), codigo.trim())
      .input('p2', sql.VarChar(sql.MAX), (cemento ?? 0).toString())
      .input('p3', sql.VarChar(sql.MAX), (agua ?? 0).toString())
      .input('p4', sql.VarChar(sql.MAX), (resistencia ?? 0).toString())
      .input('p5', sql.VarChar(sql.MAX), (arena ?? 0).toString())
      .input('p6', sql.VarChar(sql.MAX), (gravaTipo1 ?? 0).toString())
      .input('p7', sql.VarChar(sql.MAX), (gravaTipo2 ?? 0).toString())
      .input('p8', sql.VarChar(sql.MAX), (aditivo1 ?? 0).toString())
      .input('p9', sql.VarChar(sql.MAX), (aditivo2 ?? 0).toString())
      .input('p10', sql.VarChar(sql.MAX), estado ? '1' : '0')
      .execute('usp_PostRecetas'); // 👈 CORRECTO

    res.json({
      success: true,
      message: 'Receta creada exitosamente',
      data: result.recordset[0]
    });

  } catch (err) {
    console.error('❌ Error al crear receta:', err);
    res.status(500).json({
      success: false,
      message: 'Error al crear la receta'
    });
  }
}


// ============================================
// ACTUALIZAR RECETA (con tipos correctos)
// ============================================

async function postActualizarRecetas(req, res) {
  console.log('📥 POST actualizar receta ejecutado');
  try {
    const { id, Estado } = req.body;

    const pool = await getPool();

    const result = await pool.request()
      .input('op', sql.VarChar(sql.MAX), '2')           // op como VARCHAR
      .input('p1', sql.VarChar(sql.MAX), id.toString()) // id como VARCHAR 
      .input('p2', sql.VarChar(sql.MAX), Estado ? '1' : '0') // Estado como '1' o '0'
      .input('p3', sql.VarChar(sql.MAX), null)           // parámetros opcionales como null
      .input('p4', sql.VarChar(sql.MAX), null)
      .input('p5', sql.VarChar(sql.MAX), null)
      .input('p6', sql.VarChar(sql.MAX), null)
      .input('p7', sql.VarChar(sql.MAX), null)
      .input('p8', sql.VarChar(sql.MAX), null)
      .input('p9', sql.VarChar(sql.MAX), null)
      .input('p10', sql.VarChar(sql.MAX), null)
      .execute('usp_PostRecetas');

    res.json({
      success: true,
      message: 'Receta actualizada exitosamente'
    });

  } catch (err) {
    console.error('❌ Error al actualizar receta:', err);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la receta',
      err
    });
  }
}





module.exports = { getRecetas, postCrearRecetas, postActualizarRecetas };