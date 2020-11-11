import * as React from "react"
import * as ReactDOM from "react-dom"
import MapGraph from "./mapGraph"

ReactDOM.render(<div className="container">
	<MapGraph />
</div>, document.getElementById("react-container"))

require("./mapGraph")

