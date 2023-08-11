'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

var clientSchema = Schema( {
    clientId: ObjectId,
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
    date_documents_received: Date,
    date_of_service_completion: Date,
    payment_type: String,
    service_status: String,
    servicer: String,
    missing_docs: String,
    payment_received: Number,
} );

module.exports = mongoose.model( 'Client', clientSchema );
