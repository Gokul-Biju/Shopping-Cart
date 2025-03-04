var express = require('express');
var router = express.Router();
var product = require('../helper/product-helper')
var user = require('../helper/user-helper');
const session = require('express-session');

const  verifyLogin=(req,res,next)=>{
   if(req.session.userloggedIn)
   {
     next()
   }else{
     res.render('users/login')
   }
 }

 function requireLogin(req, res, next) {
   console.log(req.session.user)
   if (req.session.user) {
     res.redirect('/user');
   }
   next();
 }

 var count

router.get('/',async function(req, res, next) {
   let data=req.session.user
   if(req.session.userloggedIn){
      await user.getCartCount(req.session.user._id).then((count)=>{
         product.getproduct().then((products)=>{
            res.render('users/products',{ products , data , count})
         })
      })
   }else{
      product.getproduct().then((products)=>{
         res.render('users/products',{ products , data , count})
      })
   }
});

router.get('/login',requireLogin,(req,res)=>{

      res.render('users/login',{ "loginerr" : req.session.loginErr})
      req.session.loginErr=false
   
})

router.get('/register',requireLogin,(req,res)=>{
   res.render('users/register')
})

router.post('/register',(req,res)=>{
   user.register(req.body).then((response)=>{
      if(response){
         req.session.user=response
         req.session.userloggedIn=true
         res.redirect('/user')
      }
   })
})

router.post('/login',(req,res)=>{
   user.login(req.body).then((response)=>{
       if(response.status){
         req.session.user=response.user
         req.session.userloggedIn=true
         res.redirect('/user')
       }
      else
       {
         req.session.loginErr=true
         res.redirect('/user/login')
       }
   })
})

router.get('/logout',(req,res)=>{
   count=null
   req.session.destroy()
   res.redirect('/user')
})

router.get('/cart',verifyLogin,async(req,res)=>{
   let data=req.session.user
   req.session.payment=false
   count=await user.getCartCount(req.session.user._id)
   user.getCartitems(req.session.user._id).then((response)=>{
      if(response.length > 0)
      {
         user.getprice(req.session.user._id).then((total)=>{
            res.render('users/cart',{ data , "products" : response , count ,"display" : true , total})
         })
      }else{
         res.render('users/cart',{ data , "products" : response , count , "display" : false})
      }
      
   })
   
})

router.get('/add-to-cart/:id',verifyLogin,(req,res)=>{
   user.addtoCart(req.params.id,req.session.user._id).then(()=>{
      res.json({status:true})
   })
})

router.post('/changequantity',(req,res)=>{
   user.changequantity(req.body).then(async(response)=>{
       user.getprice(req.body.userId).then((total)=>{
         response.total=total
         res.json(response)
      })
   })
})

router.post('/delete-cart-item',(req,res)=>{
   user.deletecartitem(req.body).then((response)=>{
      res.json(response)
   })
})

router.get('/orders',verifyLogin,(req,res)=>{
   if(!req.session.payment){
      user.getprice(req.session.user._id).then((total)=>{
         res.render('users/order',{total, data: req.session.user })
      })
   }else{
      res.redirect('/user')
   }
   
})

router.post('/place-order',verifyLogin,async(req,res)=>{
   let products = await user.getproductlist(req.session.user._id)
   let totalprice = await user.getprice(req.session.user._id)
   user.placeorder(req.body,products,totalprice,req.session.user._id,req.session.user.username).then((response)=>{
      if(req.body['payment-method'] == 'cod')
      {
         res.json({codSuccess:true})
      }else{
         console.log(response)
         user.paymentGateway(response,totalprice).then((response)=>{
             res.json(response)
         })
      }
      
   })
})

router.get('/place-order',(req,res)=>{
   req.session.payment=true
   res.render('users/place-orders',{ data:req.session.user })
})

router.get('/view-orders',verifyLogin,async(req,res)=>{
   count = await user.getCartCount(req.session.user._id)
   user.getOrderDetails(req.session.user._id).then((response)=>{
       res.render('users/view-orders',{ data:req.session.user , orders:response, count })
   })
})

router.get('/view-placed-order/:id',async(req,res)=>{
   count = await user.getCartCount(req.session.user._id)
   user.getplacedOrderdetails(req.params.id).then((response)=>{
       res.render('users/view-placed-orders',{ data: req.session.user , products : response, count })
   })
})

router.post('/update-payment',(req,res)=>{
   user.verifyPayment(req.body).then(()=>{
      user.updateStatus(req.body.order.receipt).then(()=>{
         res.json({status:true})
      })
   }).catch((err)=>{
        res.json({status:false})
   })
})



module.exports = router;
