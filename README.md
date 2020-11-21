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