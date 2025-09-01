const { sql, getPool } = require('../db');


//con procedimiento almacenado
async function getClientes(req, res) {
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

    console.log('REQUESET', request);

    const result = await request.execute('usp_GetClientes'); // llamar al procedimiento almacenado


    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    res.status(500).json({ success: false, message: 'Error al obtener clientes' });
  }
}

//sin procedimiento almacenado
async function getClientes_test(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      select *
      FROM clientes
      ORDER BY nombre
    `);

    console.log('data',result.recordset);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    res.status(500).json({ success: false, message: 'Error al obtener clientes' });
  }
}

module.exports = { getClientes };