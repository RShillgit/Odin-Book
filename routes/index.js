var express = require('express');
var router = express.Router();
const passport = require('passport');
const User = require('../models/user');
const { genPassword, validatePassword } = require('../utils/passwordUtils');
const jwtUtils = require('../utils/jwtUtils');

/*
* ------------------ HOME ------------------ 
*/
router.get('/', 
  passport.authenticate('jwt', {session: false}), 
  (req, res) => {
    const token = req.headers.authorization;
    const userToken = jwtUtils.jwtVerify(token);
    return res.status(200).json({auth: req.isAuthenticated(), userToken: userToken});
  },
  (err, req, res) => {
    return res.status(401).json({err, auth: req.isAuthenticated()});
  }
);

/*
* ------------------ REGISTER ------------------ 
*/
router.get('/register', (req, res, next) => {
  res.render('register');
})
router.post('/register', (req, res, next) => {

  // Check if passwords match
  if (req.body.password !== req.body.confirmPassword) {
    return res.json('Passwords Do Not Match')
  }

  // Check if username already exists
  User.findOne({ username: req.body.username })
    .then((user) => {

      // Username already exists
      if (user) {
        return res.json('Username already exists')
      }

      const saltHash = genPassword(req.body.password);

      const salt = saltHash.salt;
      const hash = saltHash.hash;

      // Create user with salt and hash
      const newUser = new User({
          username: req.body.username,
          name: `${req.body.firstName} ${req.body.lastName}`,
          hash: hash,
          salt: salt,
      })
      newUser.save()
        .then(result => res.json(result))
        .catch(err => res.json(err))

    })
    .catch(err => res.json(err))
})

/*
* ------------------ LOGIN ------------------ 
*/

router.get('/login', 
  passport.authenticate('jwt', {session: false}), 
  (req, res) => {
    return res.status(200).json({auth: req.isAuthenticated()});
  },
  (err, req, res) => {
    return res.status(401).json({err, auth: req.isAuthenticated()});
  }
)

/* LOCAL STRATEGY LOGIN
router.post('/login', passport.authenticate('local', 
  {
    failWithError: true,
    passReqToCallback: true
  }), 
  (req, res) => {
    return res.status(200).json({auth: req.isAuthenticated()});
  },
  (err, req, res, next) => {
    return res.status(401).json({
      auth: req.isAuthenticated(),
    });
  }
)
*/

// JWT Login
router.post('/login', (req, res, next) => {
    // Look for user in DB
    User.findOne({ username: req.body.username })
    .then((user) => {

      // If no user send error
      if (!user) {
        return res.status(401).json({success: false, error_message: "Could not find user"});
      }

      // Check if password is valid
      const isValid = validatePassword(req.body.password, user.hash, user.salt);

      // If password is valid send success
      if (isValid) {
        const tokenObject = jwtUtils.issueJWT(user);

        res.cookie('token', tokenObject.token); // Send token as cookie for the front end to use
        return res.status(200).json({success: true, user: user, token: tokenObject.token, expiresIn: tokenObject.expires});
      } 
      // If password is invalid send error message
      else {
        return res.status(401).json({success: false, error_message: "Invalid Username/Password Combination"})
      }
    })
})

/*
* ------------------ FACEBOOK ------------------ 
*/
/*
router.get('/auth/facebook', passport.authenticate('facebook-token'), 
  (req, res, next) => {
    console.log(req.user)
  }
);
*/
router.get('/auth/facebook', passport.authenticate('facebook' , { session: false, scope : ['email'] }));
router.get("/auth/facebook/callback", passport.authenticate("facebook", {
  session: false,
}), 
  (req, res, next) => {

    // Find the user with this facebook id and get the jwtoken to set as a cookie
    User.findOne({ fbID: req.user.id })
      .then (user => {
        if (user) {
          const token = user.jwtoken;
          res.cookie('token', token);
          return res.status(200).json({success: true, token: token});
        }
        else {
          return res.status(401).json("User Does Not Exist");
        }
      })
      .catch(err => {
        res.json(err);
      })
  }
);

/*
* ------------------ ERROR ------------------ 
*/
router.get('/error', isLoggedIn, (req,res) => {
  res.send("Error");
});

/*
* ------------------ LOGOUT ------------------ 
*/
router.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.clearCookie("token"); // Delete token from cookies
    res.status(200).json('User Logged Out');
  });
})

// Function to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json('Unauthenticated')
}

module.exports = router;
