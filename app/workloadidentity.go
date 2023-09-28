package app

import (
	"github.com/deploys-app/deploys/api"
	"github.com/moonrhythm/hime"

	"github.com/deploys-app/console/kctx"
)

func init() {
	app.Routes(hime.Routes{
		"workload-identity":        "/workload-identity",
		"workload-identity.create": "/workload-identity/create",
		"workload-identity.detail": "/workload-identity/detail",
	})

	tmpl.ParseFiles("workload-identity.list", "project/workload-identity/list.tmpl")
	tmpl.ParseComponentFile("workload-identity.component.list-table-body", "project/workload-identity/component/list-table-body.tmpl")
}

type workloadIdentityData struct {
	Page      pageData
	Forbidden bool
	List      []*api.WorkloadIdentityItem
}

func getWorkloadIdentity(ctx *hime.Context) error {
	project := kctx.GetProject(ctx).Project

	switch ctx.FormValue("component") {
	case "list-table-body":
		data := map[string]any{}
		res, err := deploysClient.WorkloadIdentity().List(ctx, &api.WorkloadIdentityList{
			Project: project,
		})
		if isForbidden(err) {
			err = nil
			data["Forbidden"] = true
		}
		if err != nil {
			return err
		}
		if res != nil {
			data["List"] = res.Items
		}
		return ctx.Component("workload-identity.component.list-table-body", data)
	}

	var p workloadIdentityData
	p.Page = page(ctx)
	p.Page.Menu = "workload-identity"

	{
		res, err := deploysClient.WorkloadIdentity().List(ctx, &api.WorkloadIdentityList{
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

	return ctx.View("workload-identity.list", &p)
}
