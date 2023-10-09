
/**
 * This is an Express JS Web Database for RMV registration and Client lookup. This uses 
 * MongoDB to look up information about specific clients with different filters and 
 * add new ones, update current ones, or delete them. 
 */



/**
 * Loading the packages to support the server
 */
const createError = require("http-errors"); // to handle the server errors
const express = require("express");
const path = require("path");  // to refer to local paths
const cookieParser = require("cookie-parser"); // to handle cookies
const session = require("express-session"); // to handle sessions using cookies
const debug = require("debug")("personalapp:server"); 
const layouts = require("express-ejs-layouts");
const axios = require("axios")


/**
 * Loading the mongoose models 
 */

const Client = require("./models/Client")

/**
 * This connects to the MongoDB collection
 */

const mongoose = require( 'mongoose' );
const mongodb_URI = process.env.mongodb_URI

mongoose.connect( mongodb_URI, { useNewUrlParser: true, useUnifiedTopology: true } );
// to fix deprecation warnings
mongoose.set('useFindAndModify', false); 
mongoose.set('useCreateIndex', true);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', function() {console.log("Connection successful")});

/**
 * This initializes the Express server
 * This code is run once when the app is started and creates 
 * a server that responds to requests by sending responses
 */

const app = express();


// Specifies that EJS will be used as the view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

/**
 * This uses page layout for the views
 * so that there is no need to repeat the headers and 
 * footers on every page
 * layout is under views/layout.ejs
 */

app.use(layouts);

// These are to process the requests so they are easy to handle
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Specifies that static files will be in the public folder
app.use(express.static(path.join(__dirname, "public")));

// Enables session handling using cookies
app.use(
    session({
      secret: process.env.SECRET,
      resave: false,
      saveUninitialized: false
    })
  );

/**
 * Defines the routes the Express server will respond to
 */

// Handles all /login /logout routes
const auth = require('./routes/auth');
const { deflateSync } = require('zlib');
app.use(auth)

/**
 * Middleware to check if the user is logged in, if not, redirects
 * to the login page
 */

const isLoggedIn = (req, res, next) => {
    if (res.locals.loggedIn) {
        next()
    }
    else res.redirect('/login')
}

/**
 * Parses the date object and returns a simplified string format to display on the 
 * clientlist and client pages
 */

function parseDate(date) {
    
    const yyyy = date.getFullYear();
    let mm = date.getMonth() + 1;
    let dd = date.getDate();
    if (dd < 10) {
        dd = '0' + dd;
    }
    if (mm < 10) {
        mm = '0' + mm;
    }
    const form_date = mm+'/'+dd+'/'+yyyy;
    
    return form_date;
}
/**
 * Reformats the date object and returns the proper string format of the date-type input
 * to be displayed as the saved dates on the updateClient page 
 */

function reformatDate(date) {
    const yyyy = date.getFullYear();
    let mm = date.getMonth() + 1;
    let dd = date.getDate();
    if (dd < 10) {
        dd = '0' + dd;
    }
    if (mm < 10) {
        mm = '0' + mm;
    }
    const form_date = yyyy+'-'+mm+'-'+dd;
    return form_date;
}

// Takes and returns a date object with a certain number of hours added to it
function addHours(date, hours) {
    date.setHours(date.getHours() + hours);
    return date;
}

/**
 * Takes the list of client objects and localizes each date field to display
 * the correct day, month, and year 
 */
function localizeDates(clients) {
    for (client of clients) {
        let localDate = client['date_documents_received'];
        localDate = addHours(localDate,4);

        client['date_documents_received'] = parseDate(localDate)
    }
    return clients
}

function toTitleCase(string) {
    let f_letter = string.substring(0,1).toUpperCase();
    let new_string = f_letter+string.substring(1,string.length).toLowerCase();
    return new_string

}

app.get("/", 
(req, res, next) => {
    res.render("home");
  });

app.get("/about", (req, res, next) => {
    res.render("about");
  });

app.get("/rmvdb", isLoggedIn,
 (req, res, next) => {
    res.render("index");
})

app.get("/profile", isLoggedIn,
    (req, res, next) => {
        res.render("profile");
    })

app.get("/newClient", 
isLoggedIn, 
(req, res, next) => {
    res.render("newClient");
})

// Returns the entire list of clients in the database
app.get("/clients/allClients", isLoggedIn, 

    async (req, res, next) => {
        let clients = await Client.find({})
        clients = localizeDates(clients);
        res.locals.clients = clients
        res.render("clientlist")
    } 
)

