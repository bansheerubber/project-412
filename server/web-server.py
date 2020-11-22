from flask import Flask, Response, url_for, redirect, render_template, request, session, flash, jsonify
import flask
import psycopg2
import logging
import json
import math

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

@app.route('/counties-list/<state>')
def counties_list(state):
	connection = create_db_connection()
	cursor = connection.cursor()

	cursor.execute(
		"""SELECT p.Name FROM Place p
		JOIN County c ON p.Place_id = c.Place_id
		JOIN State s ON s.State_id = c.State_id
		JOIN Place p2 ON s.Place_id = p2.Place_id
		WHERE p2.Name = %s
		ORDER BY p.Name ASC;
		""",
		[state]
	)

	return json.dumps([datum[0] for datum in cursor.fetchall()])

@app.route('/county-compare/<state>/<county>/<date>')
def county_compare(state, county, date):
	connection = create_db_connection()
	cursor = connection.cursor()

	big = {}

	cursor.execute(
		"""SELECT st.Cases, st.Deaths, md._Never, md.Rarely, md.Sometimes, md.Frequently, md._Always FROM Mask_Data md
		JOIN Place p ON md.Place_id = p.Place_id
		JOIN County c ON p.Place_id = c.Place_id
		JOIN State s ON c.State_id = s.State_id
		JOIN Place p2 ON p2.Place_id = s.Place_id
		JOIN Status st ON st.Place_id = c.Place_id
		WHERE p.Name = %s
		AND p2.Name = %s
		AND st.Date = %s;""",
		[county, state, date]
	)
	data = cursor.fetchone()
	big["cases"] = "{:,}".format(data[0] * 100)
	big["deaths"] = "{:,}".format(data[1] * 100)
	big["never"] = "{:.1f}%".format(data[2] * 100)
	big["rarely"] = "{:.1f}%".format(data[3] * 100)
	big["sometimes"] = "{:.1f}%".format(data[4] * 100)
	big["frequently"] = "{:.1f}%".format(data[5] * 100)
	big["always"] = "{:.1f}%".format(data[6] * 100)
	
	return json.dumps(big)

@app.route('/state/<state>/<date>')
def state(state, date):
	connection = create_db_connection()
	cursor = connection.cursor()

	big = {}
	
	cursor.execute(
		"""SELECT SUM(Deaths), SUM(Cases), p.Population FROM Status s
		JOIN State st ON s.Place_id = st.Place_id
		JOIN Place p ON s.Place_id = p.Place_id
		WHERE Date = %s
		AND p.Name = %s
		GROUP BY p.Place_id;""",
		[date, state]
	)
	data = cursor.fetchone()
	deaths = data[0]
	cases = data[1]
	population = data[2]

	big["deathsInPopulation"] = "1 in {:,} residents".format(math.floor(population / deaths))
	big["casesInPopulation"] = "1 in {:,} residents".format(math.floor(population / cases))
	big["deaths"] = "{:,}".format(deaths)
	big["cases"] = "{:,}".format(cases)

	cursor.execute(
		"""SELECT AVG(_Never), AVG(Rarely), AVG(Sometimes), AVG(Frequently), AVG(_Always) FROM Mask_Data md
		JOIN State s ON md.Place_id = s.Place_id
		JOIN Governor g ON g.State_id = s.State_id
		JOIN Place p ON s.Place_id = p.Place_id
		WHERE p.Name = %s;""",
		[state]
	)
	data = cursor.fetchone()
	big["maskUsageNever"] = "{:.1f}%".format(float(data[0]) * 100)
	big["maskUsageRarely"] = "{:.1f}%".format(float(data[1]) * 100)
	big["maskUsageSometimes"] = "{:.1f}%".format(float(data[2]) * 100)
	big["maskUsageFrequently"] = "{:.1f}%".format(float(data[3]) * 100)
	big["maskUsageAlways"] = "{:.1f}%".format(float(data[4]) * 100)

	cursor.execute(
		"""SELECT Governor.Name, Governor.Pro_mask 
		FROM Governor, State, Place 
		WHERE Governor.State_id = State.State_id 
		AND State.Place_id = Place.Place_id
		AND Place.Name = %s;""",
		[state]
	)
	data = cursor.fetchone()
	big["governorName"] = data[0]
	big["proMask"] = data[1]

	cursor.execute(
		"""SELECT StateCount.count + CountyCount.count + DistrictCount.count FROM (
			SELECT COUNT(Business) as count FROM Business, State, Place
				WHERE Business.Closed = True
				AND Business.Place_id = State.Place_id
				AND Place.Place_id = State.Place_id	
				AND Place.Name = %s
		) AS StateCount, (
			SELECT COUNT(Business) FROM Business, State, Place, County
				WHERE Business.Closed = True
				AND Business.Place_id = County.Place_id
				AND County.State_id = State.State_id
				AND Place.Place_id = State.State_id
				AND Place.Name = %s
		) AS CountyCount, (
			SELECT COUNT(Business) FROM Business, State, Place, District, County
				WHERE Business.Closed = True
				AND Business.Place_id = District.Place_id
				AND County.Place_id = District.County_id
				AND County.State_id = State.State_id
				AND Place.Place_id = State.State_id
				AND Place.Name = %s
		) AS DistrictCount;""",
		[state, state, state]
	)
	big["businessesClosed"] = cursor.fetchone()[0]

	return json.dumps(big)

