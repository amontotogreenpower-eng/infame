// INFAME FIGHTING — empaquetado en un solo ejecutable.
//
// Lleva el juego entero dentro del binario y lo sirve en 127.0.0.1, luego
// abre el navegador. Servirlo por http en vez de abrir el index.html a pelo
// NO es un capricho: con file:// el navegador prohibe fetch(), y el juego lo
// usa para la libreria de modelos src/glb, la precarga de personajes de
// custom/char, el sorteo de fondos y musica, y para leer los propios .glb.
// Asi no hay que tocar ni una linea del juego y todo se comporta igual que
// probado.
package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"
)

// El contenido lo deja aqui construir.sh. 'all:' incluye los archivos que
// empiezan por punto o guion bajo, que embed se salta por defecto.
//
//go:embed all:juego
var juego embed.FS

func abrirNavegador(url string) error {
	switch runtime.GOOS {
	case "windows":
		// 'start' es interno de cmd, y el primer argumento entrecomillado lo
		// toma como titulo de ventana: de ahi el "" antes de la url.
		return exec.Command("cmd", "/c", "start", "", url).Start()
	case "darwin":
		return exec.Command("open", url).Start()
	default:
		return exec.Command("xdg-open", url).Start()
	}
}

func main() {
	puerto := flag.Int("puerto", 0, "puerto fijo (0 = el primero libre)")
	noAbrir := flag.Bool("no-abrir", false, "no abrir el navegador solo")
	flag.Parse()

	// Tipos que Go no trae de serie o que dependen del sistema. Sin el de
	// .glb algunos navegadores rechazan el modelo; sin el de .webmanifest la
	// PWA no se instala.
	for ext, tipo := range map[string]string{
		".glb":         "model/gltf-binary",
		".gltf":        "model/gltf+json",
		".webmanifest": "application/manifest+json",
		".mjs":         "text/javascript",
		".mp3":         "audio/mpeg",
		".mp4":         "video/mp4",
		".json":        "application/json",
	} {
		_ = mime.AddExtensionType(ext, tipo)
	}

	raiz, err := fs.Sub(juego, "juego")
	if err != nil {
		log.Fatal("no se pudo abrir el contenido embebido: ", err)
	}

	mux := http.NewServeMux()
	// http.FileServer ya responde a HEAD y a peticiones por rangos, que es
	// justo lo que necesita el juego: HEAD para descubrir que ring-NN.jpg y
	// combateNN.mp3 existen, y los rangos para que el audio y el video puedan
	// empezar a sonar sin descargarse enteros.
	mux.Handle("/", http.FileServer(http.FS(raiz)))

	dir := fmt.Sprintf("127.0.0.1:%d", *puerto)
	ln, err := net.Listen("tcp", dir)
	if err != nil {
		log.Fatalf("no se pudo abrir %s: %v", dir, err)
	}
	// La raiz, no /index.html: http.FileServer canonicaliza /index.html a / con
	// un 301, y no tiene sentido anunciar una direccion que redirige.
	url := fmt.Sprintf("http://%s/", ln.Addr().String())

	fmt.Println("╔══════════════════════════════════════════════╗")
	fmt.Println("║          I N F A M E   F I G H T I N G       ║")
	fmt.Println("╚══════════════════════════════════════════════╝")
	fmt.Println()
	fmt.Println("  Jugando en:  " + url)
	fmt.Println("  Para cerrar: Ctrl+C en esta ventana")
	fmt.Println()

	if !*noAbrir {
		if err := abrirNavegador(url); err != nil {
			fmt.Println("  (no se pudo abrir el navegador solo: ábrelo tú con esa dirección)")
		}
	}

	// Ctrl+C cierra con un mensaje en vez de con un volcado feo.
	sal := make(chan os.Signal, 1)
	signal.Notify(sal, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sal
		fmt.Println("\n  Hasta la próxima.")
		os.Exit(0)
	}()

	log.Fatal(http.Serve(ln, mux))
}
