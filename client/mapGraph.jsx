import { Col, Row } from "antd"
import * as React from "react"
import DualButton from "./dualButton"
import CountiesTable from "./countiesTable"


/*
	state type: {
		selectedType: "Cases" | "Deaths"
	}
*/
export default class MapGraph extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			selectedType: "Cases",
			selectedDate: "2020-01-21",
			sliderValue: 0,
		}

		this.lastSelectedType = ""
		this.lastSelectedDate = ""
	}

	// based on http://bl.ocks.org/michellechandra/0b2ce4923dc9b5809922
	renderGraph() {
		if(
			this.lastSelectedType == this.state.selectedType
			&& this.lastSelectedDate == this.state.selectedDate
		) {
			return
		}

		this.lastSelectedType = this.state.selectedType
		this.lastSelectedDate = this.state.selectedDate

		let request = new XMLHttpRequest()
		request.open("GET", `/states-map/${this.state.selectedType.toLowerCase()}/${this.state.selectedDate}`, true)
		request.responseType = "text"

		request.onload = (event) => {
			let width = 960
			let height = 500

			document.getElementById("map-graph").innerHTML = ""

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
			
			let tooltip = d3.select("body").append("div")
				.attr("class", "tooltip")
				.style("opacity", 0)
			
			let data = JSON.parse(request.response)
			let maxDeaths = 0
			d3.json("./static/us-states.json", json => {
				for(let state in data) {
					let deaths = data[state]
					// loop through the geoJSON and find the feature we need to add data to
					for(let j = 0; j < json.features.length; j++) {
						if(state == json.features[j].properties.name) {
							json.features[j].properties.value = deaths
							json.features[j].value = deaths
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
					.style("fill", (d) => {
						var value = d.properties.value || 0
						return d3.scale.linear()
							.range(["rgb(220, 220, 220)", "rgb(230, 18, 18)"])
							.domain([0, maxDeaths])(value)
					})
					.on("mouseover", (d) => {
						tooltip.transition()
							.duration(200)
							.style("opacity", .9)
						tooltip.html(`${d.properties.name}<br />${d.properties.value || 0} ${this.state.selectedType.toLowerCase()}`)
							.style("left", (d3.event.pageX) + "px")
							.style("top", (d3.event.pageY - 28) + "px")
					})
					.on("mouseout", function(d) {		
						tooltip.transition()
							.duration(500)
							.style("opacity", 0);
					});
			})
		}
		request.send()
	}
	
	componentDidMount() {
		this.renderGraph()
	}

	componentDidUpdate() {
		this.renderGraph()
	}

	render() {
		return <div class="map-graph-container">
			<Row gutter={32}>
			<Col>
			<DualButton
				button1Name={"Cases"}
				button1OnClick={
					event => this.setState({
						selectedType: "Cases"
					})
				}
				button2Name={"Deaths"}
				button2OnClick={
					event => this.setState({
						selectedType: "Deaths"
					})
				}
			/>
			<h2>COVID-19 {this.state.selectedType} per State on {this.state.selectedDate}</h2>
			<div id="map-graph"></div>
			<input
				type="range"
				min="1"
				max="230"
				value={this.state.sliderValue}
				style={{
					display: "block",
					width: 400,
				}}
				onChange={
					event => {
						// debounce graph updates
						clearTimeout(this.state.graphDebounce)
						let timeout = setTimeout(() => {
							let date = new Date(2020, 1, 21) // starting date
							date.setDate(date.getDate() + this.state.sliderValue)
							this.setState({
								selectedDate: date.toISOString().slice(0, 19).split("T")[0]
							})
						}, 100)

						this.setState({
							sliderValue: Math.floor(event.target.value | 0),
							graphDebounce: timeout,
						})
					}
				}
			/>
			<hr /> 
			</Col>
			<Col>
				<CountiesTable
					state={"Washington"}
					dataType={this.state.selectedType}
					date={this.state.selectedDate}
				/>
			</Col>
			</Row>
		</div>
	}
}