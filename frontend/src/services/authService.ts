/**
 * Servicio de autenticación con almacenamiento EN MEMORIA.
 *
 * TEMPORAL: cuando se integre la base de datos este módulo se reemplaza por
 * llamadas al backend. Los usuarios semilla (admin/1234 y chofer/1234), las
 * cuentas registradas y los cambios de contraseña viven solo mientras la app
 * está abierta.
 */

export type RolUsuario = 'admin' | 'chofer';

export interface Usuario {
    usuario: string;
    contrasena: string;
    rol: RolUsuario;
    nombreCompleto: string;
}

export type ResultadoSesion =
    | { exito: true; usuario: Usuario }
    | { exito: false; error: string };

export type ResultadoOperacion =
    | { exito: true; mensaje: string }
    | { exito: false; error: string };

const usuarios: Usuario[] = [
    { usuario: 'admin', contrasena: '1234', rol: 'admin', nombreCompleto: 'Administrador LogiTrack' },
    { usuario: 'chofer', contrasena: '1234', rol: 'chofer', nombreCompleto: 'Marcos Di Palma' },
];

function buscarUsuario(usuario: string): Usuario | undefined {
    const limpio = usuario.trim().toLowerCase();
    return usuarios.find((u) => u.usuario === limpio);
}

export function existeUsuario(usuario: string): boolean {
    return !!buscarUsuario(usuario);
}

export function iniciarSesion(usuario: string, contrasena: string): ResultadoSesion {
    if (!usuario.trim() || !contrasena.trim()) {
        return { exito: false, error: 'Por favor, completá todos los campos.' };
    }

    const encontrado = buscarUsuario(usuario);
    if (!encontrado || encontrado.contrasena !== contrasena.trim()) {
        return { exito: false, error: 'Usuario o contraseña incorrectos.' };
    }

    return { exito: true, usuario: encontrado };
}

export interface DatosRegistro {
    nombreCompleto: string;
    usuario: string;
    contrasena: string;
    confirmacion: string;
    rol: RolUsuario;
}

export function registrarUsuario(datos: DatosRegistro): ResultadoOperacion {
    const nombre = datos.nombreCompleto.trim();
    const usuario = datos.usuario.trim().toLowerCase();

    if (nombre.length < 3) {
        return { exito: false, error: 'Ingresá tu nombre completo.' };
    }
    if (!/^[a-z0-9._-]{3,20}$/.test(usuario)) {
        return {
            exito: false,
            error: 'El usuario debe tener entre 3 y 20 caracteres (letras, números, punto, guión).',
        };
    }
    if (existeUsuario(usuario)) {
        return { exito: false, error: `El usuario "${usuario}" ya está registrado.` };
    }
    if (datos.contrasena.length < 4) {
        return { exito: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
    }
    if (datos.contrasena !== datos.confirmacion) {
        return { exito: false, error: 'Las contraseñas no coinciden.' };
    }

    usuarios.push({
        usuario,
        contrasena: datos.contrasena,
        rol: datos.rol,
        nombreCompleto: nombre,
    });

    return { exito: true, mensaje: `Cuenta creada. Ya podés ingresar como "${usuario}".` };
}

export function restablecerContrasena(
    usuario: string,
    nueva: string,
    confirmacion: string
): ResultadoOperacion {
    const encontrado = buscarUsuario(usuario);

    if (!encontrado) {
        return { exito: false, error: 'No encontramos una cuenta con ese usuario.' };
    }
    if (nueva.length < 4) {
        return { exito: false, error: 'La nueva contraseña debe tener al menos 4 caracteres.' };
    }
    if (nueva !== confirmacion) {
        return { exito: false, error: 'Las contraseñas no coinciden.' };
    }

    encontrado.contrasena = nueva;
    return { exito: true, mensaje: 'Contraseña actualizada. Ya podés iniciar sesión.' };
}
