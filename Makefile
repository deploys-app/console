include .env
export

dev:
	goreload --all .

.PHONY: style
style:
	sass --no-source-map ./style/main.scss static/style.css
