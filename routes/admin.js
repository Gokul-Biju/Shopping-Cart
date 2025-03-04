var express = require('express');
var router = express.Router();
const product=require('../helper/product-helper')
const admin = require('../helper/admin-helper')
const adminprivileage = require('../helper/user-helper');

const verifylogin=(req,res,next)=>{
   if(req.session.adminlogged){
      res.redirect('/admin')
   }else{
     next()
   }
}

const requirelogin=(req,res,next)=>{
   if(req.session.adminlogged){
     next()
   }else{
     res.redirect('/admin/login')
   }
}

router.get('/', function(req, res, next) {
  if(req.session.adminlogged){
    product.getproduct().then((products)=>{
      res.render('admin/products',{ admin:true , products, user:req.session.admin});
    })
  }else{
    res.render('admin/products',{ admin:true});
  }
  
});

router.get('/addproduct',requirelogin,(req,res)=>{

    res.render('admin/addproduct',{admin:true}) 
})

router.post('/addproduct',(req,res)=>{
   product.addproduct(req.body,(id)=>{
      let image=req.files.Image
      image.mv('./public/images/'+id+'.jpg',(err,data)=>{
        if(!err){
          res.redirect('/admin')
        }
      })
   })
})

router.get('/delete/:id',(req,res)=>{
   let proid = req.params.id
   product.deleteproduct(proid).then((response)=>{
      res.redirect('/admin')
   })
})

router.get('/editproduct/:id',(req,res)=>{
    product.getdetails(req.params.id).then((response)=>{
       res.render('admin/editproduct',{ response })
   })
})

router.post('/editproduct/:id',(req,res)=>{
  product.updateproduct(req.params.id,req.body).then(async()=>{
    if (req.files && req.files.Image) {
      let image = req.files.Image;
      let imagePath = `./public/images/${req.params.id}.jpg`;
      await image.mv(imagePath);
    } 

    res.redirect('/admin'); 
  })
})

router.get('/login',verifylogin,(req,res)=>{
  res.render('admin/login', {admin:true , loginerr:req.session.loginErr})
  req.session.loginErr=false
})

router.post('/login',(req,res)=>{
   admin.loginadmin(req.body).then((response)=>{
       if(response.status){
        req.session.admin=response.admin
        req.session.adminlogged=true
        res.redirect('/admin')
       }else{
         req.session.loginErr=true
         res.redirect('/admin/login')
       }
       
   })
})

router.get('/logout',(req,res)=>{
   req.session.destroy()
   res.redirect('/admin')
})

router.get('/users',requirelogin,(req,res)=>{
   admin.getallUsers().then(async(users)=>{
     await Promise.all(users.map(async(user)=>{
         user.order= await admin.getUserorders(user._id)
      }))
      res.render('admin/users',{admin:true , user:req.session.admin , users})
   })
})

router.get('/view-orders/:id',(req,res)=>{
    adminprivileage.getOrderDetails(req.params.id).then((orders)=>{
       res.render('admin/view-orders',{orders, admin:true ,user:req.session.admin})
    })
})

router.get('/view-placed-order/:id',async(req,res)=>{
   adminprivileage.getplacedOrderdetails(req.params.id).then((response)=>{
       res.render('admin/view-placed-orders',{ user: req.session.admin , products : response , admin:true})
   })
})

router.get('/allorders',requirelogin,(req,res)=>{
   admin.getAllorders().then((orders)=>{
     res.render('admin/allorders',{orders,admin:true,user:req.session.admin})
   })
})

router.post('/update-status',(req,res)=>{
   admin.updateStatus(req.body).then(()=>{
       res.json({value:true})
   })
})

module.exports = router;
