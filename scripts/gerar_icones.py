"""Gera os ícones do Gestor de Gastos: pizza branca com uma fatia destacada
em âmbar, sobre o verde da marca (tokens.color.brand = #059669).

Uso, na raiz do repositório: python -I scripts/gerar_icones.py assets [previa.png]

Também gera os ícones da PWA (tarefa 11.1) em public/icons, ao lado de assets.
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

VERDE = (5, 150, 105, 255)  # emerald600, tokens.color.brand
BRANCO = (255, 255, 255, 255)
AMBAR = (251, 191, 36, 255)  # amber400: contraste alto sobre o verde
SS = 4  # supersampling para bordas suaves


def pizza(draw, cx, cy, r, corpo, fatia, gap):
    """Pizza de 3/4 com a fatia do quadrante superior direito destacada.

    PIL mede ângulos a partir das 3h, no sentido horário: a fatia vai de
    270° a 360° (12h às 3h) e é deslocada na bissetriz (315°).
    """
    draw.pieslice([cx - r, cy - r, cx + r, cy + r], 0, 270, fill=corpo)
    a = math.radians(315)
    dx, dy = gap * math.cos(a), gap * math.sin(a)
    draw.pieslice([cx - r + dx, cy - r + dy, cx + r + dx, cy + r + dy], 270, 360, fill=fatia)


def desenhar(tam, fundo, raio_rel, cantos_rel=0.0, corpo=BRANCO, fatia=AMBAR, modo="RGBA"):
    S = tam * SS
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if fundo:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * cantos_rel), fill=fundo)
    r = S * raio_rel
    # A pizza com a fatia deslocada fica visualmente para cima e à direita:
    # compensa metade do deslocamento para centralizar o conjunto.
    gap = r * 0.16
    off = gap * math.cos(math.radians(45)) / 2
    pizza(d, S / 2 - off, S / 2 + off, r, corpo, fatia, gap)
    im = im.resize((tam, tam), Image.LANCZOS)
    return im.convert(modo) if modo != "RGBA" else im


def main(dest: Path):
    # Ícone principal (iOS e base do Expo): fundo inteiro, o sistema arredonda.
    desenhar(1024, VERDE, 0.30, modo="RGB").save(dest / "icon.png")
    # Favicon da aba do navegador: quadrado arredondado, pizza maior para ler em 16 px.
    desenhar(48, VERDE, 0.34, cantos_rel=0.22).save(dest / "favicon.png")
    # Splash: só a pizza em verde, sobre fundo transparente.
    desenhar(1024, None, 0.30, corpo=VERDE, fatia=AMBAR).save(dest / "splash-icon.png")
    # Android adaptativo: fundo verde liso + primeiro plano dentro da zona segura (66%).
    Image.new("RGBA", (512, 512), VERDE).save(dest / "android-icon-background.png")
    desenhar(512, None, 0.24).save(dest / "android-icon-foreground.png")
    # Monocromático (Android 13+): o sistema pinta pela transparência; tudo numa cor só.
    desenhar(432, None, 0.24, corpo=BRANCO, fatia=BRANCO).save(dest / "android-icon-monochrome.png")
    pwa(dest.parent / "public" / "icons")
    # Prévia lado a lado para conferir, só se pedida (não vai para assets/).
    if len(sys.argv) < 3:
        return
    prev = Image.new("RGBA", (1024 + 48 * 4 + 40, 1024), (241, 245, 249, 255))
    prev.paste(Image.open(dest / "icon.png"), (0, 0))
    fav = Image.open(dest / "favicon.png").resize((192, 192), Image.NEAREST)
    prev.paste(fav, (1044, 0), fav)
    f16 = desenhar(16, VERDE, 0.34, cantos_rel=0.22).resize((128, 128), Image.NEAREST)
    prev.paste(f16, (1044, 220), f16)
    prev.save(Path(sys.argv[2]))


def pwa(dest: Path):
    """Ícones do manifest.json e do iOS (public/index.html)."""
    dest.mkdir(parents=True, exist_ok=True)
    # "any": o mesmo desenho do icon.png.
    for tam in (192, 512):
        desenhar(tam, VERDE, 0.30, modo="RGB").save(dest / f"icon-{tam}.png")
    # "maskable": o Android recorta até um círculo de 80% do lado, então a
    # pizza encolhe para caber nele com folga.
    desenhar(512, VERDE, 0.24, modo="RGB").save(dest / "icon-512-maskable.png")
    # Tela de início do iOS (Safari usa 180 px).
    desenhar(180, VERDE, 0.30, modo="RGB").save(dest / "apple-touch-icon.png")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
