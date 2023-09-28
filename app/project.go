package app

import (
	"github.com/moonrhythm/hime"
)

func init() {
	app.Routes(hime.Routes{
		"project":        "/project",
		"project.create": "/project/create",
	})

	tmpl.ParseFiles("project", "project.tmpl")
}

type projectData struct {
	Page pageData
}

func getProjectList(ctx *hime.Context) error {
	var p projectData
	p.Page = page(ctx)

	return ctx.View("project", &p)
}
