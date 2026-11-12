import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { migrar } from './migrar.js';
import { registrarError, logger } from '../observabilidad/logger.js';

const ADMINS = [
    { usuario: 'ccchimi', contrasena: 'ccchimi' },
    { usuario: 'melirm', contrasena: 'melirm' },
    { usuario: 'claukev', contrasena: 'claukev' },
];

const VEHICULOS = [
    { id: 'moto',       nombre: 'Motomensajería',          maxKg: 6,     maxBultos: 2,   maxVolumenDm3: 45,    tarifaBase: 1900,  porKg: 130, porBulto: 160, porKm: 95,  velocidadMediaKmh: 32, capacidades: [] },
    { id: 'utilitario', nombre: 'Utilitario liviano',      maxKg: 350,   maxBultos: 15,  maxVolumenDm3: 2500,  tarifaBase: 4300,  porKg: 85,  porBulto: 120, porKm: 140, velocidadMediaKmh: 38, capacidades: ['cadena_frio'] },
    { id: 'furgon',     nombre: 'Furgón mediano',          maxKg: 1500,  maxBultos: 40,  maxVolumenDm3: 9000,  tarifaBase: 7800,  porKg: 70,  porBulto: 100, porKm: 185, velocidadMediaKmh: 42, capacidades: ['cadena_frio', 'carga_voluminosa'] },
    { id: 'camion',     nombre: 'Camión de carga pesada',  maxKg: 12000, maxBultos: 200, maxVolumenDm3: 45000, tarifaBase: 14500, porKg: 55,  porBulto: 85,  porKm: 260, velocidadMediaKmh: 58, capacidades: ['cadena_frio', 'carga_voluminosa', 'mercancia_peligrosa'] },
];

async function sembrarAdmins() {
    for (const admin of ADMINS) {
        const hash = await bcrypt.hash(admin.contrasena, 10);
        await pool.query(
            `INSERT INTO usuarios (usuario, contrasena_hash, rol, nombre_completo)
             VALUES ($1, $2, 'admin', $3)
             ON CONFLICT (usuario) DO NOTHING`,
            [admin.usuario, hash, admin.usuario]
        );
    }
}

async function sembrarVehiculos() {
    for (const v of VEHICULOS) {
        await pool.query(
            `INSERT INTO vehiculos
                 (id, nombre, max_kg, max_bultos, max_volumen_dm3, tarifa_base,
                  por_kg, por_bulto, por_km, velocidad_media_kmh, capacidades)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET
                 nombre = EXCLUDED.nombre,
                 max_kg = EXCLUDED.max_kg,
                 max_bultos = EXCLUDED.max_bultos,
                 max_volumen_dm3 = EXCLUDED.max_volumen_dm3,
                 tarifa_base = EXCLUDED.tarifa_base,
                 por_kg = EXCLUDED.por_kg,
                 por_bulto = EXCLUDED.por_bulto,
                 por_km = EXCLUDED.por_km,
                 velocidad_media_kmh = EXCLUDED.velocidad_media_kmh,
                 capacidades = EXCLUDED.capacidades`,
            [v.id, v.nombre, v.maxKg, v.maxBultos, v.maxVolumenDm3, v.tarifaBase,
             v.porKg, v.porBulto, v.porKm, v.velocidadMediaKmh, v.capacidades]
        );
    }
}

// Al arrancar se aplican las migraciones pendientes y después los datos base
// (admins y flota), que no son esquema y se reafirman en cada arranque.
export async function inicializarBaseDeDatos() {
    const aplicadas = await migrar();
    await sembrarAdmins();
    await sembrarVehiculos();
    logger.info(
        { migraciones: aplicadas },
        aplicadas.length
            ? `Base de datos lista. Migraciones aplicadas: ${aplicadas.join(', ')}.`
            : 'Base de datos lista (sin migraciones pendientes).'
    );
}

if (process.argv.includes('--standalone')) {
    inicializarBaseDeDatos()
        .then(() => process.exit(0))
        .catch((e) => {
            registrarError(e, 'Error inicializando la base de datos');
            process.exit(1);
        });
}