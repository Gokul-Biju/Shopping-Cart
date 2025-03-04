const db=require('../config/connection')
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

module.exports={
    loginadmin:(details)=>{
        let response={}
        return new Promise((resolve,reject)=>{
           db.get().collection('Admin').findOne({email:details.email}).then((admin)=>{
               if(admin)
                 {
                    bcrypt.compare(details.password,admin.password).then((result)=>{
                        if(result)
                        {
                            response.admin=admin
                            response.status=true
                            resolve(response)
                        }else{
                            resolve({status:false})
                        }
                    })
                 }else{
                    resolve({status:false})
                 }
           })
        })
    },
    getallUsers:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection('Users').find().toArray().then((users)=>{
                resolve(users)
            })
        })
    },
    getUserorders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
           let count=0;
           let orders = await db.get().collection('Order').find({userId:new ObjectId(userId)}).toArray()
           if(orders){
             count=orders.length
           }
           resolve(count)
        })
    },
    getAllorders:()=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection('Order').find().toArray().then((orders)=>{
                resolve(orders)
            })
        })
    },
    updateStatus:(delivery)=>{
        return new Promise((resolve,reject)=>{
            console.log(delivery)
            db.get().collection('Order').updateOne({_id:new ObjectId(delivery.orderId)},{
                $set:{ status: delivery.status }
            }).then((response)=>{
                resolve()
            })
        })
    }
}