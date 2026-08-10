#!/usr/bin/env bash
# Empaqueta INFAME FIGHTING en un ejecutable por sistema operativo.
#
#   ./tools/empaquetar/construir.sh              -> solo el de esta maquina
#   ./tools/empaquetar/construir.sh todos        -> linux, windows y macOS
#
# Los binarios salen en dist/. Cada uno lleva el juego entero dentro: se
# copian aqui los archivos porque go:embed no sabe salir de su carpeta.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
ESCENA="$AQUI/juego"
DIST="$RAIZ/dist"

echo "→ recogiendo el juego en $ESCENA"
rm -rf "$ESCENA"; mkdir -p "$ESCENA"
cd "$RAIZ"
# Lo que de verdad hace falta para jugar. Nada de .html sueltos de pruebas,
# ni tools/, ni el .git.
for f in index.html sw.js manifest.json manifest.webmanifest icon.svg \
         icon-192.png icon-512.png icon-maskable-512.png; do
  [ -f "$f" ] && cp "$f" "$ESCENA/" || echo "  (falta $f, se omite)"
done
[ -d src ]    && cp -r src    "$ESCENA/"
[ -d custom ] && cp -r custom "$ESCENA/"
# Los LEEME son para quien monta la carpeta, no para quien juega.
find "$ESCENA" -name 'LEEME.txt' -delete
echo "  contenido: $(du -sh "$ESCENA" | cut -f1)"

mkdir -p "$DIST"
cd "$AQUI"

compila() {   # $1=GOOS  $2=GOARCH  $3=sufijo
  local salida="$DIST/infame-fighting-$1-$2$3"
  echo "→ compilando $1/$2"
  # -s -w quita la tabla de simbolos: unos 2 MB menos y no hace falta para
  # depurar un servidor de archivos.
  GOOS="$1" GOARCH="$2" CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o "$salida" .
  echo "  $salida  ($(du -h "$salida" | cut -f1))"
}

if [ "${1:-}" = "todos" ]; then
  compila linux   amd64 ''
  compila windows amd64 '.exe'
  compila darwin  amd64 ''
  compila darwin  arm64 ''
else
  compila "$(go env GOOS)" "$(go env GOARCH)" \
          "$([ "$(go env GOOS)" = windows ] && echo .exe || echo '')"
fi

echo
echo "Listo. Los ejecutables estan en dist/"
