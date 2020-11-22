import * as React from "react";
import { Table, Col, Row} from 'antd';
import requestBackend from "./requestBackend"

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
		title: "Placeholder",
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
		requestBackend(`/counties/${this.props.state}/${this.props.dataType.toLowerCase()}/${this.props.date}`).then((json) => {
			this.setState({
				data: json,
			})
		})
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
			<Table
				size={"middle"}
				columns={[{
					title: "County",
					dataIndex:"county",
					key: "county",
				}, {
					title: this.props.dataType,
					dataIndex: "amount",
					key: "amount",
				}]}
				dataSource={this.state.data}
			/>
		);
	}
}