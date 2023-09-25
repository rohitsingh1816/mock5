const express = require("express")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const { UserModel } = require("../model/user.model")
const BlacklistedTokenModel  =  require("../model/blacklist.model")

require('dotenv').config()


const UserRouter = express.Router()

UserRouter.post("/signup", async (req, res) => {

    try {

        const { name, email, password,confirmpassword } = req.body;

        if (password !== confirmpassword) {
            return res.status(400).json({ msg: 'passwords not matching' });
        }

        // checking present or not
        
        const UserExits = await UserModel.findOne({ email })

        if (UserExits) {
            return res.status(201).json({ msg: "User already Present" })
        }

        let  confirmhashedPassword = await bcrypt.hash(confirmpassword, 10);

        bcrypt.hash(password, 7, async (err, hash) => {

            if (err) {
                res.send({ "msg": "Something is Wrong", "err": err.message })
            } else {

                const user = new UserModel({ name, email, password: hash, confirmpassword:confirmhashedPassword })
                await user.save()
                res.send({ "msg": " New User has been registered" })
            }
        })
    } catch (err) {
        console.error('Eror registering user:', err);
        res.status(500).json({ error: 'Internal error' });
    }
})

UserRouter.post("/login", async (req, res) => {

    try {
        const { email, password } = req.body

        const user = await UserModel.findOne({ email })
        console.log(user)

        if (!user) {
            return res.status(401).json({ message: "No User found" })
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password)

        if (!isPasswordMatch) {
            return res.status(201).json({ message: "Invalid username Or password" })
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);


        res.status(200).json({ msg: "Login Successful", token: token });

    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ err: 'Internal error' });
    }
})


UserRouter.post("/logout", async (req, res) => {
  try {
    
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found in db" });
    }

    
    const isBlacklisted = await BlacklistedTokenModel.exists({ token: token });

    if (isBlacklisted) {
      return res.status(401).json({ message: "Token has invalidated" });
    }

    
    const blacklistedToken = new BlacklistedTokenModel({ token: token });
    await blacklistedToken.save();

    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    console.error("Error logging out:", err);
    res.status(500).json({ error: "Internal error" });
  }
});






module.exports = UserRouter