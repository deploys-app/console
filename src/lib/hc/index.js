import Highcharts from 'highcharts'

let inited = false

export function init () {
	if (inited) {
		return
	}
	inited = true

	Highcharts.setOptions({
		accessibility: {
			enabled: false
		},
		colors: ['#2b908f', '#90ee7e', '#f45b5b', '#7798bf', '#aaeeee', '#ff0066',
			'#eeaaee', '#55bf3b', '#df5353', '#7798bf', '#aaeeee'],
		chart: {
			backgroundColor: {
				linearGradient: { x1: 0, y1: 0, x2: 1, y2: 1 },
				stops: [
					[0, 'rgba(0, 0, 0, 0.2)'],
					[1, 'rgba(0, 0, 0, 0.2)']
				]
			},
			style: {
				fontFamily: '\'Unica One\', sans-serif'
			},
			plotBorderColor: '#606063'
		},
		title: {
			style: {
				color: '#e0e0e3',
				fontSize: '20px'
			}
		},
		subtitle: {
			style: {
				color: '#e0e0e3',
				textTransform: 'uppercase'
			}
		},
		xAxis: {
			gridLineColor: '#707073',
			labels: {
				style: {
					color: '#e0e0e3'
				}
			},
			lineColor: '#707073',
			minorGridLineColor: '#505053',
			tickColor: '#707073',
			title: {
				style: {
					color: '#a0a0a3'
				}
			},
			gridLineWidth: 1
		},
		yAxis: {
			gridLineColor: '#707073',
			labels: {
				style: {
					color: '#e0e0e3'
				}
			},
			lineColor: '#707073',
			minorGridLineColor: '#505053',
			tickColor: '#707073',
			tickWidth: 1,
			title: {
				text: '',
				style: {
					color: '#a0a0a3'
				}
			}
		},
		tooltip: {
			backgroundColor: 'rgba(0, 0, 0, 0.85)',
			style: {
				color: '#f0f0f0'
			}
		},
		plotOptions: {
			series: {
				dataLabels: {
					color: '#f0f0f3',
					style: {
						fontSize: '13px'
					}
				},
				marker: {
					lineColor: '#333'
				}
			},
			boxplot: {
				fillColor: '#505053'
			},
			candlestick: {
				lineColor: 'white'
			},
			errorbar: {
				color: 'white'
			}
		},
		legend: {
			backgroundColor: 'rgba(0, 0, 0, 0.3)',
			itemStyle: {
				color: '#e0e0e3'
			},
			itemHoverStyle: {
				color: '#fff'
			},
			itemHiddenStyle: {
				color: '#606063'
			},
			title: {
				style: {
					color: '#c0c0c0'
				}
			}
		},
		drilldown: {
			activeAxisLabelStyle: {
				color: '#f0f0f3'
			},
			activeDataLabelStyle: {
				color: '#f0f0f3'
			}
		},
		navigation: {
			buttonOptions: {
				symbolStroke: '#dddddd',
				theme: {
					fill: '#505053'
				}
			}
		},
		// scroll charts
		rangeSelector: {
			buttonTheme: {
				fill: '#505053',
				stroke: '#000000',
				style: {
					color: '#ccc'
				},
				states: {
					hover: {
						fill: '#707073',
						stroke: '#000000',
						style: {
							color: 'white'
						}
					},
					select: {
						fill: '#000003',
						stroke: '#000000',
						style: {
							color: 'white'
						}
					}
				}
			},
			inputBoxBorderColor: '#505053',
			inputStyle: {
				backgroundColor: '#333',
				color: 'silver'
			},
			labelStyle: {
				color: 'silver'
			}
		},
		navigator: {
			handles: {
				backgroundColor: '#666',
				borderColor: '#aaa'
			},
			outlineColor: '#ccc',
			maskFill: 'rgba(255,255,255,0.1)',
			series: {
				color: '#7798bf',
				lineColor: '#a6c7ed'
			},
			xAxis: {
				gridLineColor: '#505053'
			}
		},
		scrollbar: {
			barBackgroundColor: '#808083',
			barBorderColor: '#808083',
			buttonArrowColor: '#ccc',
			buttonBackgroundColor: '#606063',
			buttonBorderColor: '#606063',
			rifleColor: '#fff',
			trackBackgroundColor: '#404043',
			trackBorderColor: '#404043'
		},
		time: {
			useUTC: false
		},
		credits: {
			enabled: false
		}
	})
}
