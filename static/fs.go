package static

import (
	"crypto/sha1"
	"embed"
	"encoding/hex"
	"log/slog"
	"net/http"
	"path/filepath"

	"github.com/moonrhythm/httpmux"
)

//go:embed *.css *.png images/**
var _fs embed.FS

var index = map[string]string{}

func init() {
	loadDir(".")
}

func loadDir(name string) {
	ds, err := _fs.ReadDir(name)
	if err != nil {
		panic(err)
	}
	for _, d := range ds {
		if d.IsDir() {
			loadDir(filepath.Join(name, d.Name()))
			continue
		}
		p := filepath.Join(name, d.Name())
		t := calculateHashFilename(p)
		index[p] = t
		slog.Info("static: load", "file", p, "hash", t)
	}
}

func Mount(m *httpmux.Mux) {
	for p, t := range index {
		m.Handle(t, fileHandler(p))
	}
}

func fileHandler(p string) http.Handler {
	h := http.FileServer(http.FS(_fs))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.URL.Path = p
		w.Header().Set("Cache-Control", "public, max-age=31536000")
		h.ServeHTTP(w, r)
	})
}

func calculateHashFilename(fn string) string {
	b, err := _fs.ReadFile(fn)
	if err != nil {
		panic(err)
	}

	sum := sha1.Sum(b)
	h := hex.EncodeToString(sum[:])
	ext := filepath.Ext(fn)
	base := fn[:len(fn)-len(ext)]
	return base + "." + h[:8] + ext
}

func GetFilename(name string) string {
	return index[name]
}
