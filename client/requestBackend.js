export default async function requestBackend(endpoint) {
	return new Promise((resolve, reject) => {
		let request = new XMLHttpRequest()
		request.open("GET", endpoint, true)
		request.responseType = "text"

		request.onload = (event) => {
			resolve(JSON.parse(request.response))
		}
		request.send()
	})
}