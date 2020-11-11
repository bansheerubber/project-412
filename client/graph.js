// based on http://bl.ocks.org/michellechandra/0b2ce4923dc9b5809922

var width = 960
var height = 500

// set up the path that will render the geojson
let path = d3.geo.path()
	.projection(
		d3.geo.albersUsa()
			.translate([width / 2, height / 2])
			.scale([1000])
	)

// create svg element that we can render to
let svg = d3.select("body")
	.select("#map-graph")
	.append("svg")
	.attr("width", width)
	.attr("height", height)

let request = new XMLHttpRequest()
request.open("GET", `/states-map`, true)
request.responseType = "text"

request.onload = (event) => {
	let data = JSON.parse(request.response)
	let maxDeaths = 0
	d3.json("./static/us-states.json", json => {
		for(let state in data) {
			let deaths = data[state]
			// loop through the geoJSON and find the feature we need to add data to
			for(let j = 0; j < json.features.length; j++) {
				if(state == json.features[j].properties.name) {
					json.features[j].properties.value = deaths
					maxDeaths = Math.max(deaths, maxDeaths)
					break
				}
			}
		}

		// render the features onto the path we set up earlier
		svg.selectAll("path")
			.data(json.features)
			.enter()
			.append("path")
			.attr("d", path)
			.style("stroke", "#fff")
			.style("stroke-width", "1")
			.style("fill", function (d) {
				var value = d.properties.value || 0
				return d3.scale.linear()
					.range(["rgb(220, 220, 220)", "rgb(230, 18, 18)"])
					.domain([0, maxDeaths])(value)
			})
	})
}
request.send()