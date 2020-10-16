import psycopg2

try:
   connection = psycopg2.connect(user="justi",
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


   connection.commit()
   count = cursor.rowcount
   print (count, "insert successful")

except (Exception, psycopg2.Error) as error :
    if(connection):
        print("Failed", error)

finally:
    #closing database connection.
    if(connection):
        cursor.close()
        connection.close()
        print("PostgreSQL connection is closed")