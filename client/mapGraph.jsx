import { Col, Row, Card, Table, Input, Select, Divider, Switch } from "antd"
import * as React from "react"
import DualButton from "./dualButton"
import CountiesTable from "./countiesTable"
import requestBackend from "./requestBackend"


/*
	state type: {
		selectedType: "Cases" | "Deaths"
	}
*/
const columns = [

	{
		title: "State",
		dataIndex:"state",
		key: "state",
	},

	{
		title: "Mask Mandate",
		dataIndex:"mask",
		key: "mask",
	},

];

const { option } = Select;



export default class MapGraph extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			selectedType: "Cases",
			selectedDate: "2020-01-21",
			sliderValue: 0,
			playing: false,
			selectedUSState: "Arizona",
		}

		this.lastSelectedType = ""
		this.lastSelectedDate = ""

		this.nodes = null
		this.tooltip = null
		this.lastQuery = 0
		this.hoveredState = null
		this.playResolve = () => {}
		this.playTimeout = null
		this.rangeDateSet = false
	}

	setupGraph() {
		return new Promise((resolve, reject) => {
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
			
			this.tooltip = d3.select("body")
				.append("div")
				.attr("class", "tooltip")
				.style("opacity", 0)
			
			d3.json("./static/us-states.json", json => {
				// render the features onto the path we set up earlier
				this.nodes = svg.selectAll("path")
					.data(json.features)
					.enter()
					.append("path")
					.attr("d", path)
					.style("stroke", "#fff")
					.style("stroke-width", "1")
					.style("fill", "rgb(220, 220, 220)")
				
				let color = d3.scale.linear().range(["rgb(220, 220, 220)", "rgb(245, 222, 12)", "rgb(230, 130, 18)", "rgb(230, 18, 18)"]).domain([1, 2, 3, 4])
				let legend = d3.select("body")
					.select("#map-graph")
					.append("svg")
					.attr("class", "legend")
					.attr("width", 140)
					.attr("height", 200)
					.selectAll("g")
					.data(color.domain().slice().reverse())
					.enter()
					.append("g")
					.attr("transform", (d, i) => "translate(0," + i * 20 + ")");

				legend.append("circle")
					.attr("r", 5)
					.style("fill", color)
					.attr("transform", (d, i) => "translate(10, 10)");

				legend.append("text")
					.data(["Heavy cases", "Moderate cases", "Mild cases", "No cases"])
					.attr("x", 20)
					.attr("y", 10)
					.attr("dy", ".35em")
					.text(function(d) { return d; });
						
				resolve()
			})
		})
	}

	selectState(name) {
		this.nodes.style("stroke", (d) => {
			if(d.properties.name == name) {
				return "#000"
			}
			else {
				return "#fff"
			}
		})
		.style("stroke-width", (d) => {
			if(d.properties.name == name) {
				return "2"
			}
			else {
				return "1"
			}
		})

		this.setState({
			selectedUSState: name,
		})
	}

	// based on http://bl.ocks.org/michellechandra/0b2ce4923dc9b5809922
	renderGraph() {
		if(
			this.lastSelectedType == this.state.selectedType
			&& this.lastSelectedDate == this.state.selectedDate
		) {
			return
		}

		// if we update the range while we're playing, just don't query at all
		if(this.state.playing && this.rangeDateSet) {
			return
		}

		this.lastSelectedType = this.state.selectedType
		this.lastSelectedDate = this.state.selectedDate

		requestBackend(`/states-map/${this.state.selectedType.toLowerCase()}/${this.state.selectedDate}`).then((data) => {
			let maxPercent = 0
			for(let key in data) {
				let [
					value,
					population
				] = data[key]
				maxPercent = Math.max(value / population, maxPercent)
			}
			
			this.nodes.style("fill", (d) => {
				let datum = data[d.properties.name]
				let value = datum ? datum[0] : 0
				let population = datum ? datum[1] : 1
				let percent = value / population
				return d3.scale.linear()
					.range(["rgb(220, 220, 220)", "rgb(245, 222, 12)", "rgb(230, 130, 18)", "rgb(230, 18, 18)"])
					.domain([0, maxPercent / 3, maxPercent * 2 / 3, maxPercent])(percent)
			})
			.on("mouseover", (d) => {
				let datum = data[d.properties.name]
				let value = datum ? datum[0] : 0
				let population = datum ? datum[1] : 1

				let oneInHowMany = ""
				if(value > 0) {
					oneInHowMany = `<br />1 in every ${Math.floor(population / value).toLocaleString()} residents`
				}

				this.tooltip.transition()
					.duration(200)
					.style("opacity", .9)
				this.tooltip.html(`${d.properties.name}<br />${value.toLocaleString()} ${this.state.selectedType.toLowerCase()}${oneInHowMany}`)
					.style("left", (d3.event.pageX) + "px")
					.style("top", (d3.event.pageY - 28) + "px")
				
				this.hoveredState = d
			})
			.on("mousemove", (d) => {
				this.tooltip.style("left", (d3.event.pageX) + "px")
					.style("top", (d3.event.pageY - 28) + "px")
				
				this.hoveredState = d
			})
			.on("mouseout", (d) => {
				this.tooltip.transition()
					.duration(500)
					.style("opacity", 0)
				
					this.hoveredState = null
			})
			.on("mousedown", (d) => {
				this.selectState(d.properties.name)

				this.nodes.sort((a, b) => {
					return a.properties.name != d.properties.name ? -1 : 1
				})
			})

			if(this.hoveredState) {
				let datum = data[this.hoveredState.properties.name]
				let value = datum ? datum[0] : 0
				let population = datum ? datum[1] : 1

				let oneInHowMany = ""
				if(value > 0) {
					oneInHowMany = `<br />1 in every ${Math.floor(population / value).toLocaleString()} residents`
				}

				this.tooltip.html(`${this.hoveredState.properties.name}<br />${value.toLocaleString()} ${this.state.selectedType.toLowerCase()}${oneInHowMany}`)
			}

			this.playResolve()
			this.playResolve = () => {}
		})
	}
	
	componentDidMount() {
		this.setupGraph().then(() => {
			this.renderGraph()
		})
	}

	componentDidUpdate() {
		this.renderGraph()
	}

	stepMap() {
		let date = new Date(2020, 1, 21) // starting date
		let maxDate = new Date(2020, 1, 21)
		maxDate.setDate(maxDate.getDate() + 230)

		this.rangeDateSet = false

		if(this.state.sliderValue >= 230) {
			this.stopMap()
		}
		else {
			this.lastQuery = performance.now()
			
			date.setDate(date.getDate() + this.state.sliderValue + 1)
			this.setState({
				sliderValue: this.state.sliderValue + 1,
				selectedDate: date.toISOString().slice(0, 19).split("T")[0],
			})

			this.playResolve = () => {
				this.playTimeout = setTimeout(
					() => {
						this.stepMap()
					},
					Math.max(0, 100 - Math.floor(performance.now() - this.lastQuery))
				)
			}
		}
	}

	playMap() {
		this.stepMap()
	}

	stopMap() {
		clearTimeout(this.playTimeout)
		this.playResolve = () => {}
	}

	render() {
		const OnButtonClick  = () => {
			if(this.state.selectedType == "Cases")
			{
				this.setState({
					selectedType: "Deaths"
				});
			}
			else
			{
				this.setState({
					selectedType: "Cases"
				});
			}
		
		};
		return <div class="map-graph-container">
			<Row gutter={32}>
			<Col>
			<Switch checkedChildren="Deaths" unCheckedChildren="Cases" onClick={OnButtonClick} />
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
									this.rangeDateSet = true
									this.setState({
										selectedDate: date.toISOString().slice(0, 19).split("T")[0],
									})
								}, 100)

								this.setState({
									sliderValue: Math.floor(event.target.value | 0),
									graphDebounce: timeout,
								})
							}
						}
					/>
					<div>
						<img
							className="play-button"
							src={this.state.playing ? "/static/pause.svg" : "/static/play.svg"}
							onClick={() => {
								let newState = !this.state.playing
								this.setState({
									playing: newState,
								})

								if(newState) {
									this.playMap()
								}
								else {
									this.stopMap()
								}
							}}
						/>
					</div>
			</Col>
			<Col style={{
				marginTop: 50,
			}}>
				<CountiesTable
					state={this.state.selectedUSState}
					dataType={this.state.selectedType}
					date={this.state.selectedDate}
				/>
			</Col>
			</Row>
			<div className="site-card-wrapper">
    			<Row gutter={16}>
      				<Col span={12}>
        				<Card title="National Status Breakdown" bordered={true} >
          					<div className="label">Deaths: </div>
							<div className="label">Cases: </div>
        				</Card>
      				</Col>
      				<Col span={12}>
       					<Card title="Regular Mask Usage of U.S." bordered={true}>
						   <div className="label">Percentage of People who Regularly Wear Masks:  </div>
        				</Card>
      				</Col>
    			</Row>
				<Divider orientation="left"></Divider>
				<Row gutter={16}>
					<Col span={12}>
        				<Card title="Status of Mask Mandates as of July" bordered={true}>
							<Table size={"small"} columns={columns} dataSource={this.state.data} />
        				</Card>
      				</Col>
					<Col span={12}>
       					<Card title="Total Business Closures in U.S." bordered={true}>
						   <div className="label">Closures:  </div>
        				</Card>
      				</Col>
				</Row>
  			</div>
			  <Card title="Status Breakdown based on State Mask Mandates">
							<Select defaultValue="Yes">
                        		<Option value="Yes">Mask Mandate</Option>
                        		<Option value="No">No Mask Mandate</Option>
                    		</Select>
							<div className="label">Deaths: </div>
							<div className="label">Cases: </div>
							<div className="label">Percentage of Frequent Mask Usage: </div>
						</Card>
		</div>
	}
}