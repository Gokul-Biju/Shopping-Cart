// const mongoClient=require('mongodb').MongoClient

// module.exports.connect=(done)=>{
//     var uri='mongodb://127.0.0.1:27017/'
//     var dbname = 'Shopping'
//     mongoClient.connect(uri,(err,data)=>{
//         if(err) return done(err)
        
//         state.db=data.db(dbname)
//         done()
//     })
// }

const { MongoClient } = require('mongodb');

var state={
    db:null
 }

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

module.exports.connect=async function() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        state.db = client.db('Shopping');
        
    } catch (error) {
        console.error('Error connecting to MongoDB', error);
    }
}

module.exports.get=()=>{
    return state.db
}
