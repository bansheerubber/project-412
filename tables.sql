CREATE DATABASE covid_data;

CREATE TABLE Governor (
	id INTEGER,
	state_id INTEGER,
	name CHAR(40),
	pro_mask boolean,
	PRIMARY KEY(id)
);