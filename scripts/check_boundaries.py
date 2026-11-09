#!/usr/bin/env python3
"""
Verifica as fronteiras de arquitetura do app: app -> features -> shared.

Uso:
    python check_boundaries.py <raiz-do-projeto>

Regras:
  - shared/**  não importa features/** nem app/**
  - features/** não importa app/**
  - features/X importa outra feature Y apenas pelo index (features/Y)
  - app/**     importa features apenas pelo index (features/Y)
  - aviso (não falha): feature importando a si mesma via alias @/features/X/...
    (dentro da própria feature, prefira imports relativos)

Cobre imports com alias "@/" e relativos ("../"). Saída 0 = ok, 1 = violações.
"""

import re
import sys
from pathlib import Path

EXTENSOES = {".ts", ".tsx", ".js", ".jsx"}
IGNORAR_DIRS = {"node_modules", "generated", "__mocks__"}

PADROES_IMPORT = [
    re.compile(r"""^\s*import\s+(?:type\s+)?[^'"]*?from\s+['"]([^'"]+)['"]""", re.M),
    re.compile(r"""^\s*import\s+['"]([^'"]+)['"]""", re.M),
    re.compile(r"""^\s*export\s+(?:type\s+)?[^'"]*?from\s+['"]([^'"]+)['"]""", re.M),
    re.compile(r"""\brequire\(\s*['"]([^'"]+)['"]\s*\)"""),
    re.compile(r"""\bimport\(\s*['"]([^'"]+)['"]\s*\)"""),
]


def extrair_imports(texto):
    for padrao in PADROES_IMPORT:
        for m in padrao.finditer(texto):
            linha = texto.count("\n", 0, m.start()) + 1
            yield linha, m.group(1)


def resolver(spec, arquivo, src):
    """Converte o especificador em partes relativas a src/, ou None se for lib externa."""
    if spec.startswith("@/"):
        partes = Path(spec[2:]).parts
    elif spec.startswith("."):
        alvo = (arquivo.parent / spec).resolve()
        try:
            partes = alvo.relative_to(src.resolve()).parts
        except ValueError:
            return None
    else:
        return None
    partes = [p for p in partes if p not in ("", ".")]
    if partes and partes[-1] in ("index", "index.ts", "index.tsx"):
        partes = partes[:-1]
    return partes


def verificar(raiz):
    src = raiz / "src"
    if not src.is_dir():
        print(f"❌ Diretório src/ não encontrado em {raiz}")
        return 2

    violacoes, avisos = [], []

    for arquivo in sorted(src.rglob("*")):
        if arquivo.suffix not in EXTENSOES or not arquivo.is_file():
            continue
        rel = arquivo.relative_to(src)
        if any(p in IGNORAR_DIRS for p in rel.parts):
            continue
        origem = rel.parts
        camada = origem[0]
        if camada not in ("app", "features", "shared"):
            continue
        feature_origem = origem[1] if camada == "features" and len(origem) > 2 else None

        texto = arquivo.read_text(encoding="utf-8", errors="ignore")
        for linha, spec in extrair_imports(texto):
            destino = resolver(spec, arquivo, src)
            if not destino:
                continue
            camada_dest = destino[0]
            onde = f"src/{rel.as_posix()}:{linha}  ->  '{spec}'"

            if camada == "shared" and camada_dest in ("features", "app"):
                violacoes.append(f"{onde}\n    shared não pode depender de {camada_dest}.")
                continue

            if camada == "features" and camada_dest == "app":
                violacoes.append(f"{onde}\n    features não podem depender de rotas (app).")
                continue

            if camada_dest == "features" and len(destino) >= 2:
                feature_dest = destino[1]
                profundo = len(destino) > 2
                if camada == "features" and feature_dest == feature_origem:
                    if spec.startswith("@/") and profundo:
                        avisos.append(f"{onde}\n    dentro da própria feature, prefira import relativo.")
                    continue
                if profundo:
                    violacoes.append(
                        f"{onde}\n    importe a feature '{feature_dest}' apenas pelo index "
                        f"(@/features/{feature_dest})."
                    )

    for a in avisos:
        print(f"⚠️  {a}")
    for v in violacoes:
        print(f"❌ {v}")

    if violacoes:
        print(f"\n{len(violacoes)} violação(ões) de fronteira, {len(avisos)} aviso(s).")
        return 1
    print(f"✅ Fronteiras respeitadas ({len(avisos)} aviso(s)).")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(verificar(Path(sys.argv[1])))
