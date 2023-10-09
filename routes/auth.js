/**
 * auth.js uses bcrypt and salt to encode passwords
 * 
 * This router defines these routes:
 *  /signin (post)
 *  /login (get and post)
 *  /logout (get)
 * 
 * When a user logs in or signs in, this code adds their user name and
 * user object to the req.session to use in the app.js controller, while also 
 * setting the res.locals properties to use in the view folder
 *  res.locals.loggedIn
 *  res.locals.username
 *  res.locals.user
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const User = require('../models/User')

// Middleware to log a request being looked at and processed
router.use(function(req, res, next) {
    console.log(`${req.method} ${req.url} ${new Date()}`);
    next();
});

router.use((req,res,next) => {
    if (req.session.username) {
        res.locals.loggedIn = true
        res.locals.username = req.session.username
        res.locals.user = req.session.user
    } else {
        res.locals.loggedIn = false
        res.locals.username = null
        res.locals.user = null
    }
    next()
})

router.get("/login", (req,res) => {
    res.render("login")
})

router.post('/login', 
    async (req, res, next) => {
        try {
            const {username,password} = req.body
            const user = await User.findOne({username:username})
            if (user == null) {
                console.log("User not found. Please try again.")
                res.redirect('/login')
                return
            }
            const isMatch = await bcrypt.compare(password,user.password);
            if (isMatch) {
                req.session.username = username
                req.session.user = user
                res.redirect('/')
            } else {
                req.session.username = null
                req.session.user = null
                console.log("Username/Password do not match. Please try again.")
                res.redirect('/login')
            }
        } catch(e) {
            next(e)
        }

    })

router.post('/signup', 
    async (req, res, next) => {
        try {
            const {username,password,password2} = req.body
            if (password != password2){
                console.log("Passwords do not match. Please try again.")
                res.redirect('/login')
            } else {
                const encrypted = await bcrypt.hash(password,saltRounds);

                // Checks if the username is already taken
                const duplicates = await User.find({username})

                if (duplicates.length>0){
                    res.send("username has already been taken. Please go back and choose another one.")
                } else {
                    const user = new User(
                        {username:username,
                         password:encrypted,
                        })
                    
                    await user.save()
                    req.session.username = user.username
                    req.session.user = user
                    res.redirect('/')
                }
            }
        } catch(e){
            next(e)
        }
    })

router.get('/logout', (req,res) => {
    req.session.destroy()
    res.redirect('/');
})

module.exports = router;