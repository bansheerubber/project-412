#!/bin/sh
sudo -u postgres createuser -s $USER # add our current user as a role
createdb covid_data
psql -d covid_data < tables.sql