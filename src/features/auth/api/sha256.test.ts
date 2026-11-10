import { hmacSha256, sha256 } from './sha256';

const utf8 = (s: string) => new TextEncoder().encode(s);
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

// Vetores do FIPS 180-4 e da RFC 4231.
it.each([
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  [
    'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  ],
])('sha256(%j)', (entrada, esperado) => {
  expect(hex(sha256(utf8(entrada)))).toBe(esperado);
});

it('sha256 de mensagem com mais de um bloco', () => {
  expect(hex(sha256(utf8('a'.repeat(1000))))).toBe(
    '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3',
  );
});

it('hmacSha256: RFC 4231, casos 2 e 6 (chave maior que o bloco)', () => {
  expect(hex(hmacSha256(utf8('Jefe'), utf8('what do ya want for nothing?')))).toBe(
    '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
  );
  expect(
    hex(
      hmacSha256(
        new Uint8Array(131).fill(0xaa),
        utf8('Test Using Larger Than Block-Size Key - Hash Key First'),
      ),
    ),
  ).toBe('60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54');
});
