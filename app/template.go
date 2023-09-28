package app

import (
	"crypto/md5"
	"encoding/hex"
	htmltemplate "html/template"
	"net/url"
	"strings"
	"time"

	"github.com/moonrhythm/hime"
)

func preloadTemplate(tmpl *hime.Template) {
	tmpl.Preload(
		"root.tmpl",
		"layout.tmpl",
		"component/navbar.tmpl",
		"component/sidebar.tmpl",
		"component/project-modal.tmpl",
	)
	tmpl.ParseComponentFile("status-icon", "component/status-icon.tmpl")
}

func loadTemplateFunc(tmpl *hime.Template) {
	tmpl.Funcs(htmltemplate.FuncMap{
		"profilePhoto": func(email string) string {
			email = strings.TrimSpace(email)
			email = strings.ToLower(email)
			if email == "" {
				return "https://www.gravatar.com/avatar"
			}
			hash := md5.Sum([]byte(email))
			return "https://www.gravatar.com/avatar/" + hex.EncodeToString(hash[:])
		},
		"datetime": func(t time.Time) string {
			return t.Format(time.RFC3339)
		},
		"gotoProjectLink": func(base string, project string) string {
			u, err := url.ParseRequestURI(base)
			if err != nil {
				return ""
			}
			v := url.Values{}
			v.Set("project", project)
			u.RawQuery = v.Encode()
			return u.String()
		},
	})
}
