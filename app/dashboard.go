package app

import (
	"context"

	"github.com/deploys-app/deploys/api"
	"github.com/dustin/go-humanize"
	"github.com/moonrhythm/hime"
	"golang.org/x/sync/errgroup"

	"github.com/deploys-app/console/kctx"
)

func init() {
	app.Routes(hime.Routes{
		"dashboard": "/",
	})

	tmpl.ParseFiles("dashboard", "project/dashboard.tmpl")
	tmpl.ParseComponentFile("component.dashboard-billing", "project/component/dashboard-billing.tmpl")
}

type dashboardData struct {
	Page    pageData
	Billing *dashboardBilling
}

func getDashboard(ctx *hime.Context) error {
	project := kctx.GetProject(ctx).Project

	switch ctx.FormValue("component") {
	case "billing":
		billing, err := queryDashboardBilling(ctx, project)
		if isForbidden(err) {
			err = nil
		}
		if err != nil {
			return err
		}
		return ctx.Component("component.dashboard-billing", billing)
	}

	var p dashboardData
	p.Page = page(ctx)
	p.Page.Menu = "dashboard"

	var err error
	p.Billing, err = queryDashboardBilling(ctx, project)
	if isForbidden(err) {
		err = nil
	}
	if err != nil {
		return err
	}

	return ctx.View("dashboard", &p)
}

type dashboardBilling struct {
	Price   string
	CPU     string
	Memory  string
	Egress  string
	Disk    string
	Replica string
}

func queryDashboardBilling(ctx context.Context, project string) (*dashboardBilling, error) {
	var (
		usage *api.ProjectUsageResult
		price *api.BillingProjectResult
	)

	var eg errgroup.Group
	eg.Go(func() error {
		var err error
		usage, err = deploysClient.Project().Usage(ctx, &api.ProjectUsage{
			Project: project,
		})
		return err
	})
	eg.Go(func() error {
		var err error
		price, err = deploysClient.Billing().Project(ctx, &api.BillingProject{
			Project: project,
		})
		return err
	})
	err := eg.Wait()
	if err != nil {
		return nil, err
	}

	const unitGiB = 1024 * 1024 * 1024
	const format = "#,###.##"

	return &dashboardBilling{
		Price:   humanize.FormatFloat(format, price.Price),
		CPU:     humanize.FormatFloat(format, usage.CPU),
		Memory:  humanize.FormatFloat(format, usage.Memory/unitGiB),
		Egress:  humanize.FormatFloat(format, usage.Egress/unitGiB),
		Disk:    humanize.FormatFloat(format, usage.Disk/unitGiB),
		Replica: humanize.FormatFloat(format, usage.Replica),
	}, nil
}
