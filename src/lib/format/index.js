import dayjs from 'dayjs'

export default {
	cpu (v) {
		if (v === '0') {
			return 'Shared'
		}
		return `${v} vCPU`
	},
	memory (v) {
		if (v === '0') {
			return 'Shared'
		}
		const m = v.match(/^(\d+)(\w+)$/)
		if (m.length !== 3) {
			return v
		}
		return `${m[1]} ${m[2]}B`
	},
	datetime (v) {
		if (!v) {
			return ''
		}
		return dayjs(v).format('YYYY-MM-DD HH:mm:ss')
	}
}
