'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

var clientSchema = Schema( {
    id: ObjectId,
    first_name: String,
    last_name: String,
    street_address: String,
    city: String,
    state: String,
    zip_code: String,
    type_of_service: String,
    amnt_paid: Number,
    vehicle_cost: Number,
    state_tax_cost: Number,
    office_service_cost: Number,
    vehicle_model: String,
    date_documents_received: String,
    date_of_service_completion: String,
    payment_type: String,
    service_status: String,
    servicer: String,
    missing_docs: String,
    payment_received: String,
} );

module.exports = mongoose.model('Client', clientSchema );
    /*
    {
  "_id": {
    "$oid": "6474c2cd365c37c8378d17f0"
  },
  "first_name": "Viniceus",
  "last_name": "Da Silva Pimenta",
  "street_address": "815 Harwich Port",
  "city": "Tisbury",
  "state": "MA",
  "zip_code": "02568",
  "type_of_service": "Register Vehicle",
  "amnt_paid": 147.5,
  "vehicle_cost": 200,
  "state_tax_cost": 12.5,
  "office_service_cost": 100,
  "vehicle_model": "2000 Toyota Camry",
  "date_documents_received": "5/19/2023",
  "date_of_service_completion": "5/24/2023",
  "payment_type": "Standard",
  "service_status": "Completed",
  "servicer": "Mateus Silva",
  "missing_docs": "None",
  "payment_received": 80
}
      */