@app.route('/national/<date>')
def national(date):
	connection = create_db_connection()
	cursor = connection.cursor()

	big = {}

	# how many governors are pro-mask
	cursor.execute(
		"""SELECT COUNT(Governor.Pro_mask) FROM State, Governor
		WHERE State.State_id = Governor.state_id AND Governor.Pro_mask = True;""",
	)
	big["proMaskGovernors"] = str(cursor.fetchone()[0])

	# list the states that are pro-mask or anti-mask
	cursor.execute(
		"""SELECT p.Name, g.Pro_mask FROM Place p
		JOIN State s ON s.Place_id = p.Place_id
		JOIN Governor g ON g.State_id = s.State_id""",
	)
	data = cursor.fetchall()
	big["maskSupport"] = [{"state": datum[0], "value": "yes" if datum[1] else "no"} for datum in data]

	# business closed count
	cursor.execute(
		"""SELECT COUNT(Business) FROM Business
		WHERE Business.Closed = True;""",
	)
	big["closedBusinesses"] = "{:,}".format(int(cursor.fetchone()[0]))

	# mask usage in general
	cursor.execute(
		"""SELECT AVG(Frequently) + AVG(_Always)
		FROM Mask_Data, State
		WHERE Mask_data.Place_id = State.Place_id;"""
	)
	big["maskUsage"] = "{:.1f}%".format(float(cursor.fetchone()[0]) * 100)

	# mask % for pro-mask
	cursor.execute(
		"""SELECT AVG(Frequently) + AVG(_Always), SUM(p.Population) FROM Mask_Data md
		JOIN State s ON md.Place_id = s.Place_id
		JOIN Governor g ON g.State_id = s.State_id
		JOIN Place p ON s.Place_id = p.Place_id
		WHERE g.Pro_Mask = True;"""
	)
	data = cursor.fetchone()
	big["proMaskMaskUsage"] = "{:.1f}%".format(float(data[0]) * 100)
	big["proMaskPopulation"] = "{:,}".format(int(data[1]))

	# mask % for anti-mask
	cursor.execute(
		"""SELECT AVG(Frequently) + AVG(_Always), SUM(p.Population) FROM Mask_Data md
		JOIN State s ON md.Place_id = s.Place_id
		JOIN Governor g ON g.State_id = s.State_id
		JOIN Place p ON s.Place_id = p.Place_id
		WHERE g.Pro_Mask = False;"""
	)
	data = cursor.fetchone()
	big["antiMaskMaskUsage"] = "{:.1f}%".format(float(data[0]) * 100)
	big["antiMaskPopulation"] = "{:,}".format(int(data[1]))

	# total deaths/cases for pro-mask
	cursor.execute(
		"""SELECT SUM(Deaths), SUM(Cases) FROM Status s
		JOIN State st ON s.Place_id = st.Place_id
		JOIN Governor g ON g.State_id = st.State_id
		WHERE g.Pro_Mask = True
		AND Date = (SELECT MAX(Date) FROM Status);"""
	)
	data = cursor.fetchone()
	big["proMaskDeaths"] = "{:,}".format(int(data[0]))
	big["proMaskCases"] = "{:,}".format(int(data[1]))

	# total deaths/cases for anti-mask
	cursor.execute(
		"""SELECT SUM(Deaths), SUM(Cases) FROM Status s
		JOIN State st ON s.Place_id = st.Place_id
		JOIN Governor g ON g.State_id = st.State_id
		WHERE g.Pro_Mask = False
		AND Date = (SELECT MAX(Date) FROM Status);"""
	)
	data = cursor.fetchone()
	big["antiMaskDeaths"] = "{:,}".format(int(data[0]))
	big["antiMaskCases"] = "{:,}".format(int(data[1]))

	# total deaths/cases for the date
	cursor.execute(
		"""SELECT SUM(Deaths), SUM(Cases) FROM Status s
		JOIN State st ON s.Place_id = st.Place_id
		JOIN Governor g ON g.State_id = st.State_id
		WHERE g.Pro_Mask = False
		AND Date = %s;""",
		[date]
	)
	data = cursor.fetchone()
	big["deaths"] = "{:,}".format(0 if not data[0] else int(data[0]))
	big["cases"] = "{:,}".format(0 if not data[1] else int(data[1]))

	return json.dumps(big)

if __name__ == '__main__':
	handler = logging.StreamHandler()
	handler.setLevel(logging.INFO)
	app.debug = True
	app.logger.addHandler(handler)
	app.run(host='0.0.0.0', debug=True)