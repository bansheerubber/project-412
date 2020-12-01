# Live Website Link

http://bansheerubber.com/project-412/

# Setting Up Database

Run either `create.bat` or `create.sh` depending on which OS you're using.  
To create the `role.txt` file, run `echo %username% > role.txt` if you're on Windows or `echo $USER > role.txt` if you're on Linux.  
In a command line, run `pip install -r requirements.txt`. This will install all the requirements needed.  
Run `python populate_data.py` to populate the database with data from the various .csv files.  

# Setting Up Webserver

Run `yarn global add webpack webpack-cli`, and then close and reopen the command line.  
In a commmand line, run `pip install -r requirements.txt`, and then run `yarn install`.  
To build the client, `cd ./client` and then run `webpack`.  
To start the server, `cd ./server` and then run `python web-server.py`. Make sure you have a working database before this.  
You can preview the website by going to `http://localhost:5000/` in your browser.

# User Guide

https://docs.google.com/document/d/1ZLU0SaxMXCm5qQB1TP3aXTl1QZrC5OytoOM6HlIdH-I/edit?usp=sharing

# Member Contribution

Justin Colyar - Responsible for work on the backend/database including database design, population, SQL queries for APIs, and documentation for User Guide. 

Nicholas Stackis - Responsible for creating most of the front end modules and interactions, database design, and frontend design. 

Jacob Watson - Responsible for creating most of the front end, map interactions and also contributed to the datbase design, population, and APIs. 

Nathan Whitesides - Responsible for work on the backend including database design, SQL queries for APIs, and population. 
