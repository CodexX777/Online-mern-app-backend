const mongoose=require('mongoose');

const Schema=mongoose.Schema;
const uniqueValidator=require('mongoose-unique-validator');

const sellerSchema=new Schema({
    name: {type:String, required:true},
    phoneNo: {type:Number, required:true,minlength:10},
    email: {type:String, required:true,unique:true},
    password: {type:String , required:true, minlength:6},
    products: [{type:mongoose.Types.ObjectId, required:true,ref:'Product'}],
    GstNo: {type:Number,required:true,minlength:15}
});

sellerSchema.plugin(uniqueValidator);

module.exports=mongoose.model("Seller",sellerSchema);
 