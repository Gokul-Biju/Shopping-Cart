const db = require('../config/connection')
const bcrypt = require('bcrypt')
const { ObjectId } = require('mongodb');
const Razorpay = require('razorpay')

module.exports = {

    register: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection('Users').insertOne(userData).then(async (data) => {
                if (data.acknowledged) {
                    let result = await db.get().collection('Users').findOne({ _id: data.insertedId });
                    resolve(result)
                }
            })
        })
    },

    login: (userData) => {
        var response = {}
        return new Promise(async (resolve, reject) => {
            var user = await db.get().collection('Users').findOne({ email: userData.email })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((result) => {
                    if (result) {
                        response.user = user
                        response.status = true
                        resolve(response)
                    }
                    else {
                        resolve({ status: false })
                    }
                })
            } else {
                resolve({ status: false })
            }
        })
    },
    addtoCart: (prodId, userId) => {
        return new Promise(async (resolve, reject) => {
            let prodobj = {
                item: new ObjectId(prodId),
                quantity: 1
            }
            let usercart = await db.get().collection('Cart').findOne({ user: new ObjectId(userId) })
            if (usercart) {
                let prodExits = await usercart.products.findIndex(product => product.item == prodId)
                console.log(prodExits)
                if (prodExits != -1) {
                    await db.get().collection('Cart').updateOne({ user: new ObjectId(userId), 'products.item': new ObjectId(prodId) },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }
                    ).then(() => { resolve() })
                }
                else {
                    await db.get().collection('Cart').updateOne({ user: new ObjectId(userId) }, {
                        $push: {
                            products: prodobj
                        }
                    }).then((response) => {
                        resolve()
                    })
                }
            } else {
                let Cartobj = {
                    user: new ObjectId(userId),
                    products: [prodobj]
                }
                db.get().collection('Cart').insertOne(Cartobj).then((response) => {
                    console.log(response)
                    resolve()
                })
            }
        })
    },
    getCartitems: (userId) => {
        return new Promise(async (resolve, reject) => {
            let items = await db.get().collection('Cart').aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: 'Product',
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(items)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection('Cart').aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: 'Product',
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum:'$quantity' } 
                    }
                }
            ]).toArray().then((total) => {
              
                if (total.length > 0){
                    resolve(total[0].total)
                }else{
                    resolve(0)
                }
                
            })
        })
    },
    changequantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)

        return new Promise(async (resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                await db.get().collection('Cart').updateOne({ _id: new ObjectId(details.cart) },
                    {
                        $pull: { products: { item: new ObjectId(details.product) } }
                    }
                ).then((response) => { resolve({ removeProduct: true }) })
            } else {
                await db.get().collection('Cart').updateOne({ _id: new ObjectId(details.cart), 'products.item': new ObjectId(details.product) },
                    {
                        $inc: { 'products.$.quantity': details.count }
                    }
                ).then((response) => { resolve({ status: true }) })
            }
        })
    },
    deletecartitem: (details) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection('Cart').updateOne({ _id: new ObjectId(details.cart) },
                {
                    $pull: { products: { item: new ObjectId(details.product) } }
                }
            ).then((response) => { resolve(true) })
        })
    },
    getprice: (userId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection('Cart').aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: 'Product',
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.price'] } }
                    }
                }
            ]).toArray().then((total) => {
                if(total.length > 0){
                    resolve(total[0].total)
                }else{
                    resolve(-1)
                }
                
            })
        })
    },
    getproductlist: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection('Cart').findOne({ user: new ObjectId(userId) })
            resolve(cart.products)
        })
    },
    placeorder: (order, products, price, userId,name) => {
        return new Promise((resolve, reject) => {
            let status = order['payment-method'] == 'cod' ? 'Placed' : 'Pending'
            let orderobj = {
                deliverydetails: {
                    name: name,
                    address: order.address,
                    pincode: order.pincode,
                    mobile: order.mobile
                },
                userId: new ObjectId(userId),
                payment_method: order['payment-method'],
                products: products,
                date: new Date(),
                TotalPrice: price,
                status: status
            }
            db.get().collection('Order').insertOne(orderobj).then((response) => {
                db.get().collection('Cart').deleteOne({ user: new ObjectId(userId) }).then(() => {
                    resolve(response.insertedId)
                })
            })
        })
    },
    getOrderDetails: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('Order').find({ userId: new ObjectId(userId) }).toArray().then((response) => {
                resolve(response)
            })
        })
    },
    getplacedOrderdetails: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let items = await db.get().collection('Order').aggregate([
                {
                    $match: { _id: new ObjectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: 'Product',
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(items)
        })
    },
    paymentGateway: (orderId,price) => {

        return new Promise((resolve, reject) => {
            var instance = new Razorpay({ key_id: 'rzp_test_QECw6lqG3ljlZk', key_secret: 'ABEW3cODjfD2rc0bGPuPvePN' })

            var options = {
                amount: price*100,
                currency: "INR",
                receipt: ""+orderId
            };
            instance.orders.create(options, function (err, order) {
                resolve(order)
            });
        })

    },
    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto = require('crypto')
            let hmac = crypto.createHmac('sha256','ABEW3cODjfD2rc0bGPuPvePN')
            
            hmac.update(details.payment.razorpay_order_id+'|'+details.payment.razorpay_payment_id)
            hmac=hmac.digest('hex')
            if(hmac==details.payment.razorpay_signature){
                resolve()
            }else{
                reject()
            }
        })
    },
    updateStatus:(orderId)=>{
       return new Promise((resolve,reject)=>{
           db.get().collection('Order').updateOne({_id:new ObjectId(orderId)},
             {
                $set:{status:'placed'}
             }
           ).then((response)=>{
            resolve()
         })
       })
    }

}
