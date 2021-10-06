import express from "express";
import mysql from "mysql"
import { YooCheckout } from '@a2seven/yoo-checkout'; // или const { YooCheckout } = require('@a2seven/yoo-checkout');

// Yoo shop options
const checkout = new YooCheckout({ shopId: '835491', secretKey: 'live_IhMniWgw4coxBTN5m6ju_790iYEbH8bMdjw5J1Z6R-U' });


// Express options
const PORT = 5000;
const app = express();
app.use(express.json())

// db connection options
const db = mysql.createConnection({
  host:'localhost',
  user:'root',
  password:'Fedor123',
  database:'club_db'
})

// db connection
db.connect((e) => {
  if(e){
    throw e
  }
  else{
    console.log('Connected to sql');
  }
})

// payment options
const createPayload = {
  amount: {
      value: '998.00',
      currency: 'RUB'
  },
  payment_method_data: {
      type: 'bank_card'
  },
  confirmation: {
      type: 'redirect',
      confirmation_url: 'https://t.me/@test_megared_bot'
  },
  save_payment_method: true
};

// register client and create pay
app.post('/createPayment', function (req, res) {
  var dateObj = new Date();
  let post = {full_name: req.body.name, 
    full_name: req.body.name, 
    email: req.body.email, 
    telegram_id: req.body.telegram, 
    phone_number: req.body.phone, 
    payment_status: 'bad',
    payment_date: dateObj,
    active_subscription: 'ok',
    payment_id: '' 
  }
  
  let sql = 'INSERT INTO accounts SET ?'
  db.query(sql, post , (e) => {
    if(e){
      throw e
    }
    else{
      console.log('accounts created');
    }
  })


  sql = "SELECT * FROM accounts WHERE phone_number = " +"'"+req.body.phone +"'" ; 

  const idempotenceKey = new Date().valueOf();
  
  var uniqueId;

  const call = async () => {
    try {
      const payment = await checkout.createPayment(createPayload , idempotenceKey);
      console.log(payment)
      uniqueId = payment.id 
      res.send(payment)
      db.query(sql, (e , r ) => {
        if(e){
          throw e
        }
        else{
          let transaction = {
            client_id : r[0].id,
            phone_number : req.body.phone,
            payment_id : uniqueId,
            payment_date : dateObj, 
            payment_key : idempotenceKey
          }
    
          let sql = 'INSERT INTO pending_payments SET ?'
          db.query(sql, transaction , (e) => {
            if(e){
              throw e
            }
            else{
              console.log('Payment saved');
            }
          })
      }
      })

    } catch (error) {
        console.error(error);
        res.send(error)
    }
  }

  call()

  console.log('Setted successfully');

});

// unsubsciribe from autopay
app.post('/unsubscribe', function(req , res){
  let phone = req.body.phone;
  let sql = "UPDATE accounts SET active_subscription = 'bad' WHERE phone_number = " +"'"+phone +"'" ; 
  db.query(sql, (e , r ) => {
    if(e){
      throw e
    }
    else{
      console.log('Unsubbed');
    }
})
});


// Checking for all payments
setInterval(() => {
  console.log('Checking payments');
  let sql = "SELECT * FROM pending_payments" ; 
  db.query(sql, (e , r ) => {
    if(e){
      throw e
    }
    else{
      r.forEach(element => {
        const checker = async () => {
          try {
            const payment = await checkout.getPayment(element.payment_id);
            console.log(payment);
            if (payment.status === 'succeeded'){
              console.log(element.client_id);
              sql = "UPDATE accounts SET payment_status = 'ok' WHERE id = " +"'"+element.client_id+"'";
              db.query(sql, (e , r ) => {
                if(e){
                  throw e
                }
                else{
                  sql = "DELETE FROM pending_payments WHERE client_id = " +"'"+element.client_id+"'";
                  db.query(sql, (e , r ) => {
                    if(e){
                      throw e
                    }
                    else{
                      console.log('accounts payment Succeeded and DELETED');
                    }});
                }});
            }
            if (payment.payment_method.saved == true){
              sql = "UPDATE accounts SET payment_id ="+"'"+payment.payment_method.id+"'"+ "WHERE id = " +"'"+r.client_id+"'";
              db.query(sql, (e , r ) => {
                if(e){
                  throw e
                }
                else{
                  console.log('Payment method saved');
                }});
            }
          } catch (error) {
              console.error(error);
          }
        }
        checker()
      });
    }
  })

}, 15000);


// Checking for payment's expire data and trying get new payment
setInterval(() => {
  console.log('Checking expire date');
  let sql = "SELECT * FROM accounts" ; 
  db.query(sql, (e , r ) => {
    if(e){
      throw e
    }
    else{
      r.forEach(element => {
        console.log(element);
        let subDate = new Date(element.payment_date)
        let expireDate = new Date(element.payment_date)
        let now = new Date()
        expireDate.setDate(expireDate.getDate() + 30);

        console.log(subDate , ' | ' , expireDate ,' | ', now);

        if (expireDate <= now) {

          if (element.active_subscription === 'ok'){
            let sql = "UPDATE accounts SET payment_status = 'bad' WHERE id = " +"'"+element.id +"'" ; 
            db.query(sql, (e , r ) => {
              if(e){
                throw e
              }
              else{
                console.log('Changed payment status');
              }
          })

          const idempotenceKey = new Date().valueOf();

          const autoPay = {
            amount: {
              value: '998.00',
              currency: 'RUB'
            },
            payment_method_id: element.payment_id,
            description: "Автосписание Club100"
          }
  
          const call = async () => {
            try {
              const payment = await checkout.createPayment(autoPay , idempotenceKey);
              console.log(payment)
              uniqueId = payment.id 
              res.send(payment)
              db.query(sql, (e , r ) => {
                if(e){
                  throw e
                }
                else{
                  if (payment.status === 'succeeded'){
                    let sql = "UPDATE accounts SET payment_status = 'ok' WHERE id = " +"'"+element.id +"'" ; 
                      db.query(sql, (e , r ) => {
                        if(e){
                          throw e
                        }
                        else{
                          console.log('Changed payment status');
                        }
                    })
                    sql = "UPDATE accounts SET payment_date ="+ +"'"+payment.captured_at +"'" +"WHERE id = " +"'"+element.id +"'" ; 
                      db.query(sql, (e , r ) => {
                        if(e){
                          throw e
                        }
                        else{
                          console.log('Changed payment status');
                        }
                    })

                  }

                  else{
                    let transaction = {
                      client_id : element.id,
                      phone_number : element.phone,
                      payment_id : payment.id,
                      payment_date : created_at, 
                      payment_key : idempotenceKey
                    }
              
                    let sql = 'INSERT INTO pending_payments SET ?'
                    db.query(sql, transaction , (e) => {
                      if(e){
                        throw e
                      }
                      else{
                        console.log('Payment saved');
                      }
                    })
                  }

              
              }
              })  
            } catch (error) {
                console.error(error);
                res.send(error)
            }
          }
          call()

          }
        }
        else {
          console.log('Not yet');
        }
      })
    }
  })
  
},15000)

app.listen(PORT, () => {
  console.log('SERVER STARTED ON PORT ' + PORT);
})

