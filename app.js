
/**
 * This is an Express Web Database for RMV registration
 */

/**
 * Loading Packages to support the server
 */
const createError = require("http-errors"); // to handle the server errors
const express = require("express");
const path = require("path");  // to refer to local paths
const cookieParser = require("cookie-parser"); // to handle cookies
const session = require("express-session"); // to handle sessions using cookies
const debug = require("debug")("personalapp:server"); 
const layouts = require("express-ejs-layouts");
const axios = require("axios")


// *********************************************************** //
//  Loading models
// *********************************************************** //

const Client = require("./models/Client")

// *********************************************************** //
//  Loading JSON datasets
// *********************************************************** //

const clients = require("./public/data/portalrmvclients.json")

// *********************************************************** //
//  Connecting to the database
// *********************************************************** //

const mongoose = require( 'mongoose' );
//const mongodb_URI = process.env.mongodb_URI
//const mongodb_URI = 'mongodb+srv://silvam:Hurdler!20967@rmvdb.vcfocdw.mongodb.net/?retryWrites=true&w=majority'
const mongodb_URI = 'mongodb+srv://silvam:Hurdler!20967@rmvdb.vcfocdw.mongodb.net/RMV_Services?retryWrites=true&w=majority'

mongoose.connect( mongodb_URI, { useNewUrlParser: true, useUnifiedTopology: true } );
// fix deprecation warnings
mongoose.set('useFindAndModify', false); 
mongoose.set('useCreateIndex', true);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', function() {console.log("Connection successful")});

// *********************************************************** //
// Initializing the Express server 
// This code is run once when the app is started and it creates
// a server that respond to requests by sending responses
// *********************************************************** //
const app = express();

// Here we specify that we will be using EJS as our view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// this allows us to use page layout for the views 
// so we don't have to repeat the headers and footers on every page ...
// the layout is in views/layout.ejs
app.use(layouts);

// Here we process the requests so they are easy to handle
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Here we specify that static files will be in the public folder
app.use(express.static(path.join(__dirname, "public")));

// Here we enable session handling using cookies
app.use(
    session({
      secret: "zzbbyanana789sdfa8f9ds8f90ds87f8d9s789fds", // this ought to be hidden in process.env.SECRET
      resave: false,
      saveUninitialized: false
    })
  );

// *********************************************************** //
//  Defining the routes the Express server will respond to
// *********************************************************** //

// specify that the server should render the views/playerbase.ejs page for the root path
// and the playerbase.ejs code will be wrapped in the views/layouts.ejs code which provides
// the headers and footers for all webpages generated by this app
app.get("/", (req, res, next) => {
    res.render("index");
  });
  
app.get("/about", (req, res, next) => {
    res.render("about");
  });

app.get("/newClient", (req, res, next) => {
    res.render("newClient");
})


/* ************************
  Loading (or reloading) the data into a collection
   ************************ */
// this route loads in the clients into the Client collection
// or updates the clients if it is not a new collection

/*
app.get('/upsertDB',
  async (req,res,next) => {
    for (client of clients){
      const {first_name,last_name,street_address,city,state,zip_code,
        type_of_service,amnt_paid,vehicle_cost,state_tax_cost,office_service_cost,
        vehicle_model,date_documents_received,date_of_service_completion,
        payment_type,service_status,servicer,missing_docs,payment_received}=client;

      await Client.findOneAndUpdate({first_name,last_name,street_address,city,state,zip_code,
        type_of_service,amnt_paid,vehicle_cost,state_tax_cost,office_service_cost,
        vehicle_model,date_documents_received,date_of_service_completion,
        payment_type,service_status,servicer,missing_docs,payment_received},client,{upsert:true})
    }
    const num = await Client.find({}).count();
    res.send("data uploaded: "+num)
  }
)
*/


app.get("/clients/allClients",

    async (req, res, next) => {
        const clients = await Client.find({})
        res.locals.clients = clients
        res.render("clientlist")
    } 
)

app.post("/clients/byName",

    async (req, res, next) => {
        const f_name = req.body.first_name;
        //const l_name = req.body.last_name;
        const clients = await Client.find({first_name: f_name})
        res.locals.clients = clients
        res.render("clientlist")
    }
)

app.get('/clients/show/:clientId',
  // show all info about a course given its clientid
  async (req,res,next) => {
    const {clientId} = req.params;
    const client = await Client.findOne({_id:clientId})
    res.locals.client = client
    res.render('client')
  }
)

app.post("/newClient/add", 
    async (req, res, next) => {
        try {
            const{first_name,last_name,street_address,city,state,zip_code,
                type_of_service,amnt_paid,vehicle_cost,office_service_cost,
                vehicle_model,date_documents_received,date_of_service_completion,
                payment_type,service_status,servicer,missing_docs,payment_received} = req.body;
            
            const state_tax_cost = (req.body.vehicle_cost)*.0625
            let data = {first_name,last_name,street_address,city,state,zip_code,
                type_of_service,amnt_paid,vehicle_cost,state_tax_cost,office_service_cost,
                vehicle_model,date_documents_received,date_of_service_completion,
                payment_type,service_status,servicer,missing_docs,payment_received}
            let client_info = new Client(data)
            await client_info.save()
            res.redirect('/newClient')
            console.log("Client has been added successfully!")
        } catch (e) {
            //console.log("Error has occurred")
            next(e);
        }
    }
)

app.get("/updateClient/show/:clientId", 
async (req, res, next) => {
    const {clientId} = req.params;
    const client = await Client.findOne({_id:clientId})
    res.locals.client = client
    res.render("updateClient");
})


app.post("/updateClient/update/:clientId",
    async (req,res,next) => {
        try {
            const clientId = req.params.clientId;
            //const client = await Client.findOne({_id:clientId})

            const {first_name,last_name,street_address,city,state,zip_code,
                type_of_service,amnt_paid,vehicle_cost,state_tax_cost,office_service_cost,
                vehicle_model,date_documents_received,date_of_service_completion,
                payment_type,service_status,servicer,missing_docs,payment_received} = req.body;
            
            await Client.findByIdAndUpdate(clientId, {first_name,last_name,street_address,city,state,zip_code,
                type_of_service,amnt_paid,vehicle_cost,state_tax_cost,office_service_cost,
                vehicle_model,date_documents_received,date_of_service_completion,
                payment_type,service_status,servicer,missing_docs,payment_received})
                
            res.redirect("/clients/show/"+clientId)
        } catch(e) {
            next(e);
        }
    }
)


app.get("/client/delete/:clientId",
    async (req, res, next) => {
        try {
            const clientId = req.params.clientId;
            await Client.deleteOne({_id:clientId})
            res.redirect("/")

        } catch (e) {
            next(e);
        }
    }
)


// here we catch 404 errors and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
  });


// this processes any errors generated by the previous routes
// notice that the function has four parameters which is how Express indicates it is an error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render("error");
  });


// *********************************************************** //
//  Starting up the server!
// *********************************************************** //
//Here we set the port to use between 1024 and 65535  (2^16-1)
const port = process.env.PORT || "4000";
app.set("port", port);

// and now we startup the server listening on that port
const http = require("http");
const server = http.createServer(app);

server.listen(port);

function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

server.on("error", onError);

server.on("listening", onListening);

module.exports = app;




