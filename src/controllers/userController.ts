import { RequestHandler } from 'express'
import { isValidObjectId } from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User'
import { sendAdminWelcome, sendForgotPassEmail, sendUserBannedEmail, sendUserNoBannedEmail } from './mailController'
const bcrypt=require('bcryptjs')
const jwt = require('jsonwebtoken');
import mongoose from 'mongoose'
const ObjectId = mongoose.Types.ObjectId
dotenv.config()

export const getUser: RequestHandler = async (req,res) => {
  try {
    // const users= await User.find().populate('orders',{
    //   user_id: 0,
    //   createdAt: 0,
    //   updatedAt: 0
    // })
    // const users= await User.find()
    const users = await User.aggregate([
      {
        $lookup:
        {
          from: "orders",
          let:
          {
            aliasOrder: "$orders"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id","$$aliasOrder"]
                }
              }
            }
          ],
          as: "orderList"
        }
      },
      {
        $lookup:
        {
          from: "reviews",
          let:
          {
            aliasReview: "$reviews_user"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id","$$aliasReview"]
                }
              }
            }
          ],
          as: "reviewList"
        }
      }  
    ])
    res.status(200).json(users)
  } catch (error) {
    console.log('Error in getUser',error)
  }
}
export const postUser: RequestHandler = async (req,res) =>  {
  try {
    const {name,lastName,userName,adress,password,mail,admin,img} = req.body
    // if( !name || !lastName || !userName || !mail) {res.send('Missing data required')}
    const userFind = await User.findOne({mail: mail})
    if(userFind === null){
      const user = new User(req.body)
      const saveUser = await user.save()
      res.json(saveUser)
      
    } else{
      // const order = await Order.findById(order_id);
      res.status(404).send('User already exist')
    }  
  }
   catch (error) {
    console.log('Error un postUser',error)
  } 
}

export const findUserById: RequestHandler = async (req,res) => {
  try {
    const {id} = req.params
    if(isValidObjectId(id)){
      const user = await User.aggregate([
        {
          $lookup:
          {
            from: "orders",
            let:
            {
              aliasOrder: "$orders"
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id","$$aliasOrder"]
                  }
                }
              }
            ],
            as: "orderList"
          }
        },
        {
          $lookup:
          {
            from: "reviews",
            let:
            {
              aliasReview: "$reviews_user"
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id","$$aliasReview"]
                  }
                }
              }
            ],
            as: "reviewUserList"
          }
        },{$match: {_id: new ObjectId(id)}},  
      ])
      user
      ? res.status(200).send(user)
      : res.status(404).send('User not found')
    }else{
      res.status(404).send('User not found')
    }
  } catch (error) {
    console.log('Error in find User By Id',error)
  }
}

export const deleteUser: RequestHandler = async (req,res) =>  {
  try{
    const {id} = req.params
    if(isValidObjectId(id)){
      const user = await User.findByIdAndDelete(id)
      user
      ? res.status(200).json({ msg: `Deleted User ${id}`})
      : res.status(404).send('User not found')
    }else{
      res.status(404).send('User not found')
    }
  }
  catch(error){
    console.log('Error in delete User',error)
  }
}

export const editUser: RequestHandler = async (req,res) =>  {
  try {
    const {id}= req.params
    if(isValidObjectId(id)){
      if(req.body.password){
        const salt =await bcrypt.genSalt(10)
        const passHash = await bcrypt.hash(req.body.password,salt)
        console.log(req.body.password);
        req.body.password = passHash
      }
      const user = await User.findByIdAndUpdate(id,req.body)
      user
      ? res.status(200).json(user)
      : res.status(404).send('User not found')
    }else{
      res.send('User not found')
    }
  } catch (error) {
    console.log('Error in Edit User',error)
  }
}

export const userRegister: RequestHandler = async (req,res) =>  {
  try {
    const { name, lastName, userName, mail ,password,adress,admin,baneado,img } = req.body
    if( !name || !lastName || !userName || !mail || !password || !adress){
      return res.json({msg: 'Please enter all data require'})
    }
    const findEmail = await User.find({ mail: mail})
    const findUserName = await User.find({userName: userName})
    if(findEmail.length>0){
      return res.status(404).send("User already exist with the given email")
    }
    if(findUserName.length>0){
      return res.status(404).send("User already exist with the given userName")
    }
    const user: any = new User(req.body)
    user.password = await user.encryptPassword(user.password)
    // console.log(user)
    await user.save()

    const token = await jwt.sign({id: user._id}, process.env.SECRET_KEY,{
      expiresIn: process.env.JWT_EXPIRE,
    })
    
    res.status(200).json({auth: true,token})
  } catch (error) {
    console.log('Error in Register User',error)
  }
}

export const userLogin: RequestHandler = async (req,res) => {
  try {
    const {mail,password} = req.body
    // console.log(req.body.password)
    if(!mail || !password){
      res.send('Enter all data required')
    }
    const find: any  = await User.find({mail: mail})
    if(find.length===0){
      return res.status(404).send("Email not found")
    }
    // console.log(find[0].password)
    // const comparePassword =await bcrypt.compare(password,find[0].password)
    const comparePassword =await find[0].validatePassword(password)
    if(!comparePassword){
      return res.status(404).send('Wrong credentials pass');
    }
    const token = await jwt.sign({id: find[0]._id}, process.env.SECRET_KEY,{
      expiresIn: process.env.JWT_EXPIRE,
    })
    res.status(200).json({auth: true,token})
  } catch (error) {
    console.log('Error in Login',error)
  }
}

export const userToken: RequestHandler= async(req: any,res)=>  {
  try {
    const user =await User.findById(req.userId, {password: 0}).populate('orders',{
      user_id: 0,
      createdAt: 0,
      updatedAt: 0
    })
  if(!user){
    return res.status(404).send('User not found')
  }
  res.json(user)
  } catch (error) {
    console.log('Error in Token ',error)
  }
}
export const banUser : RequestHandler = async (req, res) => {
  let {id} = req.params
  const update = {baneado: true}
  if(isValidObjectId(id)) {
    try {
      const user = await User.findByIdAndUpdate(id, update, {
        new: true
      })
      sendUserBannedEmail(user)
      res.send(user)
    } catch(err) {
      res.send(err)
    }
  }
  else {console.log(`didn't get id correctly`)}
}

export const noBanUser : RequestHandler = async (req, res) => {
  let {id} = req.params
  const update = {baneado: false}
  if(isValidObjectId(id)) {
    try {
      const user = await User.findByIdAndUpdate(id, update, {
        new: true
      })
      sendUserNoBannedEmail(user)
      res.send(user)
    } catch(err) {
      res.send(err)
    }
  }
  else {console.log(`didn't get id correctly`)}
}

export const setUserAsAdmin : RequestHandler = async (req, res) => {
  let {id} = req.params
  const update = {admin: true}
  if(isValidObjectId(id)) {
    try{
      const user = await User.findByIdAndUpdate(id, update, {
        new: true
      })
      sendAdminWelcome(user)
      res.send(user)
    } catch(err) {
      res.send(err)
    }
  } else {
    console.log(`didn't get id correctly`)
  }
}

export const setNewPass : RequestHandler = async (req, res) => {
  let {mail} = req.params
  try {
    const userFind = await User.findOne({mail: mail})
    if(userFind) {
      let text = `http://localhost:3000/recupera/${userFind._id}`
      sendForgotPassEmail(mail, text)
      res.send({message: 'Hemos enviado un link de recuperación a tu correo electrónico'})
    } 
    else{res.send('user not found')}
    
  } catch (error) {
    console.log(error)
    res.send(error)
  }

}





