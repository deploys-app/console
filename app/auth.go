package app

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/moonrhythm/hime"
)

const landingURL = "https://www.deploys.app/"

func getSignIn(ctx *hime.Context) error {
	state := generateOAuthState()
	redirect := ctx.FormValue("r")

	callback := baseURL + "/auth/callback"

	ctx.AddCookie("state", state, &hime.CookieOptions{
		Path:     "/",
		MaxAge:   60 * 60,
		Secure:   cookieSecure(ctx),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	if redirect != "" {
		ctx.AddCookie("redirect", redirect, &hime.CookieOptions{
			Path:     "/auth/callback",
			MaxAge:   60 * 60,
			Secure:   cookieSecure(ctx),
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})
	}

	return ctx.Redirect("https://api.deploys.app/auth",
		ctx.Param("state", state),
		ctx.Param("callback", callback),
	)
}

func postSignOut(ctx *hime.Context) error {
	token := ctx.CookieValue("token")
	if token == "" {
		return ctx.Redirect(landingURL)
	}

	return ctx.Redirect("https://api.deploys.app/auth/signout",
		ctx.Param("token", token),
		ctx.Param("callback", landingURL),
	)
}

func getCallback(ctx *hime.Context) error {
	state := ctx.FormValue("state")
	if c, _ := ctx.Cookie("state"); c == nil || c.Value != state {
		return ctx.Status(http.StatusUnauthorized).Error("invalid state")
	}

	code := ctx.FormValue("code")

	secure := cookieSecure(ctx)

	ctx.DelCookie("state", &hime.CookieOptions{
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
		Secure:   secure,
	})
	ctx.AddCookie("token", code, &hime.CookieOptions{
		HttpOnly: true,
		Path:     "/",
		MaxAge:   60 * 60 * 24 * 7,
		SameSite: http.SameSiteLaxMode,
		Secure:   secure,
	})

	var redirect string
	if c, _ := ctx.Cookie("redirect"); c != nil {
		redirect = c.Value
		ctx.DelCookie("redirect", &hime.CookieOptions{
			HttpOnly: true,
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
			Secure:   secure,
		})
	}
	if redirect == "" {
		redirect = "/"
	}
	return ctx.SafeRedirect(redirect)
}

func generateOAuthState() string {
	var b [16]byte
	_, err := rand.Read(b[:])
	if err != nil {
		panic(err)
	}
	return hex.EncodeToString(b[:])
}

func cookieSecure(ctx *hime.Context) bool {
	return ctx.Header.Get("X-Forwarded-Proto") == "https"
}
