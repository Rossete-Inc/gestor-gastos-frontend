import {
  base64ParaBytes,
  bytesParaBase64,
  carimboDeTempo,
  hexParaBytes,
  iniciarSrp,
  padHex,
  responderDesafio,
} from './srp';

// Vetor gerado com o AuthenticationHelper do amazon-cognito-identity-js 6.3.12
// (a mesma conta que o Cognito confere), com "a", B, salt e carimbo fixos.
const VETOR_SRP = {
  userPoolId: 'us-east-1_Xyz12AbC',
  a: '1f2e3d4c5b6a79881726354453627180a9b8c7d6e5f40312',
  A:
    '6f67b280b4847d7592303100d4a2b1c5f16fd79a833e031e3c1ea91aae2b15ff4d94f5c6a8d8a6e70e0a1c9453a7ad69' +
    'd0fb95ae6d4826edfd5d13c1293e1a53f519cba298cd94cb93d6d5d6052d511eb465746a9c9c32091895a7b9d854e91a' +
    'cc78add56d1f1ab9f431b3b2bbbfeb8f1d6a56d4f442f5a0356fbfbd844a290e54effe20a775064c83c091790ea36304' +
    'da93a36445e9ca7ada428c3dc54da3c2ec8a4472160c8b11613ceaf837bf89ab6056ab9f7a231387bacaa6a4a31d14e9' +
    'fedc3c45b8c5a26ab8e6dc95203b60cc291601ce2b4a836e152565bb7db80b10cc39b09b17ec7e9c67370971ef380185' +
    'faba7e95612e4ccbe318f2c8bc48c396189d31be3e25bca4305c1e5fc79b99be806366d220500de85a02a96379070cb4' +
    'cf9a3c48dbdc9048ecbaddc32f845b8cabb5db4137184626e86f2d64be523f608280addba70c61630bcf130cb10caaaf' +
    '946c79bb91b5873a73b8f8b62e819237dd78baaed09b08af7fd8d6539ebf82abe6fd101b571a0ff4a6ba142c0df1686f',
  desafio: {
    SRP_B: '7777777777' + 'abcdef0123456789'.repeat(40),
    SALT: '9a8b7c6d5e4f30211203',
    SECRET_BLOCK: 'c2VncmVkby1kby1zZXJ2aWRvci0wMTIzNDU2Nzg5',
    USER_ID_FOR_SRP: '1c2d3e4f-0000-4abc-8def-1234567890ab',
  },
  senha: 'Senha123',
  agora: new Date('2026-11-03T09:05:07Z'),
  timestamp: 'Tue Nov 3 09:05:07 UTC 2026',
  assinatura: 'rDKJGoXiwJM9t2E6aEdxxs7ed2JOaZyRJzCjeftBs30=',
};

const aleatorioFixo = () => hexParaBytes(VETOR_SRP.a);

it('calcula A = g^a mod N como a biblioteca da AWS', () => {
  const { A } = iniciarSrp(aleatorioFixo);
  expect(A.toString(16)).toBe(VETOR_SRP.A);
});

it('assina o desafio PASSWORD_VERIFIER igual à biblioteca da AWS', () => {
  const resposta = responderDesafio({
    userPoolId: VETOR_SRP.userPoolId,
    estado: iniciarSrp(aleatorioFixo),
    desafio: VETOR_SRP.desafio,
    senha: VETOR_SRP.senha,
    agora: VETOR_SRP.agora,
  });
  expect(resposta).toEqual({
    USERNAME: VETOR_SRP.desafio.USER_ID_FOR_SRP,
    PASSWORD_CLAIM_SECRET_BLOCK: VETOR_SRP.desafio.SECRET_BLOCK,
    TIMESTAMP: VETOR_SRP.timestamp,
    PASSWORD_CLAIM_SIGNATURE: VETOR_SRP.assinatura,
  });
});

it('senha diferente gera outra assinatura', () => {
  const resposta = responderDesafio({
    userPoolId: VETOR_SRP.userPoolId,
    estado: iniciarSrp(aleatorioFixo),
    desafio: VETOR_SRP.desafio,
    senha: 'Senha124',
    agora: VETOR_SRP.agora,
  });
  expect(resposta.PASSWORD_CLAIM_SIGNATURE).not.toBe(VETOR_SRP.assinatura);
});

it('recusa B múltiplo de N e aleatório nulo', () => {
  expect(() =>
    responderDesafio({
      userPoolId: VETOR_SRP.userPoolId,
      estado: iniciarSrp(aleatorioFixo),
      desafio: { ...VETOR_SRP.desafio, SRP_B: '0' },
      senha: 'x',
      agora: VETOR_SRP.agora,
    }),
  ).toThrow(/B inválido/);
  expect(() => iniciarSrp((n) => new Uint8Array(n))).toThrow(/aleatório/);
});

it('carimbo de tempo em UTC, dia sem zero e hora com zero', () => {
  expect(carimboDeTempo(new Date('2026-01-05T03:04:09Z'))).toBe('Mon Jan 5 03:04:09 UTC 2026');
  expect(carimboDeTempo(new Date('2026-12-31T23:59:59Z'))).toBe('Thu Dec 31 23:59:59 UTC 2026');
});

it('padHex: tamanho par e 00 quando o bit mais alto está ligado', () => {
  expect(padHex(BigInt(0xf))).toBe('0f');
  expect(padHex(BigInt(0x7f))).toBe('7f');
  expect(padHex(BigInt(0x80))).toBe('0080');
  expect(padHex(BigInt(0x123))).toBe('0123');
});

it('base64 de ida e volta, com e sem padding', () => {
  for (const texto of ['', 'a', 'ab', 'abc', 'segredo-do-servidor-0123456789']) {
    const bytes = new TextEncoder().encode(texto);
    const b64 = bytesParaBase64(bytes);
    expect(b64).toBe(Buffer.from(texto).toString('base64'));
    expect(Array.from(base64ParaBytes(b64))).toEqual(Array.from(bytes));
  }
});
