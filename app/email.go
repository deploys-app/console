package app

import (
	"github.com/deploys-app/deploys/api"
	"github.com/moonrhythm/hime"

	"github.com/deploys-app/console/kctx"
)

func init() {
	app.Routes(hime.Routes{
		"email": "/email",
	})

	tmpl.ParseFiles("email", "project/email.tmpl")
}

type emailData struct {
	Page      pageData
	Forbidden bool
	List      []*api.EmailItem
}

func getEmail(ctx *hime.Context) error {
	project := kctx.GetProject(ctx).Project

	var p emailData
	p.Page = page(ctx)
	p.Page.Menu = "email"

	{
		res, err := deploysClient.Email().List(ctx, &api.EmailList{
			Project: project,
		})
		if isForbidden(err) {
			err = nil
			p.Forbidden = true
		}
		if err != nil {
			return err
		}
		if res != nil {
			p.List = res.Items
		}
	}

	return ctx.View("email", &p)
}
