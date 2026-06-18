import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { consultar, pool } from '../db/pool.js';
import { autenticar, exigirRol, firmarToken } from '../middleware/auth.js';
import { verificarIdentidad } from '../servicios/verificacionIdentidad.js';
import { compararCaras } from '../servicios/faceMatch.js';

function base64ABuffer(valor) {
    if (typeof valor !== 'string' || !valor) return null;
    return Buffer.from(valor.replace(/^data:image\/\w+;base64,/, ''), 'base64');
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export const rutasChoferes = Router();
function generarCodigo() {
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(6);
    let codigo = '';
    for (const b of bytes) codigo += alfabeto[b % alfabeto.length];
    return `CH-${codigo}`;
}

async function guardarSelfie(codigo, base64) {
    if (!base64) return null;
    const limpio = base64.replace(/^data:image\/\w+;base64,/, '');
    const dir = join(__dirname, '..', '..', 'uploads', 'choferes');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${codigo}.jpg`), Buffer.from(limpio, 'base64'));
    return `uploads/choferes/${codigo}.jpg`;
}

rutasChoferes.post('/postulacion', autenticar, exigirRol('cliente'), async (req, res) => {
    const nombreCompleto = (req.body?.nombreCompleto || '').trim();
    const email = (req.body?.email || '').trim().toLowerCase();
    const telefono = (req.body?.telefono || '').trim();
    const domicilio = (req.body?.domicilio || '').trim();
    const dni = (req.body?.dni || '').replace(/\D/g, '');
    const escaneoFacialOk = Boolean(req.body?.escaneoFacialOk);
    const dniEscaneado = typeof req.body?.dniEscaneado === 'string' ? req.body.dniEscaneado : '';
    const selfieBase64 = typeof req.body?.selfieBase64 === 'string' ? req.body.selfieBase64 : null;
    const dniFrenteBase64 = typeof req.body?.dniFrenteBase64 === 'string' ? req.body.dniFrenteBase64 : null;
    const livenessOk = typeof req.body?.livenessOk === 'boolean' ? req.body.livenessOk : null;

    if (nombreCompleto.length < 5) {
        return res.status(400).json({ exito: false, error: 'Ingresá tu nombre completo como figura en el DNI.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ exito: false, error: 'Ingresá un email válido.' });
    }
    if (telefono.replace(/\D/g, '').length < 8) {
        return res.status(400).json({ exito: false, error: 'Ingresá un teléfono válido.' });
    }
    if (domicilio.length < 6) {
        return res.status(400).json({ exito: false, error: 'Ingresá tu domicilio de residencia completo.' });
    }

    const dniUsado = await consultar('SELECT 1 FROM choferes WHERE dni = $1', [dni]);
    if (dniUsado.rowCount > 0) {
        return res.status(409).json({ exito: false, error: 'Ya existe un chofer registrado con ese DNI.' });
    }

    const verificacion = await verificarIdentidad({ nombreCompleto, dni, dniEscaneado, escaneoFacialOk, livenessOk });
    if (!verificacion.aprobada) {
        return res.status(422).json({ exito: false, error: verificacion.motivo });
    }

    let faceMatchScore = null;
    const match = await compararCaras(base64ABuffer(selfieBase64), base64ABuffer(dniFrenteBase64));
    if (match.disponible && match.caraDetectada) {
        faceMatchScore = Number(match.distancia.toFixed(4));
        if (process.env.FACE_MATCH_REQUERIDO === 'true' && !match.coincide) {
            return res.status(422).json({ exito: false, error: 'La selfie no coincide con la foto de tu DNI. Reintentá la verificación.' });
        }
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        let codigo = generarCodigo();
        for (let i = 0; i < 5; i++) {
            const choque = await cliente.query('SELECT 1 FROM choferes WHERE codigo = $1', [codigo]);
            if (choque.rowCount === 0) break;
            codigo = generarCodigo();
        }

        const selfiePath = await guardarSelfie(codigo, selfieBase64);

        await cliente.query(
            `INSERT INTO choferes
                 (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni,
                  escaneo_facial_ok, verificacion_renaper, renaper_modo, metodo_verificacion,
                  selfie_path, liveness_ok, face_match_score, verificado_en)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'aprobada', $9, $10, $11, $12, $13, now())`,
            [codigo, req.usuario.id, nombreCompleto, email, telefono, domicilio, dni,
             escaneoFacialOk, verificacion.modo === 'real' ? 'real' : 'simulado',
             verificacion.modo, selfiePath, livenessOk, faceMatchScore]
        );

        const actualizado = await cliente.query(
            `UPDATE usuarios SET rol = 'chofer', nombre_completo = $1
             WHERE id = $2 RETURNING *`,
            [nombreCompleto, req.usuario.id]
        );

        await cliente.query('COMMIT');

        const fila = actualizado.rows[0];
        return res.status(201).json({
            exito: true,
            mensaje: `¡Bienvenido al equipo! Tu ID de chofer es ${codigo}.`,
            token: firmarToken(fila),
            usuario: {
                id: fila.id,
                usuario: fila.usuario,
                rol: fila.rol,
                nombreCompleto: fila.nombre_completo,
                chofer: { codigo },
            },
            renaperModo: verificacion.modo,
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        throw e;
    } finally {
        cliente.release();
    }
});
