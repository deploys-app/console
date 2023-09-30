package app

import (
	"log/slog"
	"net/http"

	"github.com/acoshift/methodmux"
	"github.com/deploys-app/deploys/api"
	"github.com/deploys-app/deploys/api/client"
	"github.com/moonrhythm/hime"
	"github.com/moonrhythm/httpmux"
	"github.com/moonrhythm/parapet"

	"github.com/deploys-app/console/kctx"
	"github.com/deploys-app/console/template"
)

var (
	deploysClient *client.Client
	baseURL       string
)

func SetClient(c *client.Client) {
	deploysClient = c
	slog.Info("app: config", "deploys_endpoint", deploysClient.Endpoint)
}

func SetBaseURL(s string) {
	baseURL = s
	slog.Info("app: config", "base_url", baseURL)
}

var (
	app  = hime.New()
	tmpl = func() *hime.Template {
		tmpl := app.Template()
		tmpl.FS(template.FS)
		tmpl.Root("root")
		loadTemplateFunc(tmpl)
		preloadTemplate(tmpl)
		return tmpl
	}()
)

func init() {
	app.ETag = true
}

func Mount(m *httpmux.Mux) {
	m = m.Middleware(
		app.ServeHandler,
	)

	app.Routes(hime.Routes{
		"auth.signin":  "/auth/signin",
		"auth.signout": "/auth/signout",

		"theme":   "/theme",
		"billing": "/billing",
	})

	// un-auth routes
	{
		m := m.Group("/auth")
		m.Handle("/signin", methodmux.Get(hime.Handler(getSignIn)))
		m.Handle("/signout", methodmux.Post(hime.Handler(postSignOut)))
		m.Handle("/callback", methodmux.Get(hime.Handler(getCallback)))
	}

	// special case, dashboard or not found
	m.Handle("/", rootHandler())

	// auth routes
	m = m.Middleware(
		tokenMiddleware,
		themeMiddleware,
	)

	m.Handle("/theme", methodmux.Post(hime.Handler(postTheme)))
	m.Handle("/project", methodmux.Get(hime.Handler(getProjectList)))

	// project routes
	m = m.Middleware(
		projectMiddleware,
	)
	m.Handle("/deployment", methodmux.Get(hime.Handler(getDeployment)))
	m.Handle("/workload-identity", methodmux.Get(hime.Handler(getWorkloadIdentity)))
	m.Handle("/email", methodmux.Get(hime.Handler(getEmail)))
}

func themeMiddleware(h http.Handler) http.Handler {
	return hime.Handler(func(ctx *hime.Context) error {
		theme := ctx.CookieValue("theme")
		if !validTheme[theme] {
			theme = defaultTheme
		}
		ctx = ctx.WithContext(kctx.NewTheme(ctx.Context(), theme))
		return ctx.Handle(h)
	})
}

func projectMiddleware(h http.Handler) http.Handler {
	return hime.Handler(func(ctx *hime.Context) error {
		project := ctx.CookieValue("project")
		queryProject := ctx.FormValue("project")
		if project == "" {
			project = queryProject
		}
		if project == "" {
			return ctx.RedirectTo("project")
		}

		if queryProject == "" {
			return ctx.Redirect(ctx.RequestURI, ctx.Param("project", project))
		}

		ctx.AddCookie("project", project, &hime.CookieOptions{
			Path:     "/",
			MaxAge:   60 * 60 * 24 * 30,
			Secure:   cookieSecure(ctx),
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})

		info, err := deploysClient.Project().Get(ctx.Context(), &api.ProjectGet{
			Project: queryProject,
		})
		if err != nil {
			return ctx.RedirectTo("project")
		}
		ctx = ctx.WithContext(kctx.NewProject(ctx.Context(), info))
		return ctx.Handle(h)
	})
}

func tokenMiddleware(h http.Handler) http.Handler {
	return hime.Handler(func(ctx *hime.Context) error {
		token := ctx.CookieValue("token")
		if token == "" {
			return ctx.RedirectTo("auth.signin")
		}

		me, err := deploysClient.Me().Get(kctx.NewToken(ctx.Context(), token), &api.Empty{})
		if err != nil {
			return ctx.RedirectTo("auth.signin")
		}

		ctx = ctx.WithContext(kctx.NewToken(ctx.Context(), token))
		ctx = ctx.WithContext(kctx.NewEmail(ctx.Context(), me.Email))
		return ctx.Handle(h)
	})
}

func rootHandler() http.Handler {
	var m parapet.Middlewares
	m.UseFunc(tokenMiddleware)
	m.UseFunc(themeMiddleware)
	m.UseFunc(projectMiddleware)
	dashboardHandler := m.ServeHandler(hime.Handler(getDashboard))

	return hime.Handler(func(ctx *hime.Context) error {
		if ctx.URL.Path == "/" {
			return ctx.Handle(dashboardHandler)
		}

		// not found
		http.NotFound(ctx.ResponseWriter(), ctx.Request)
		return nil
	})
}

type pageData struct {
	// auto-inject
	Theme   string
	Profile struct {
		Email string
	}
	Project     string
	ProjectInfo *api.ProjectItem
	Projects    []*api.ProjectItem
	Path        string

	// manual
	Menu string
}

func page(ctx *hime.Context) pageData {
	var p pageData
	p.Theme = kctx.GetTheme(ctx)
	p.Profile.Email = kctx.GetEmail(ctx)
	p.ProjectInfo = kctx.GetProject(ctx)
	if p.ProjectInfo != nil {
		p.Project = p.ProjectInfo.Project
		p.Path = ctx.URL.Path
	} else {
		p.Path = "/"
	}

	{
		res, err := deploysClient.Project().List(ctx, &api.Empty{})
		if err != nil {
			panic("list project: " + err.Error())
		}
		p.Projects = res.Items
	}

	return p
}

func isForbidden(err error) bool {
	if err == nil {
		return false
	}
	return err.Error() == "iam: forbidden"
}
