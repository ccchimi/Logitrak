import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { pool, configuracionSsl } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

async function asegurarBaseDeDatos() {
    const nombre = process.env.PGDATABASE || 'logitrak';
    const cliente = new pg.Client({ database: 'postgres', ssl: configuracionSsl() });
    await cliente.connect();
    try {
        const existe = await cliente.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [nombre]
        );
        if (existe.rowCount === 0) {
            await cliente.query(`CREATE DATABASE ${nombre}`);
            console.log(`Base de datos "${nombre}" creada.`);
        }
    } finally {
        await cliente.end();
    }
}

async function aplicarEsquema() {
    const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(sql);
}

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

export async function inicializarBaseDeDatos() {
    await asegurarBaseDeDatos();
    await aplicarEsquema();
    await sembrarAdmins();
    await sembrarVehiculos();
    console.log('Base de datos lista (esquema aplicado, admins y flota sembrados).');
}

if (process.argv.includes('--standalone')) {
    inicializarBaseDeDatos()
        .then(() => process.exit(0))
        .catch((e) => {
            console.error('Error inicializando la base de datos:', e.message);
            process.exit(1);
        });
}