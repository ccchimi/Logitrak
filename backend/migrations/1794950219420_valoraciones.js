export const up = (pgm) => {
    pgm.createTable('valoraciones', {
        id: 'id',
        envio_id: { type: 'integer', notNull: true, unique: true, references: 'envios', onDelete: 'CASCADE' },
        chofer_id: { type: 'integer', notNull: true, references: 'choferes', onDelete: 'CASCADE' },
        cliente_id: { type: 'integer', references: 'usuarios', onDelete: 'SET NULL' },
        puntaje: { type: 'smallint', notNull: true, check: 'puntaje BETWEEN 1 AND 5' },
        comentario: { type: 'text', check: 'char_length(comentario) <= 500' },
        creado_en: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    }, { ifNotExists: true });
    pgm.createIndex('valoraciones', ['chofer_id', { name: 'creado_en', sort: 'DESC' }], {
        name: 'idx_valoraciones_chofer',
        ifNotExists: true,
    });
    pgm.sql('ALTER TABLE valoraciones ENABLE ROW LEVEL SECURITY');
};

export const down = (pgm) => {
    pgm.dropTable('valoraciones', { ifExists: true });
};
