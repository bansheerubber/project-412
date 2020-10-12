@echo off
psql -U postgres -c "CREATE ROLE %username% CREATEDB CREATEROLE SUPERUSER LOGIN PASSWORD 'root'"
dropdb covid_data
createdb covid_data
psql -d covid_data < tables.sql