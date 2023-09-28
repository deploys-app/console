package kctx

import (
	"context"

	"github.com/deploys-app/deploys/api"
)

type (
	keyToken   struct{}
	keyEmail   struct{}
	keyProject struct{}
	keyTheme   struct{}
)

func NewToken(ctx context.Context, token string) context.Context {
	return context.WithValue(ctx, keyToken{}, token)
}

func GetToken(ctx context.Context) string {
	v, _ := ctx.Value(keyToken{}).(string)
	return v
}

func NewEmail(ctx context.Context, email string) context.Context {
	return context.WithValue(ctx, keyEmail{}, email)
}

func GetEmail(ctx context.Context) string {
	v, _ := ctx.Value(keyEmail{}).(string)
	return v
}

func NewProject(ctx context.Context, project *api.ProjectItem) context.Context {
	return context.WithValue(ctx, keyProject{}, project)
}

func GetProject(ctx context.Context) *api.ProjectItem {
	v, _ := ctx.Value(keyProject{}).(*api.ProjectItem)
	return v
}

func NewTheme(ctx context.Context, theme string) context.Context {
	return context.WithValue(ctx, keyTheme{}, theme)
}

func GetTheme(ctx context.Context) string {
	v, _ := ctx.Value(keyTheme{}).(string)
	return v
}
