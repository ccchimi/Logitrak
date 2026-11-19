export const CAMPOS_CHOFER = ['email', 'telefono', 'domicilio', 'vehiculoId'];

export const NOMBRE_CAMPO = {
    nombreCompleto: 'nombre',
    email: 'email',
    telefono: 'teléfono',
    domicilio: 'domicilio',
    vehiculoId: 'vehículo',
};

const COLUMNA_CHOFER = { email: 'email', telefono: 'telefono', domicilio: 'domicilio', vehiculoId: 'vehiculo_id' };

export async function perfilParaAdmin(db, id, { bloquear = false } = {}) {
    const { rows } = await db.query(
        `SELECT u.id, u.usuario, u.rol, u.nombre_completo, u.creado_en, u.totp_activado_en,
                c.codigo, c.email, c.telefono, c.domicilio, c.dni, c.vehiculo_id
         FROM usuarios u LEFT JOIN choferes c ON c.usuario_id = u.id
         WHERE u.id = $1 AND u.eliminado_en IS NULL
         ${bloquear ? 'FOR UPDATE OF u' : ''}`,
        [id]
    );
    const f = rows[0];
    if (!f) return null;
    return {
        id: f.id,
        usuario: f.usuario,
        rol: f.rol,
        nombreCompleto: f.nombre_completo,
        creadoEn: f.creado_en,
        dobleFactor: Boolean(f.totp_activado_en),
        chofer: f.codigo
            ? {
                  codigo: f.codigo,
                  email: f.email,
                  telefono: f.telefono,
                  domicilio: f.domicilio,
                  dni: f.dni,
                  vehiculoId: f.vehiculo_id,
              }
            : null,
    };
}

export function cambiosPedidos(perfil, cuerpo) {
    const cambios = {};
    if (cuerpo.nombreCompleto !== undefined && cuerpo.nombreCompleto !== perfil.nombreCompleto) {
        cambios.nombreCompleto = cuerpo.nombreCompleto;
    }
    for (const campo of CAMPOS_CHOFER) {
        if (cuerpo[campo] !== undefined && cuerpo[campo] !== perfil.chofer?.[campo]) cambios[campo] = cuerpo[campo];
    }
    return cambios;
}

export async function aplicarCambios(db, perfil, cambios) {
    if (cambios.nombreCompleto !== undefined) {
        await db.query('UPDATE usuarios SET nombre_completo = $2 WHERE id = $1', [perfil.id, cambios.nombreCompleto]);
    }
    if (!perfil.chofer) return;
    const sets = [];
    const params = [perfil.id];
    for (const [campo, columna] of [['nombreCompleto', 'nombre_completo'], ...Object.entries(COLUMNA_CHOFER)]) {
        if (cambios[campo] !== undefined) {
            params.push(cambios[campo]);
            sets.push(`${columna} = $${params.length}`);
        }
    }
    if (sets.length) await db.query(`UPDATE choferes SET ${sets.join(', ')} WHERE usuario_id = $1`, params);
    // La cuenta guarda el mismo email y teléfono que la ficha del chofer.
    if (cambios.email !== undefined || cambios.telefono !== undefined) {
        await db.query(
            `UPDATE usuarios SET email = COALESCE($2, email), telefono = COALESCE($3, telefono) WHERE id = $1`,
            [perfil.id, cambios.email ?? null, cambios.telefono ?? null]
        );
    }
}

export function listaDeCampos(campos) {
    const nombres = campos.map((c) => NOMBRE_CAMPO[c] ?? c);
    if (nombres.length <= 1) return nombres.join('');
    return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
}
