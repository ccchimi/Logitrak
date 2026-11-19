import { codigoCompleto, normalizarCodigo, secretoLegible, textoCodigosRespaldo } from "../dobleFactor";

describe("Verificación en dos pasos", () => {
  test("acepta el código de la app aunque lo peguen con espacios", () => {
    expect(normalizarCodigo(" 123 456 ")).toBe("123456");
    expect(normalizarCodigo("1234567")).toBe("123456");
    expect(codigoCompleto("123 456")).toBe(true);
    expect(codigoCompleto("12345")).toBe(false);
  });

  test("acepta un código de respaldo con o sin guion, en mayúsculas o minúsculas", () => {
    expect(normalizarCodigo("ABCD-EFGH")).toBe("abcd-efgh");
    expect(codigoCompleto("abcd-efgh")).toBe(true);
    expect(codigoCompleto("abcdefgh")).toBe(true);
    expect(codigoCompleto("abc-defg")).toBe(false);
  });

  test("muestra el secreto en grupos de 4 y arma el archivo de respaldo", () => {
    expect(secretoLegible("GEZDGNBVGY3TQOJQ")).toBe("GEZD GNBV GY3T QOJQ");
    const texto = textoCodigosRespaldo("ana.admin", ["abcd-efgh", "jkmn-pqrs"], new Date("2026-11-19T15:00:00Z"));
    expect(texto).toContain("Cuenta: ana.admin");
    expect(texto).toContain(" 1. abcd-efgh");
    expect(texto).toContain(" 2. jkmn-pqrs");
    expect(texto).toContain("19/11/2026");
  });
});
