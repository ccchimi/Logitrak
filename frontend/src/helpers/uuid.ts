export function nuevoUuid(): string {
    const nativo = (globalThis as any).crypto?.randomUUID;
    if (typeof nativo === 'function') return nativo.call((globalThis as any).crypto);

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.floor(Math.random() * 16);
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}
