const ORDENES = {
    recientes: 'creado_en DESC, id DESC',
    antiguos: 'creado_en ASC, id ASC',
    nombre_az: 'nombre_completo ASC, id ASC',
    nombre_za: 'nombre_completo DESC, id DESC',
};

function invalido(mensaje) {
    const error = new Error(mensaje);
    error.status = 400;
    throw error;
}

function texto(valor, nombre) {
    if (valor === undefined) return '';
    if (typeof valor !== 'string') invalido(`El filtro ${nombre} no es válido.`);
    return valor.trim();
}

function fecha(valor) {
    if (!valor) return '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number(valor.slice(0, 4)) < 1) {
        invalido('Ingresá fechas válidas con formato AAAA-MM-DD.');
    }
    const instante = new Date(`${valor}T00:00:00Z`);
    if (!Number.isFinite(instante.getTime()) || instante.toISOString().slice(0, 10) !== valor) {
        invalido('Ingresá fechas válidas con formato AAAA-MM-DD.');
    }
    return valor;
}

export function consultaUsuariosAdmin(query = {}) {
    const busqueda = texto(query.busqueda, 'búsqueda');
    const rol = texto(query.rol, 'rol') || 'todos';
    const orden = texto(query.orden, 'orden') || 'recientes';
    const desde = fecha(texto(query.desde, 'desde'));
    const hasta = fecha(texto(query.hasta, 'hasta'));
    const pagina = texto(query.pagina, 'página') || '1';
    const cantidad = texto(query.cantidad, 'cantidad') || '25';
    if (busqueda.length > 120) invalido('La búsqueda admite hasta 120 caracteres.');
    if (!['todos', 'cliente', 'chofer', 'admin'].includes(rol)) invalido('El rol no es válido.');
    if (!Object.hasOwn(ORDENES, orden)) invalido('El orden no es válido.');
    if (!/^[1-9]\d*$/.test(pagina) || !Number.isSafeInteger(Number(pagina))) invalido('La página no es válida.');
    if (!['10', '25', '50', '100'].includes(cantidad)) invalido('La cantidad por página no es válida.');
    if (desde && hasta && desde > hasta) invalido('La fecha desde debe ser anterior o igual a hasta.');

    const params = [];
    const condiciones = [];
    const agregar = (valor) => { params.push(valor); return `$${params.length}`; };
    if (rol !== 'todos') condiciones.push(`rol = ${agregar(rol)}`);
    if (busqueda) {
        const normalizada = busqueda.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const patron = `%${normalizada.replace(/[\\%_]/g, '\\$&')}%`;
        condiciones.push(`translate(lower(concat_ws(' ', id::text, usuario, nombre_completo, codigo_chofer, email, telefono)), 'áéíóúüñ', 'aeiouun') LIKE ${agregar(patron)} ESCAPE E'\\\\'`);
    }
    if (desde) condiciones.push(`creado_en >= (${agregar(desde)}::date::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')`);
    if (hasta) condiciones.push(`creado_en < ((${agregar(hasta)}::date + 1)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')`);
    const limite = agregar(Number(cantidad));
    const paginaSolicitada = agregar(Number(pagina));
    return {
        texto: `WITH base AS (
            SELECT u.id, u.usuario, u.nombre_completo, u.rol, u.creado_en,
                   c.codigo AS codigo_chofer, c.email, c.telefono
            FROM usuarios u LEFT JOIN choferes c ON c.usuario_id = u.id
            WHERE u.eliminado_en IS NULL
        ), filtrados AS (
            SELECT * FROM base ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
        ), conteo AS (
            SELECT COUNT(*)::int AS total FROM filtrados
        ), paginacion AS (
            SELECT total, GREATEST(1, CEIL(total::numeric / ${limite})::int) AS paginas,
                   LEAST(${paginaSolicitada}::bigint, GREATEST(1, CEIL(total::numeric / ${limite})::int))::int AS pagina
            FROM conteo
        ), resumen AS (
            SELECT COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE rol = 'cliente')::int AS clientes,
                   COUNT(*) FILTER (WHERE rol = 'chofer')::int AS choferes,
                   COUNT(*) FILTER (WHERE rol = 'admin')::int AS administradores
            FROM base
        ), listado AS (
            SELECT id, usuario, nombre_completo AS "nombreCompleto", rol,
                   creado_en AS "creadoEn", codigo_chofer AS "codigoChofer", email, telefono,
                   ROW_NUMBER() OVER (ORDER BY ${ORDENES[orden]}) AS posicion
            FROM filtrados ORDER BY ${ORDENES[orden]}
            LIMIT ${limite} OFFSET (SELECT (pagina - 1) * ${limite}::bigint FROM paginacion)
        )
        SELECT p.*, ${limite}::int AS cantidad, row_to_json(r) AS resumen,
               COALESCE((SELECT json_agg(row_to_json(l)::jsonb - 'posicion' ORDER BY posicion) FROM listado l), '[]'::json) AS usuarios
        FROM paginacion p CROSS JOIN resumen r`,
        params,
    };
}
