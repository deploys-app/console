package app

import (
	"github.com/deploys-app/deploys/api"
	"github.com/moonrhythm/hime"

	"github.com/deploys-app/console/kctx"
)

func init() {
	app.Routes(hime.Routes{
		"deployment":         "/deployment",
		"deployment.deploy":  "/deployment/deploy",
		"deployment.metrics": "/deployment/metrics",
	})

	tmpl.ParseComponentFile("deployment.component.status-icon", "project/deployment/component/status-icon.tmpl")
	tmpl.ParseFiles("deployment.list", "project/deployment/list.tmpl")
}

type deploymentData struct {
	Page      pageData
	Forbidden bool
	List      []*api.DeploymentItem
}

func getDeployment(ctx *hime.Context) error {
	project := kctx.GetProject(ctx).Project

	var p deploymentData
	p.Page = page(ctx)
	p.Page.Menu = "deployment"

	{
		res, err := deploysClient.Deployment().List(ctx, &api.DeploymentList{
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

	return ctx.View("deployment.list", &p)
}
