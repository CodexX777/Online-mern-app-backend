const mongoose=require('mongoose');

const Schema=mongoose.Schema;
const uniqueValidator=require('mongoose-unique-validator');

const userSchema=new Schema({
    name: {type:String, required:true},
    phoneNo: {type:Number, required:true, minlength:10},
    address:{type:String, required:true},
    email: {type:String, required:true,unique:true},
    password: {type:String , required:true, minlength:6},
    cart: [{type:mongoose.Types.ObjectId, required:true,ref:'Product'}],
    orders: [{type:mongoose.Types.ObjectId, required:true,ref:'Product'}]
});

userSchema.plugin(uniqueValidator);

module.exports=mongoose.model('User',userSchema);
 