// Takes the first and/or last names inputted and returns a list of all clients matching them
app.post("/clients/byName", isLoggedIn, 
    async (req, res, next) => {
        let first_name = null
        let last_name = null
        let clients = null
        let name = req.body.name.trim();
         // Splits the inputted string into a list of names
        let name_keywords = name.split(" ");

        // If the user input has a first and last name/s
        if (name_keywords.length > 1) {
            first_name = toTitleCase(name_keywords[0]);
            if (name_keywords.length === 2) {
                last_name = toTitleCase(name_keywords[1]);
            }
            // If the inputted name has a middle name or has more than one last name
            else if (name_keywords.length > 2){
                last_name = toTitleCase(name_keywords[name_keywords.length-2])+" "+toTitleCase(name_keywords[name_keywords.length-1]);
            }
            clients = await Client.find({first_name:first_name,last_name:last_name})
            
            // If there are no matching clients with the exact first and last names
            if (clients.length === 0) {
                clients = await Client.find(
                { $or: [ { first_name: { $regex: first_name, $options: "i"}}, { last_name: { $regex: last_name, $options: "i"}}]})
            }
        }
        // If user input is one name
        else if (name_keywords.length === 1) {
            name = toTitleCase(name)
            clients = await Client.find(
                { $or: [ { first_name: { $eq: name}}, { last_name: { $eq: name}}]})
            //If there are no exact matching first or last names
            if (clients.length === 0) {
                clients = await Client.find(
                    { $or: [ { first_name: { $regex: name, $options: "i"}}, { last_name: {$regex: name, $options: "i"}}]})
            }
        }
        // If the input is empty
        else {
            clients = await Client.find({})
        }
        
        clients = localizeDates(clients);
        res.locals.clients = clients
        res.render("clientlist")
    }
)

app.post("/clients/byServicer", isLoggedIn, 
    async (req, res, next) => {
        const servicer = req.body.servicer;
        let clients = await Client.find({servicer:servicer})
        clients = localizeDates(clients);
        res.locals.clients = clients
        res.render("clientlist")
    }
)

app.post("/clients/byStatus", isLoggedIn, 
    async (req, res, next) => {
        const service_status = req.body.service_status;
        let clients = await Client.find({service_status:service_status})
        clients = localizeDates(clients);
        res.locals.clients = clients
        res.render("clientlist")
    }
)

app.post('/clients/byDate', isLoggedIn,
    async (req, res, next) => {
        const start_date = req.body.start_date;
        let end_date = req.body.end_date;
        let clients = null;
        
        if (end_date == '' || end_date == start_date) {
            clients = await Client.find({date_documents_received: {
                $eq: new Date(start_date)
            }})
        }

        else {
            clients = await Client.find({date_documents_received: {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            }})
        }

        clients = localizeDates(clients);
        res.locals.clients = clients
        res.render("clientlist")
    }
)

// Returns all information about a specific client when given the client id
app.get('/clients/show/:clientId', isLoggedIn, 
  async (req,res,next) => {
    const {clientId} = req.params;
    const client = await Client.findOne({_id:clientId})
    res.locals.client = client
    let localDate = client.date_documents_received;
    res.locals.client._doc.date_documents_received = parseDate(addHours(localDate,4))
    localDate = client.date_of_service_completion;
    res.locals.client._doc.date_of_service_completion = parseDate(addHours(localDate,4))
    res.render('client')
  }
)

/**
 * Creates a new client in the collection with the inputted info in the newClient page
 * and redirects back to the newClient page
 */
app.post("/newClient/add", isLoggedIn, 
    async (req, res, next) => {
        try {
            const{first_name,last_name,street_address,city,state,zip_code,
                type_of_service,amnt_paid,vehicle_cost,office_service_cost,
                vehicle_model, payment_type,service_status,servicer,missing_docs,
                payment_received} = req.body;
            let date_documents_received = new Date(req.body.date_documents_received)
            let date_of_service_completion = new Date(req.body.date_of_service_completion)
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
            console.log("Failed to add Client.")
            next(e);
        }
    }
)

// Provides the current client info to be displayed on the page 
// for the user to change if desired
app.get("/updateClient/show/:clientId", isLoggedIn, 
async (req, res, next) => {
    const {clientId} = req.params;
    const client = await Client.findOne({_id:clientId})
    res.locals.client = client
    let localDate = client.date_documents_received;
    res.locals.client._doc.date_documents_received = reformatDate(addHours(localDate,4))
    localDate = client.date_of_service_completion;
    res.locals.client._doc.date_of_service_completion = reformatDate(addHours(localDate,4))
    res.render("updateClient");
})

/**
 * Takes the information inputted and updates the entry with the matching id
 * and redirects to the client page with the updated info
 */
app.post("/updateClient/update/:clientId", isLoggedIn, 
    async (req,res,next) => {
        try {
            const clientId = req.params.clientId;

            const {first_name,last_name,street_address,city,state,zip_code,
                type_of_service,amnt_paid,vehicle_cost,state_tax_cost,office_service_cost,
                vehicle_model, payment_type,service_status,servicer,missing_docs,payment_received} = req.body;
            let date_documents_received = new Date(req.body.date_documents_received)
            let date_of_service_completion = new Date(req.body.date_of_service_completion)
            
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

// After prompting the user to confirm their decision, takes the client id, finds and 
// deletes the entry with the matching id and returns to the home page
app.get("/client/delete/:clientId", isLoggedIn, 
    async (req, res, next) => {
        try {
            const clientId = req.params.clientId;
            await Client.deleteOne({_id:clientId})
            res.redirect("/rmvdb")

        } catch (e) {
            next(e);
        }
    }
)

// This is to catch 404 errors and forward them to the error handler 
app.use(function(req, res, next) {
    next(createError(404));
  });


/**
 * This processes any errors generated by the previous routes 
 */

app.use(function(err, req, res, next) {
    // set the locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};
    // renders the error page
    res.status(err.status || 500);
    res.render("error");
  });

/**
 * This section of code is specifically to start up the server
 */


// Sets the port between 1024 and 65535
const port = process.env.PORT || "4000";
app.set("port", port);

// Starts up the server listening on that port 
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

  // handles specific listen errors with various messages
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




