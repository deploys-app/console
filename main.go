package main

import (
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/acoshift/configfile"
	"github.com/deploys-app/deploys/api/client"
	"github.com/moonrhythm/httpmux"
	"github.com/moonrhythm/parapet"
	"github.com/moonrhythm/parapet/pkg/logger"

	"github.com/deploys-app/console/app"
	"github.com/deploys-app/console/kctx"
	"github.com/deploys-app/console/static"
)

func main() {
	config := configfile.NewEnvReader()
	addr := config.StringDefault("addr", ":8080")
	baseURL := strings.TrimSuffix(config.String("base_url"), "/")

	deploysClient := client.Client{
		HTTPClient: &http.Client{
			Transport: &http.Transport{
				Proxy:               http.ProxyFromEnvironment,
				MaxIdleConns:        30,
				MaxIdleConnsPerHost: 30,
				MaxConnsPerHost:     1000,
				IdleConnTimeout:     30 * time.Second,
			},
			Timeout: 30 * time.Second,
		},
		Endpoint: config.String("api_endpoint"),
		Auth: func(r *http.Request) {
			r.Header.Set("Authorization", "Bearer "+kctx.GetToken(r.Context()))
		},
	}
	app.SetClient(&deploysClient)
	app.SetBaseURL(baseURL)

	mux := httpmux.New()
	app.Mount(mux)
	static.Mount(mux.Group("/-"))

	srv := parapet.NewBackend()
	srv.Addr = addr
	srv.Handler = mux

	srv.Use(logger.Stdout())

	slog.Info("starting web server", "addr", addr)
	err := srv.ListenAndServe()
	if err != nil {
		slog.Error("start web server failed", "error", err)
		os.Exit(1)
	}
}
