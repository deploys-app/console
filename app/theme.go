package app

import (
	"net/http"

	"github.com/moonrhythm/hime"
)

var validTheme = map[string]bool{
	"light": true,
	"dark":  true,
}

const defaultTheme = "dark"

func postTheme(ctx *hime.Context) error {
	theme := ctx.PostFormValue("theme")
	if !validTheme[theme] {
		return ctx.RedirectBackToGet()
	}

	ctx.AddCookie("theme", theme, &hime.CookieOptions{
		Path:     "/",
		MaxAge:   60 * 60 * 24 * 365,
		Secure:   cookieSecure(ctx),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	return ctx.RedirectBackToGet()
}
