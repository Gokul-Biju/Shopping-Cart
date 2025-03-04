const db=require('../config/connection')
const { ObjectId } = require('mongodb');

module.exports={
    addproduct:(products,callback)=>{
        products.price=parseInt(products.price)
       db.get().collection('Product').insertOne(products).then((data)=>{
           console.log(data)
           callback(data.insertedId)
       })
    },

    getproduct:()=>{
        return new Promise(async (resolve,reject)=>{
            let product = await db.get().collection('Product').find().toArray()
            resolve(product)
        })
    },

    deleteproduct:(proid)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection('Product').deleteOne({_id:new ObjectId(proid)}).then((result)=>{
                resolve(result)
            })
        })
    },
    getdetails:(proid)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection('Product').findOne({_id:new ObjectId(proid)}).then((product)=>{
                resolve(product)
            })
        })
    },
    updateproduct:(proid,details)=>{
        details.price=parseInt(details.price)
        return new Promise((resolve,reject)=>{
            db.get().collection('Product').updateOne({_id:new ObjectId(proid)},{$set:{
                name:details.name,
                category:details.category,
                description:details.description,
                price:details.price
            }}).then((response)=>{
                resolve()
            })
        })
    }
}