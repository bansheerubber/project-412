import { Col, Row, Card, Table, Input, Select, Divider, Switch, Button, Modal } from "antd"
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
		dataIndex: "state",
		key: "state",
	},

	{
		title: "Mask Mandate",
		dataIndex: "value",
		key: "value",
	},

];

const countyColumns = [
	{
		title: "Always",
		dataIndex: "always",
		key: "always"
	},

	{
		title: "Frequently",
		dataIndex: "frequently",
		key: "frequently"
	},

	{
		title: "Sometimes",
		dataIndex: "sometimes",
		key: "sometimes"
	},

	{
		title: "Rarely",
		dataIndex: "rarely",
		key: "rarely"
	},

	{
		title: "Never",
		dataIndex: "never",
		key: "never"
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
			nationalStats: {}, // hello global state
			county1Stats: {},
			county2Stats: {},
			usStateStats: {}, // stats for the selected US state
			countyList: [], // list of counties for the currently selected state
			nationalMaskMandate: "Yes",
			visible1: false,
			visible2: false,
			county1: null,
			county2: null,
		}

		this.lastSelectedType = ""
		this.lastSelectedDate = ""

		this.nodes = null
		this.tooltip = null
		this.lastQuery = 0
		this.hoveredState = null
		this.playResolve = () => { }
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
					.text(function (d) { return d; });

				resolve()
			})
		})
	}

	selectState(name) {
		this.nodes.style("stroke", (d) => {
			if (d.properties.name == name) {
				return "#000"
			}
			else {
				return "#fff"
			}
		}).style("stroke-width", (d) => {
			if (d.properties.name == name) {
				return "2"
			}
			else {
				return "1"
			}
		})

		this.setState({
			selectedUSState: name,
			county1: null,
			county2: null,
		})

		this.nodes.sort((a, b) => {
			return a.properties.name != name ? -1 : 1
		})

		// query counties list
		requestBackend(`./counties-list/${name}`).then((json) => {
			this.setState({
				countyList: json,
			})
		})

		this.getState()
	}

	// based on http://bl.ocks.org/michellechandra/0b2ce4923dc9b5809922
	renderGraph() {
		return new Promise((resolve, reject) => {
			// if we update the range while we're playing, just don't query at all
			if (this.state.playing && this.rangeDateSet) {
				return
			}

			requestBackend(`./states-map/${this.state.selectedType.toLowerCase()}/${this.state.selectedDate}`).then((data) => {
				let maxPercent = 0
				for (let key in data) {
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
						.domain([0, maxPercent / 3 + 0.000001, maxPercent * 2 / 3 + 0.000002, maxPercent + 0.000003])(percent)
				}).on("mouseover", (d) => {
					let datum = data[d.properties.name]
					let value = datum ? datum[0] : 0
					let population = datum ? datum[1] : 1

					let oneInHowMany = ""
					if (value > 0) {
						oneInHowMany = `<br />1 in every ${Math.floor(population / value).toLocaleString()} residents`
					}

					this.tooltip.transition()
						.duration(200)
						.style("opacity", .9)

					this.tooltip.html(`${d.properties.name}<br />${value.toLocaleString()} ${this.state.selectedType.toLowerCase()}${oneInHowMany}`)
						.style("left", (d3.event.pageX) + "px")
						.style("top", (d3.event.pageY - 28) + "px")

					this.hoveredState = d
				}).on("mousemove", (d) => {
					this.tooltip.style("left", (d3.event.pageX) + "px")
						.style("top", (d3.event.pageY - 28) + "px")

					this.hoveredState = d
				}).on("mouseout", (d) => {
					this.tooltip.transition()
						.duration(500)
						.style("opacity", 0)

					this.hoveredState = null
				}).on("mousedown", (d) => {
					this.selectState(d.properties.name)
				})

				if (this.hoveredState) {
					let datum = data[this.hoveredState.properties.name]
					let value = datum ? datum[0] : 0
					let population = datum ? datum[1] : 1

					let oneInHowMany = ""
					if (value > 0) {
						oneInHowMany = `<br />1 in every ${Math.floor(population / value).toLocaleString()} residents`
					}

					this.tooltip.html(`${this.hoveredState.properties.name}<br />${value.toLocaleString()} ${this.state.selectedType.toLowerCase()}${oneInHowMany}`)
				}

				this.playResolve()
				this.playResolve = () => { }
				resolve()
			})
		})
	}

	componentDidMount() {
		this.setupGraph().then(() => {
			this.renderGraph().then(() => {
				this.selectState("Arizona")
			})
			this.getNational()
			this.getState()
		})
	}

	componentDidUpdate() {
		if (
			this.lastSelectedType != this.state.selectedType
			|| this.lastSelectedDate != this.state.selectedDate
		) {
			this.lastSelectedType = this.state.selectedType
			this.lastSelectedDate = this.state.selectedDate

			this.renderGraph()

			// we need to update the national stats since they are reliant on date
			this.getNational()
			this.getState()
		}

		if(this.lastCounty1 != this.state.county1) {
			this.lastCounty1 = this.state.county1

			if(this.state.county1) {
				requestBackend(`./county-compare/${this.state.selectedUSState}/${this.state.county1.trim()}/${this.state.selectedDate}`).then((json) => {
					this.setState({
						county1Stats: json,
					})
				})
			}
			else {
				this.setState({
					county1Stats: {},
				})
			}
		}

		if(this.lastCounty2 != this.state.county2) {
			this.lastCounty2 = this.state.county2

			if(this.state.county2) {
				requestBackend(`./county-compare/${this.state.selectedUSState}/${this.state.county2.trim()}/${this.state.selectedDate}`).then((json) => {
					this.setState({
						county2Stats: json,
					})
				})
			}
			else {
				this.setState({
					county2Stats: {},
				})
			}
		}
	}

	getNational() {
		requestBackend(`./national/${this.state.selectedDate}`).then((json) => {
			this.setState({
				nationalStats: json,
			})
		})
	}

	getState() {
		requestBackend(`./state/${this.state.selectedUSState}/${this.state.selectedDate}`).then((json) => {
			this.setState({
				usStateStats: json,
			})
		})
	}

	stepMap() {
		let date = new Date(2020, 1, 21) // starting date
		let maxDate = new Date(2020, 1, 21)
		maxDate.setDate(maxDate.getDate() + 230)

		this.rangeDateSet = false

		if (this.state.sliderValue >= 230) {
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
		this.playResolve = () => { }
	}

	render() {
		const OnButtonClick = () => {
			if (this.state.selectedType == "Cases") {
				this.setState({
					selectedType: "Deaths"
				});
			}
			else {
				this.setState({
					selectedType: "Cases"
				});
			}

		};

		const showModal1 = () => {
			this.setState({
				visible1: true,
			});
		};

		const showModal2 = () => {
			this.setState({
				visible2: true,
			});
		};

		const handleOk1 = e => {
			console.log(e);
			this.setState({
				visible1: false,
			});
		};

		const handleCancel1 = () => {
			this.setState({ visible1: false });
		};

		const handleOk2 = e => {
			console.log(e);
			this.setState({
				visible2: false,
			});
		};

		const handleCancel2 = () => {
			this.setState({ visible2: false });
		};

		const onCounty1Change = value => {
			console.log(value)
			this.setState({
				county1: value,
			});
		};

		const onCounty2Change = value => {
			this.setState({
				county2: value,
			});
		};

		return <div>
			<Row gutter={32}>
				<Col>
					<div class="map-graph-container">
						<div style={{
							display: "flex",
							alignItems: "center",
						}}>
							<h2 style={{
								paddingRight: 10,
							}}>COVID-19 {this.state.selectedType} per State on {this.state.selectedDate}</h2>
							<Switch checkedChildren="Deaths" unCheckedChildren="Cases" onClick={OnButtonClick} />
						</div>
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
								src={this.state.playing ? "./static/pause.svg" : "./static/play.svg"}
								onClick={() => {
									let newState = !this.state.playing
									this.setState({
										playing: newState,
									})

									if (newState) {
										this.playMap()
									}
									else {
										this.stopMap()
									}
								}}
							/>
						</div>
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
			
			<div style={{
				display: "flex",
				justifyContent: "center",
				marginTop: 50,
			}}>
				<Button type="primary" onClick={showModal1}>
					National Covid Statistics
				</Button>

				<Button type="secondary" className="button-secondary" onClick={showModal2}>
					{`${this.state.selectedUSState} covid-19 statistics`}
				</Button>
			</div>

			<Modal
				destroyOnClose={true}
				title="National Covid-19 Statistics"
				visible={this.state.visible1}
				width={1000}
				onOk={handleOk1}
				onCancel={handleCancel1}
			>
				<div className="site-card-wrapper">
					<Row gutter={16}>
						<Col span={12} style={{
							margin: "auto",
						}}>
							<Card title="National Status Breakdown" bordered={true} >
								<div className="data-label">{this.state.nationalStats.deaths || 0} deaths</div>
								<div className="data-label">{this.state.nationalStats.cases || 0} cases</div>
							</Card>
						</Col>
					</Row>

					<Divider orientation="left"></Divider>

					<Row gutter={16}>
						<Col span={12}>
							<Card title="Total Business Closures in U.S." bordered={true}>
								<div className="data-label">{this.state.nationalStats.closedBusinesses || 0} business closures</div>
							</Card>
						</Col>

						<Col span={12}>
							<Card title="Regular Mask Usage of U.S." bordered={true}>
								<div className="data-label">{this.state.nationalStats.maskUsage || "0%"} of people use masks</div>
							</Card>
						</Col>
					</Row>

					<Divider orientation="left"></Divider>

					<Row gutter={16}>
						<Col span={12}>
							<Card title="Status of Mask Mandates as of July" bordered={true}>
								<div className="data-label down-margin">{this.state.nationalStats.proMaskGovernors || 0} states support masks</div>
								<Table
									size={"small"}
									columns={columns}
									dataSource={this.state.nationalStats.maskSupport}
									pagination={{
										total: this.state.nationalStats.maskSupport?.length || 0,
										pageSize: 5,
									}}
								/>
							</Card>
						</Col>

						<Col span={12}>
							<Card title="Status Breakdown based on State Mask Mandates">
								<div className="data-label">{this.state.nationalStats[this.state.nationalMaskMandate == "Yes" ? "proMaskDeaths" : "antiMaskDeaths"] || 0} deaths</div>
								<div className="data-label">{this.state.nationalStats[this.state.nationalMaskMandate == "Yes" ? "proMaskCases" : "antiMaskCases"] || 0 || 0} cases</div>
								<div className="data-label down-margin">{this.state.nationalStats[this.state.nationalMaskMandate == "Yes" ? "proMaskMaskUsage" : "antiMaskMaskUsage"] || 0 || "0%"} mask usage</div>
								<Select
									defaultValue="Yes"
									value={this.state.nationalMaskMandate}
									onChange={
										value => this.setState({
											nationalMaskMandate: value,
										})
									}
									style={{
										width: "100%",
									}}
								>
									<Option value="Yes">Mask Mandate</Option>
									<Option value="No">No Mask Mandate</Option>
								</Select>
							</Card>
						</Col>
					</Row>
				</div>
			</Modal>

			<Modal
				destroyOnClose={true}
				title={`${this.state.selectedUSState} covid-19 statistics`}
				visible={this.state.visible2}
				width={1000}
				onOk={handleOk2}
				onCancel={handleCancel2}
			>
				<div className="site-card-wrapper">
					<Row gutter={16}>
						<Col style={{
							margin: "auto",
						}}>
							<Card title={`${this.state.selectedUSState} County Comparison Tool`}>
								<Row gutter={16}>
									<Col span={12}>
										<Select placeholder="County 1" value={this.state.county1} onChange={onCounty1Change} style={{width: "100%"}}>
											{this.state.countyList.map(d => (
												<Option key={d}>{d}</Option>
											))}
										</Select>
									</Col>
									<Col span={12}>
										<Select placeholder="County 2" value={this.state.county2} onChange={onCounty2Change} style={{width: "100%"}}>
											{this.state.countyList.map(d => (
												<Option key={d}>{d}</Option>
											))}
										</Select>
									</Col>
								</Row>
								<Row gutter={16}>
									<Col span={12}>
										<div className="data-label">{this.state.county1Stats.deaths || 0} deaths</div>
										<div className="data-label">{this.state.county1Stats.cases || 0} cases</div>
									</Col>
									<Col span={12}>
										<div className="data-label">{this.state.county2Stats.deaths || 0} deaths</div>
										<div className="data-label">{this.state.county2Stats.cases || 0} cases</div>
									</Col>
									<div style={{
										width: "100%",
										display: "flex",
										justifyContent: "space-evenly",
									}}>
										<Table size={"small"} columns={countyColumns} dataSource={this.state.county1Stats.maskData} pagination={false} />
										<Table size={"small"} columns={countyColumns} dataSource={this.state.county2Stats.maskData} pagination={false} />
									</div>
								</Row>
							</Card>
						</Col>
					</Row>

					<Divider orientation="left"></Divider>

					<Row gutter={16}>
						<Col span={12}>
							<Card title={`${this.state.selectedUSState} Status Breakdown`} bordered={true} >
								<div className="data-label">{this.state.usStateStats.population || 0} residents</div>
								<div className="data-label">{this.state.usStateStats.deaths || 0} deaths</div>
								<div className="data-label">{this.state.usStateStats.cases || 0} cases</div>
							</Card>
						</Col>

						<Col span={12}>
							<Card title={`${this.state.selectedUSState} Mask Use Breakdown`} bordered={true}>
								<Table size={"small"} columns={countyColumns} dataSource={this.state.usStateStats.maskData} pagination={false} />
							</Card>
						</Col>
					</Row>

					<Divider orientation="left"></Divider>

					<Row gutter={16}>
						<Col span={12}>
							<Card title={`Total Business Closures in ${this.state.selectedUSState}`} bordered={true}>
								<div className="data-label">{this.state.usStateStats.businessesClosed || 0} business closures</div>
							</Card>
						</Col>
						<Col span={12}>
							<Card title={"Governor Information"}>
								<div className="data-label">{this.state.usStateStats.governorName}</div>
								<hr />
								<div className="data-label">{this.state.usStateStats.proMask ? "Supports masks" : "Doesn't support masks"} </div>
							</Card>
						</Col>
					</Row>
				</div>
			</Modal>
		</div>
	}
}