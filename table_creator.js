import mysql from "mysql"

const db = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'Fedor123',
    database:'club_db'
  })

console.log('Connected to mysql');

let create_sql = 'CREATE TABLE accounts(id int AUTO_INCREMENT , full_name VARCHAR (255), email VARCHAR (255), telegram_id VARCHAR (255), phone_number VARCHAR (255), payment_status VARCHAR (255), payment_date VARCHAR (255) , active_subscription VARCHAR (255) , payment_id VARCHAR (255), PRIMARY KEY (id) )'
db.query (create_sql, e => {
    if (e){
        throw e
    }
    else console.log('Table accounts CREATED');
})


create_sql = 'CREATE TABLE pending_payments(id int AUTO_INCREMENT , client_id VARCHAR (255), phone_number VARCHAR (255), payment_id VARCHAR (255), payment_date VARCHAR (255), payment_key VARCHAR(255), PRIMARY KEY (id) )'
db.query (create_sql, e => {
    if (e){
        throw e
    }
    else console.log('Table Pending_payments CREATED');
})



