from flask import Flask, Response, url_for, redirect, render_template, request, session, flash, jsonify
import flask
import psycopg2
import logging
import json

app = Flask(__name__)

def create_db_connection():
	role = open('../role.txt').readline()
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

@app.route('/states-map')
def states_map():
	connection = create_db_connection()
	cursor = connection.cursor()

	cursor.execute("""SELECT p.Name, s.Cases FROM Status s JOIN Place p ON s.Place_id = p.Place_id JOIN State st ON p.Place_id = st.Place_id WHERE Date = '2020-09-22';""")
	data = cursor.fetchall()
	return json.dumps({datum[0].strip(): int(datum[1]) for datum in data})

if __name__ == '__main__':
	handler = logging.StreamHandler()
	handler.setLevel(logging.INFO)
	app.debug = True
	app.logger.addHandler(handler)
	app.run(host='0.0.0.0', debug=True)