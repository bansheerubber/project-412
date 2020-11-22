import * as React from "react";
import { Table, Col, Row} from 'antd';

/*
props type: {
	state: string
	dateType: string
	date: string (in MYSQL format)
}
*/
const columns = [

	{
		title: "County",
		dataIndex:"county",
		key: "county",
	},

	{
		title: dataType,
		dataIndex:"amount",
		key: "amount",
	},

];
export default class CountiesTable extends React.Component {
	constructor(props) {
		super(props)
		this.state = {
			data: [],
		}

		this.lastState = ""
		this.lastDataType = ""
		this.lastDate = ""
	}

	componentDidUpdate() {
		this.checkProps()
	}

	componentDidMount() {
		this.checkProps()
	}

	checkProps() {
		if(
			this.props.state != this.lastState
			|| this.props.dataType != this.lastDataType
			|| this.props.date != this.lastDate
		) {
			this.lastState = this.props.state
			this.lastDataType = this.props.dataType
			this.lastDate = this.props.date

			this.query()
		}
	}
	
	query() {
		let request = new XMLHttpRequest()
		request.open("GET", `/counties/${this.props.state}/${this.props.dataType.toLowerCase()}/${this.props.date}`, true)
		request.responseType = "text"

		request.onload = (event) => {
			this.setState({
				data: JSON.parse(request.response),
			})
		}
		request.send()
	}
	
	render() {
		let data = []
		let total = 0
		for(let countyName in this.state.data) {
			data.push(<tr key={data.length}>
				<td>{countyName}</td>
				<td>{this.state.data[countyName]}</td>
			</tr>)
			total += this.state.data[countyName]
		}

		data.unshift(
			<tr
				key={data.length}
				style={{
					fontWeight: "bold",
				}}
			>
				<td>Total {this.props.dataType}</td>
				<td>{total}</td>
			</tr>
		)
		
		return (
			<Table size={"middle"} columns={columns} dataSource={this.state.data} />
		);
	}
}