CREATE TABLE customers(id serial PRIMARY KEY,name text,country text,tier text,email text);
CREATE TABLE orders(id serial PRIMARY KEY,customer_id int REFERENCES customers(id),amount numeric,status text,created_at timestamptz DEFAULT now());
CREATE TABLE products(id serial PRIMARY KEY,name text,category text,price numeric);
CREATE TABLE employees_salary(id serial PRIMARY KEY,name text,salary numeric);
INSERT INTO customers(name,country,tier,email) VALUES('Aarav Rao','India','gold','a@mail.io'),('Liam Chen','Singapore','gold','l@mail.io'),('Sofia Rossi','Italy','bronze','s@mail.io');
INSERT INTO orders(customer_id,amount,status) VALUES(1,320,'paid'),(1,140,'paid'),(2,410,'paid'),(3,90,'cancelled');
INSERT INTO products(name,category,price) VALUES('Sensor','iot',49),('Gateway','iot',120);
INSERT INTO employees_salary(name,salary) VALUES('HR-only',100000);
