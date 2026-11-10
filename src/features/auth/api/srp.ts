import { hmacSha256, sha256 } from './sha256';

// SRP-6a no formato do Cognito (fluxo USER_SRP_AUTH): a senha nunca sai do
// aparelho. Analogia: é um challenge-response em que o servidor guarda só um
// "verificador" derivado da senha, e cada login prova que conhecemos a senha
// assinando um desafio com uma chave que só os dois lados conseguem derivar.
//
// Segue byte a byte o AuthenticationHelper do amazon-cognito-identity-js
// (grupo de 3072 bits da RFC 5054, g = 2, padHex no estilo do BigInteger do
// Java, HKDF com "Caldera Derived Key"). O teste confere contra um vetor gerado
// por essa biblioteca. BigInt existe no Hermes e em todos os navegadores atuais.

const N = BigInt(
  '0x' +
    'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DD' +
    'EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED' +
    'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F' +
    '83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B' +
    'E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA0510' +
    '15728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7' +
    'ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200C' +
    'BBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF',
);
const G = BigInt(2);
const ZERO = BigInt(0);
const ONE = BigInt(1);

const utf8 = (s: string) => new TextEncoder().encode(s);

export function hexParaBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

const bytesParaHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const paraBigInt = (bytes: Uint8Array) =>
  bytes.length ? BigInt('0x' + bytesParaHex(bytes)) : ZERO;

function concatenar(...partes: Uint8Array[]): Uint8Array {
  const saida = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let pos = 0;
  for (const p of partes) {
    saida.set(p, pos);
    pos += p.length;
  }
  return saida;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ParaBytes(b64: string): Uint8Array {
  const limpo = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const saida: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const c of limpo) {
    buffer = (buffer << 6) | B64.indexOf(c);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      saida.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(saida);
}

export function bytesParaBase64(bytes: Uint8Array): string {
  let saida = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a = 0, b = 0, c = 0] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | (b << 8) | c;
    saida += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!;
    saida += i + 1 < bytes.length ? B64[(n >> 6) & 63]! : '=';
    saida += i + 2 < bytes.length ? B64[n & 63]! : '=';
  }
  return saida;
}

/** Hex sem ambiguidade de sinal, como o toByteArray() do BigInteger do Java. Só positivos. */
export function padHex(n: bigint): string {
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  return /^[89a-f]/i.test(hex) ? '00' + hex : hex;
}

const hashHex = (bytes: Uint8Array) => bytesParaHex(sha256(bytes));
const hexHash = (hex: string) => hashHex(hexParaBytes(hex));

function modPow(base: bigint, expoente: bigint, mod: bigint): bigint {
  let resultado = ONE;
  let b = ((base % mod) + mod) % mod;
  let e = expoente;
  while (e > ZERO) {
    if (e & ONE) resultado = (resultado * b) % mod;
    e >>= ONE;
    b = (b * b) % mod;
  }
  return resultado;
}

const K = BigInt('0x' + hexHash(padHex(N) + padHex(G)));

export type EstadoSrp = { a: bigint; A: bigint };

/**
 * Gera o par efêmero do cliente. `aleatorio(n)` devolve n bytes de uma fonte
 * criptográfica (crypto.getRandomValues).
 */
export function iniciarSrp(aleatorio: (n: number) => Uint8Array): EstadoSrp {
  const a = paraBigInt(aleatorio(128)) % N;
  const A = modPow(G, a, N);
  if (a === ZERO || A % N === ZERO) throw new Error('SRP: valor aleatório inválido');
  return { a, A };
}

/** Parâmetros do desafio PASSWORD_VERIFIER devolvidos pelo InitiateAuth. */
export type DesafioSrp = {
  SALT: string;
  SECRET_BLOCK: string;
  SRP_B: string;
  USER_ID_FOR_SRP: string;
};

export type RespostaSrp = {
  USERNAME: string;
  PASSWORD_CLAIM_SECRET_BLOCK: string;
  TIMESTAMP: string;
  PASSWORD_CLAIM_SIGNATURE: string;
};

const DIAS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Carimbo exigido pelo Cognito, em UTC e em inglês, com o dia sem zero à esquerda. */
export function carimboDeTempo(d: Date): string {
  const dois = (n: number) => String(n).padStart(2, '0');
  return (
    `${DIAS[d.getUTCDay()]} ${MESES[d.getUTCMonth()]} ${d.getUTCDate()} ` +
    `${dois(d.getUTCHours())}:${dois(d.getUTCMinutes())}:${dois(d.getUTCSeconds())} UTC ${d.getUTCFullYear()}`
  );
}
// carimboDeTempo(new Date('2026-11-03T09:05:07Z')) // => "Tue Nov 3 09:05:07 UTC 2026"

/**
 * Responde ao desafio PASSWORD_VERIFIER. `userPoolId` é o id completo
 * (us-east-1_Abc123); o SRP usa só a parte depois do "_".
 */
export function responderDesafio(p: {
  userPoolId: string;
  estado: EstadoSrp;
  desafio: DesafioSrp;
  senha: string;
  agora: Date;
}): RespostaSrp {
  const { a, A } = p.estado;
  const pool = p.userPoolId.split('_')[1] ?? '';
  const usuario = p.desafio.USER_ID_FOR_SRP;

  const B = BigInt('0x' + p.desafio.SRP_B);
  if (B % N === ZERO) throw new Error('SRP: B inválido');
  const u = BigInt('0x' + hexHash(padHex(A) + padHex(B)));
  if (u === ZERO) throw new Error('SRP: u inválido');

  const salt = BigInt('0x' + p.desafio.SALT);
  const x = BigInt('0x' + hexHash(padHex(salt) + hashHex(utf8(`${pool}${usuario}:${p.senha}`))));
  const S = modPow(B - K * modPow(G, x, N), a + u * x, N);

  // HKDF-SHA256 com uma única rodada: 16 bytes de chave.
  const prk = hmacSha256(hexParaBytes(padHex(u)), hexParaBytes(padHex(S)));
  const chave = hmacSha256(prk, concatenar(utf8('Caldera Derived Key'), new Uint8Array([1]))).slice(
    0,
    16,
  );

  const timestamp = carimboDeTempo(p.agora);
  const mensagem = concatenar(
    utf8(pool),
    utf8(usuario),
    base64ParaBytes(p.desafio.SECRET_BLOCK),
    utf8(timestamp),
  );
  return {
    USERNAME: usuario,
    PASSWORD_CLAIM_SECRET_BLOCK: p.desafio.SECRET_BLOCK,
    TIMESTAMP: timestamp,
    PASSWORD_CLAIM_SIGNATURE: bytesParaBase64(hmacSha256(chave, mensagem)),
  };
}
