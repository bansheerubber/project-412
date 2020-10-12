@echo off
psql -U postgres -c "CREATE ROLE bansheerubber CREATEDB CREATEROLE SUPERUSER LOGIN PASSWORD 'root'"
createdb covid_data
psql -d covid_data < tables.sql