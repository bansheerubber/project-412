from flask import Flask, Response, url_for, redirect, render_template, request, session, flash, jsonify
import flask
import psycopg2
import logging
import json

app = Flask(__name__)

def create_db_connection():
	role = open('../role.txt').readline().strip()
	connection = psycopg2.connect(
		user=role,
		password="root",
		host="localhost",
		port="5432",
		database="covid_data"
	)
	return connection

@app.route('/')
def index():
  return render_template("index.html")

@app.route('/states-map/<data_type>/<date>')
def states_map(data_type, date):
	connection = create_db_connection()
	cursor = connection.cursor()
	
	data = []
	if data_type == "cases":
		cursor.execute(
			"""SELECT p.Name, s.Cases, p.Population FROM Status s
			JOIN Place p ON s.Place_id = p.Place_id
			JOIN State st ON p.Place_id = st.Place_id
			WHERE Date = %s;""",
			[date]
		)
		data = cursor.fetchall()
	else:
		cursor.execute(
			"""SELECT p.Name, s.Deaths, p.Population FROM Status s
			JOIN Place p ON s.Place_id = p.Place_id
			JOIN State st ON p.Place_id = st.Place_id
			WHERE Date = %s;""",
			[date]
		)
		data = cursor.fetchall()

	return json.dumps({datum[0].strip(): (int(datum[1]), int(datum[2])) for datum in data})

@app.route('/counties/<state>/<data_type>/<date>')
def counties(state, data_type, date):
	connection = create_db_connection()
	cursor = connection.cursor()
	
	data = []
	if data_type == "cases":
		cursor.execute(
			"""SELECT p.Name, s.Cases FROM Status s
			JOIN Place p ON s.Place_id = p.Place_id
			JOIN County c ON p.Place_id = c.Place_id
			JOIN State st ON c.State_id = st.State_id
			JOIN Place p2 ON st.Place_id = p2.Place_id
			WHERE p2.Name = %s AND Date = %s
			ORDER BY s.Cases DESC;""",
			[state, date]
		)
		data = cursor.fetchall()
	else:
		cursor.execute(
			"""SELECT p.Name, s.Deaths FROM Status s
			JOIN Place p ON s.Place_id = p.Place_id
			JOIN County c ON p.Place_id = c.Place_id
			JOIN State st ON c.State_id = st.State_id
			JOIN Place p2 ON st.Place_id = p2.Place_id
			WHERE p2.Name = %s AND Date = %s
			ORDER BY s.Deaths DESC;""",
			[state, date]
		)
		data = cursor.fetchall()
	
	return json.dumps([{"key": data.index(datum), "county": datum[0].strip(), "amount": int(datum[1])} for datum in data])

if __name__ == '__main__':
	handler = logging.StreamHandler()
	handler.setLevel(logging.INFO)
	app.debug = True
	app.logger.addHandler(handler)
	app.run(host='0.0.0.0', debug=True)