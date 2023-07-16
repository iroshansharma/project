const  express = require('express')
var app = express()
const mongoClient = require('../Database/mongo.js')
var admin = require('firebase-admin')
var serviceAccount = require("../Firebase/srec-shb-firebase-adminsdk-yww66-5b9c3dbc69.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://srec-shb.firebaseio.com"
  });
  var firebase_msg = admin.messaging().app




app.post('/admin/book_hall/', function(req, res){
    // var final_Sess_id=[];
    // for(let i=0;i<req.body.session_id.length;i++){

    const jsonInput = {
        "_id" : req.body.hall_id,
        "email" : req.body.email,
    "bookings" : {
            "date_container" : [{
                "date" : req.body.date,
                "sessions" : [{
                    "_id":req.body.hall_id,
                    "session_id" : req.body.session_id,
                    "status" : -1,
                    "book_desc" : req.body.book_desc,
                    "by" :req.body.by 	
                 }],
            }]}
     }

    let date_cont =jsonInput.bookings.date_container[0];   // new date
console.log("---------------------------s-----------------------------")
console.log(date_cont)
    let session_cont = jsonInput.bookings.date_container[0].sessions[0]
    let admin_email = req.body.email;

    // first finding date
    mongoClient.hall_details.findOne({_id :jsonInput._id,"bookings.date_container.date" :date_cont.date}, function (err, date_out) { 
        if(err) {console.log(err)
            res.status(404).send("Error While finding date")}
            
        else {
            // date is free
           var noti;
             if(date_out == null){
                    console.log("else if......")
                    console.log("date null.............. creating one")
                    mongoClient.hall_details.findOneAndUpdate({_id : jsonInput._id,
                    },{$addToSet : {"bookings.date_container":date_cont}},{upsert:true}, function(err, out){
                        if(err){console.log(err)
                            res.status(401).send("check correct1")
                        }
                        else {
                            console.log(out)
                            startNotifiy(); /////////////////////////------------Notifiying process
                            //// messagessss-------
                            // res.status(201).send("Success new date and data's inserted")  //added a date and session
                        }
                    })  
                }
            else {
                console.log("Date present ..Adding new session")
                // bookings.date_container.$.sessions
                // adding to particular date and adding a session
                mongoClient.hall_details.findOneAndUpdate({_id : jsonInput._id,  "bookings.date_container.date": date_cont.date},
                {$addToSet : {"bookings.date_container.$.sessions":session_cont}},{upsert:true}, function(err, out){
                    if(err){
                        console.log(err)
                        res.status(406).send("check correct2")
                    }
                    else {
                        console.log(out)
                        startNotifiy(); /////////////////////////------------Notifiying process
                            //// messagessss-------
                        // res.status(202).send("Success new session inserted")  //updated a day ...added new session
                    }
                })
            }
            function startNotifiy() { 
                // console.log(out)
    
                var admin_device_token;
                
                console.log('///////---------------//////////')
                // console.log(session_cont)
                let pendings = {
                    date : date_cont.date,
                    sessions : session_cont
                }
                console.log("pendings ")
                console.log(pendings)
                console.log(admin_email)
                // add first to admin pending bucket
                mongoClient.admin_accounts.findOneAndUpdate({email : admin_email},{$addToSet : {pendings : pendings}
                },{upsert:true,new :true})  //getting admin device token
                .then((adData)=>{
                    console.log("admin Resultss.... ")
                    console.log(adData)
                    admin_device_token = adData.device_token;
                    let inbox = {
                        date : date_cont.date,
                        sessions : session_cont,
                        email : admin_email,
                        d_token : admin_device_token,
                    }
                    console.log("admin_device_token1 " +admin_device_token)
                    console.log("inbox " +inbox)
                    //second  adding to super admin inbox .store admin email and device token
                        mongoClient.superadmin_accounts.findOneAndUpdate({hall_id:jsonInput._id},{
                            $addToSet : {inbox : inbox},upsert:true}).then((fine)=>{
                            console.log("fine/-------////-----------")
                            
                            console.log("admin_device_token2 "+admin_device_token)
                            let head_name = fine.name;
                            // sending message notification to super admin device
                                    let sa_inbox_msg = {
                                        data : {
                                            "title" : "Hello "+head_name,
                                            "body" : session_cont.by+" has Requsted Your Seminar Hall on "+date_cont.date,
                                            "code":"101",
                                        },
                                        "android":{
                                        "notification" : {
                                            "title" : "Hello "+head_name,
                                            "body" : session_cont.by+" has Requsted Your Seminar Hall on "+date_cont.date,
                                            "click_action":"com.techie_dany.srecshb.firenotify",
                                           
                                        }
                                    },
                                        token : fine.device_token
                                    } 
                                    firebase_msg.messaging().send(sa_inbox_msg).then((nice)=>{
                                        console.log("all is good")
                                        res.send(nice)
                                    }).catch((err)=>{
                                        console.log(err)
                                        res.send("Success But Not Message Sent")
                                    })
                        }).catch((err)=>{
                            console.log(err)
                            res.send(err)
                        })
                })
                .catch((err)=>{
                    console.log(err)
                    res.send(err)
                })
             }
        }  
     }) 
}) //post


module.exports = app