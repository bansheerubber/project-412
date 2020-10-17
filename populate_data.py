import psycopg2
import re
import random

connection = None
try:
   role = open('role.txt').readline()

   connection = psycopg2.connect(user=role,
                                  password="root",
                                  host="localhost",
                                  port="5432",
                                  database="covid_data")
   cursor = connection.cursor()

   district_num = 68923
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


   fips_to_place_id = {}
   county = {}
   # do states before counties
   state_to_sql_id = {}
   print("inserting states...")
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
         fips_to_place_id[fips] = place_id

         cursor.execute('INSERT INTO State (Place_id) VALUES (%s) RETURNING State_id;', (place_id,))
         state_to_sql_id[state] = cursor.fetchone()[0]


   # go through every single FIPS and figure out what to do with it
   print("inserting counties...")
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
         fips_to_place_id[fips] = place_id

         cursor.execute(
            'INSERT INTO County (State_id, Place_id) VALUES (%s, %s) RETURNING County_id;',
            (state_to_sql_id[state], place_id)
         )

         county_id = cursor.fetchone()[0]
         
         cursor.execute(
            'INSERT INTO District (District_id, County_id, Place_id) VALUES (%s, %s, %s);',
            (district_num - county_id, county_id, place_id)
         )

   # governors
   print("inserting governors...")
   with open('./governors.csv') as file:
      file.readline() # read header
      while True:
         try:
            line = file.readline()
            if not line:
               break

            split = line.split(',')
            state = split[0].strip()
            supports_masks = int(split[7]) == 1
            person_name = split[8].strip()

            cursor.execute(
               'INSERT INTO Governor (State_id, Name, Pro_mask) VALUES (%s, %s, %s);',
               (state_to_sql_id[state], person_name, supports_masks)
            )
         except:
            pass

   connection.commit()

   # business
   print("inserting companies...")
   with open('./Companies.csv') as file:
      file.readline() # read header
      while True:
         try:
            line = file.readline()
            if not line:
               break

            split = line.split(',')
            company_name = str(split[1].strip())
            temp_id_ran = fips_array[random.randint(0, len(fips_array)-1)]
            place_id_ran = fips_to_place_id[temp_id_ran]
            is_closed = (random.randint(0, 1)) == 1

            cursor.execute(
               'INSERT INTO Business (Place_id, Name, Closed) VALUES (%s, %s, %s) RETURNING Business_id;',
               (place_id_ran, company_name, is_closed)
            )
         except:
            pass
    

   connection.commit()
   
   # mask_data for county
   print("mask use by county...")
   with open('./mask-use-by-county.csv') as file:
      file.readline() # read header
      while True:
         try:
            line = file.readline()
            if not line:
               break

            split = line.split(',')
            count_fp = int(split[0].strip())
            never = float(split[1].strip())
            rarely = float(split[2].strip())
            sometimes = float(split[3].strip())
            frequently = float(split[4].strip())
            always = float(split[5].strip())
            place_id = fips_to_place_id[count_fp]

            cursor.execute(
               'INSERT INTO Mask_Data (Place_id, _Never, Rarely, Sometimes, Frequently, _Always) VALUES (%s, %s, %s, %s, %s, %s) ;',
               (place_id, never, rarely, sometimes, frequently, always)
            )
         except:
            pass
   
   connection.commit()

   # calculate mask_data for states
   print("mask use by states...")
   for x in range(51):
       if x !=0:
           cursor.execute(
               'SELECT Fips FROM Place WHERE Place_id = %s;',
               (x,)
            )
           state_fp = cursor.fetchone()[0]
           next_state_fp = state_fp + 1000
           cursor.execute(
               'SELECT AVG(_Never) FROM Mask_Data, Place WHERE Mask_Data.Place_id = Place.Place_id AND Place.Fips > %s AND Place.Fips < %s;',
               (state_fp, next_state_fp)
            )
           never = cursor.fetchone()[0]
           cursor.execute(
               'SELECT AVG(Rarely) FROM Mask_Data, Place WHERE Mask_Data.Place_id = Place.Place_id AND Place.Fips > %s AND Place.Fips < %s;',
               (state_fp, next_state_fp)
            )
           rarely = cursor.fetchone()[0]
           cursor.execute(
               'SELECT AVG(Sometimes) FROM Mask_Data, Place WHERE Mask_Data.Place_id = Place.Place_id AND Place.Fips > %s AND Place.Fips < %s;',
               (state_fp, next_state_fp)
            )
           sometimes = cursor.fetchone()[0]
           cursor.execute(
               'SELECT AVG(Frequently) FROM Mask_Data, Place WHERE Mask_Data.Place_id = Place.Place_id AND Place.Fips > %s AND Place.Fips < %s;',
               (state_fp, next_state_fp)
            )
           frequently = cursor.fetchone()[0]
           cursor.execute(
               'SELECT AVG(_Always) FROM Mask_Data, Place WHERE Mask_Data.Place_id = Place.Place_id AND Place.Fips > %s AND Place.Fips < %s;',
               (state_fp, next_state_fp)
            )
           always = cursor.fetchone()[0]
           cursor.execute(
               'INSERT INTO Mask_Data (Place_id, _Never, Rarely, Sometimes, Frequently, _Always) VALUES (%s, %s, %s, %s, %s, %s);',
               (x, never, rarely, sometimes, frequently, always)
            )

   # status for states
   print("inserting status for states...")
   with open('./us-states.csv') as file:
      file.readline() # read header
      while True:
         try:
            line = file.readline()
            if not line:
               break
            split = line.split(',')
            date = split[0].strip()
            fips = int(split[2].strip())*1000
            cases = int(split[3].strip())
            deaths = int(split[4].strip())
            place_id = fips_to_place_id[fips]
            cursor.execute(
               'INSERT INTO Status (Place_id, Date, Deaths, Cases) VALUES (%s, %s, %s, %s);',
               (place_id, date, deaths, cases)
            )
         except:
            pass
   
   connection.commit()

   # status for counties
   print("inserting status for counties...")
   with open('./us-counties.csv') as file:
      file.readline() # read header
      while True:
         try:
            line = file.readline()
            if not line:
               break

            split = line.split(',')
            date = split[0].strip()
            cases = int(split[4].strip())
            deaths = int(split[5].strip())
            fips = int(split[3].strip())
            place_id = fips_to_place_id[fips]

            cursor.execute(
               'INSERT INTO Status (Place_id, Date, Deaths, Cases) VALUES (%s, %s, %s, %s);',
               (place_id, date, deaths, cases)
            )
         except:
            pass
   
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