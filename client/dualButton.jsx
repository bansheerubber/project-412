import * as React from "react"

/*
props type: {
	button1Name: string
	button2Name: string
	button1OnClick: (event) => void
	button2OnClick: (event) => void
}

state type: {
	selectedButton: 1 | 2
}
*/
export default class DualButton extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			selectedButton: 1,
		}
	}

	render() {
		return <div className="dual-button">
			<button
				className={this.state.selectedButton == 1 ? "active" : ""}
				onClick={
					event => {
						this.setState({
							selectedButton: 1
						})
						this.props.button1OnClick(event)
					}
				}
			>{this.props.button1Name}</button>
			<button
				className={this.state.selectedButton == 2 ? "active" : ""}
				onClick={
					event => {
						this.setState({
							selectedButton: 2
						})
						this.props.button2OnClick(event)
					}
				}
			>{this.props.button2Name}</button>
		</div>
	}
}