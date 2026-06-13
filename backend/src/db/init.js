import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ADMINS = [
    { usuario: 'ccchimi', contrasena: 'ccchimi' },
    { usuario: 'melirm', contrasena: 'melirm' },
    { usuario: 'claukev', contrasena: 'claukev' },
];

async function asegurarBaseDeDatos() {
    const nombre = process.env.PGDATABASE || 'logitrack';
    const cliente = new pg.Client({ database: 'postgres' });
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

export async function inicializarBaseDeDatos() {
    await asegurarBaseDeDatos();
    await aplicarEsquema();
    await sembrarAdmins();
    console.log('Base de datos lista (esquema aplicado y admins sembrados).');
}

if (process.argv.includes('--standalone')) {
    inicializarBaseDeDatos()
        .then(() => process.exit(0))
        .catch((e) => {
            console.error('Error inicializando la base de datos:', e.message);
            process.exit(1);
        });
}
