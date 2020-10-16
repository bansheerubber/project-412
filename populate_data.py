import psycopg2
import re

connection = None
try:
   connection = psycopg2.connect(user="me",
                                  password="root",
                                  host="localhost",
                                  port="5432",
                                  database="covid_data")
   cursor = connection.cursor()
   
   fips_id = 3
   name = "'random'"
   population = 2

   postgres_insert_query = """INSERT INTO Place (
       Fips, Name, Population) VALUES ({}, {}, {})""".format(fips_id, name, population)
   
   cursor.execute(postgres_insert_query)

   # create state abbreviation table
   state_abbreviation_table = {}
   with open('./state_abbreviations.csv') as file:
      file.readline() # read header
      for line in file:
         split = line.split(',')
         name = split[0].replace('"', '').strip()
         abbreviation = split[2].replace('"', '').strip()
         state_abbreviation_table[name] = abbreviation
         state_abbreviation_table[abbreviation] = name

   # create the tables below
   fips_name_table = {}
   fips_array = []
   is_county_table = {}
   with open('./fips_to_name.csv') as file:
      file.readline() # read header
      for line in file:
         split = line.split(',')
         fips = int(split[0])
         name = split[1].strip()
         state = split[2].strip()

         if state != 'NA': # we're dealing with a county, associate it with a state
            fips_name_table[fips] = (name, state_abbreviation_table[state])
            fips_name_table[(name, state_abbreviation_table[state])] = fips
            is_county_table[fips] = True
         else:
            fips_name_table[fips] = name
            fips_name_table[name] = fips
            is_county_table[fips] = False
         
         fips_array.append(fips)
   
   # finally, populations
   fips_to_population = {}
   with open('./populations.csv') as file:
      file.readline() # read header
      while True:
         try:
            line = file.readline()
            if not line:
               break

            split = line.split(',')
            state = split[5].strip()
            name = split[6].strip()
            population = int(split[18].strip())
            
            if (name, state) in fips_name_table: # counties
               fips_to_population[(name, state)] = population
            elif name in fips_name_table: # states
               fips_to_population[name] = population
         except:
            pass

   # do states before counties
   state_to_sql_id = {}
   for fips in fips_array:
      if is_county_table[fips] == False:
         state = fips_name_table[fips]
         if state not in fips_to_population:
            continue
         
         population = fips_to_population[state]
         cursor.execute(
            'INSERT INTO Place (Fips, Name, Population) VALUES (%s, %s, %s) RETURNING Place_id;',
            (fips, state, population)
         )
         place_id = int(cursor.fetchone()[0])

         cursor.execute('INSERT INTO State (Place_id) VALUES (%s) RETURNING State_id;', (place_id,))
         state_to_sql_id[state] = cursor.fetchone()[0]


   # go through every single FIPS and figure out what to do with it
   for fips in fips_array:
      if is_county_table[fips]: # dealing with county
         name, state = fips_name_table[fips]
         if (name, state) not in fips_to_population or state not in state_to_sql_id:
            # print(f"could not find population for {fips_name_table[fips]}")
            continue
         population = fips_to_population[(name, state)]
         cursor.execute(
            'INSERT INTO Place (Fips, Name, Population) VALUES (%s, %s, %s) RETURNING Place_id;',
            (fips, name, population)
         )
         place_id = cursor.fetchone()[0]

         cursor.execute(
            'INSERT INTO County (State_id, Place_id) VALUES (%s, %s);',
            (state_to_sql_id[state], place_id)
         )

   connection.commit()
   count = cursor.rowcount
   print (count, "insert successful")
except (Exception, psycopg2.Error) as error :
   print("Failed", error)
finally:
   #closing database connection.
   if(connection):
      cursor.close()
      connection.close()
      print("PostgreSQL connection is closed")