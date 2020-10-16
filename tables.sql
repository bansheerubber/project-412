CREATE DATABASE covid_data;

CREATE TABLE Place (
	Place_id SERIAL,
	Fips INTEGER,
	Name CHAR(40),
	Population INTEGER,
	PRIMARY KEY(Place_id)
);

CREATE TABLE State (
	State_id SERIAL,
	Place_id INTEGER,
	PRIMARY KEY(State_id),
	FOREIGN KEY(Place_id) REFERENCES Place
);

CREATE TABLE Governor (
	Gov_id SERIAL,
	State_id INTEGER,
	Name CHAR(40),
	Pro_mask BOOLEAN,
	PRIMARY KEY(Gov_id),
	FOREIGN KEY (State_id) REFERENCES State
);

CREATE TABLE County (
	County_id SERIAL,
	State_id INTEGER,
	Place_id INTEGER,
	PRIMARY KEY(County_id),
	FOREIGN KEY(State_id) REFERENCES State,
	FOREIGN KEY(Place_id) REFERENCES Place
);

CREATE TABLE District (
	District_id SERIAL,
	County_id INTEGER,
	Place_id INTEGER,
	PRIMARY KEY(District_id),
	FOREIGN KEY(Place_id) REFERENCES Place
);

CREATE TABLE Business (
	Business_id SERIAL,
	Place_id INTEGER,
	Name CHAR(40),
	Closed BOOLEAN,
	PRIMARY KEY(Business_id),
	FOREIGN KEY(Place_id) REFERENCES Place
);

CREATE TABLE Status (
	Place_id INTEGER,
	Date DATE,
	Deaths INTEGER,
	Cases INTEGER,
	PRIMARY KEY(Place_id, Date),
	FOREIGN KEY (Place_id) REFERENCES Place
);

CREATE TABLE Mask_Data (
	Place_id INTEGER,
	Rarely FLOAT,
	Never FLOAT,
	Always FLOAT,
	Sometimes FLOAT,
	Frequently FLOAT,
	PRIMARY KEY (Place_id),
	FOREIGN KEY(Place_id) REFERENCES Place
);
