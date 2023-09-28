package template

import (
	"embed"
)

//go:embed *.tmpl
//go:embed **/*
var FS embed.FS
