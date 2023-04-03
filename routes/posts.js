var express = require('express');
var router = express.Router();
const passport = require('passport');
const User = require('../models/user');
const Post = require('../models/post');
const jwtutils = require('../utils/jwtUtils');

/* -------------- /posts -------------- */
// GET POSTS
router.get('/', (req, res, next) => {
    res.json('redirect to home')
})
// CREATE POST
router.post('/', 
    // Successful Authentication
    (req, res, next) => {

        // Create new post
        const newPost = new Post({
            author: req.user._id,
            text: req.body.text,
            timestamp: req.body.timestamp
        })
        newPost.save()
            // Successfully created post
            .then(post => {

                // Update users posts array
                let updatedPostsArray = [...req.user.posts];
                updatedPostsArray.push(post)

                User.findByIdAndUpdate(req.user._id, {
                    'posts': updatedPostsArray
                })
                // Successfully updated user's posts array
                .then(() => {
                    return res.status(200).json({ success: true, msg: 'Post Created Successfully', newPost: post });
                })
                // Unsuccessfully updated user's posts array
                .catch(err => {
                    return res.status(401).json({success: false, err});
                })  
            })
            // Unsuccessfully created post
            .catch(err => {
                return res.status(401).json({success: false, err});
            })
    },
    // Unsuccessful Authentication
    (err, req, res) => {
      return res.status(401).json({err, auth: req.isAuthenticated()});
    }
)

/* -------------- /posts/:id -------------- */
// GET INDIVIDUAL POST
router.get('/:id', 
    // Successful Authentication
    (req, res, next) => {

        // Get the selected post 
        Post.findOne({ _id: req.params.id })
            .populate('author')
            // TODO: Populate comments

            // Successfully found post
            .then(selectedPost => {

                // Get and verify token
                const token = req.headers.authorization;
                const userToken = jwtutils.jwtVerify(token);

                // Send response
                return res.status(200).json({success: true, auth: req.isAuthenticated(), userToken: userToken, selectedPost: selectedPost});
            })

            // Unsuccessfully found post
            .catch(err => {
                return res.status(401).json({success: false, err: err});
            })
    },
    // Unsuccessful Authentication
    (err, req, res) => {
        return res.status(401).json({err, auth: req.isAuthenticated()});
    }
)
// COMMENT ON POST
router.post('/:id', (req, res, next) => {
    res.json(`Comment on post ${req.params.id}`)
})
// LIKE/UNLIKE/UPDATE INDIVIDUAL POST
router.put('/:id', 
    // Successful Authentication
    (req, res, next) => {

        // req.body.requestType is either 'like', or 'update'
        console.log(req.body.requestType);

        // If it is a like request
        if (req.body.requestType === 'like') {

            let likesArray = req.body.selectedPost.likes

            // If the user is already in the array, remomve them
            if (likesArray.includes(req.user._id.toString())) {
                
                likesArray = likesArray.filter(like => {
                    return like !== req.user._id.toString();
                })
            }
            // If the user is not in the array, add them
            else {
                likesArray.push(req.user._id)
            }

            // Update the posts likes array
            Post.findOneAndUpdate ({_id: req.body.selectedPost._id}, {
                likes: likesArray
            })
            // Successfully added the user to the likes array
            .then(() => {
                return res.status(200).json({success: true, newLikesArray: likesArray });
            })
            // Unsuccessfully added the user to the likes array
            .catch(err => {
                return res.status(401).json({success: false, err: err});
            })
        }
        // Else If it is an update request
        else if (req.body.requestType === 'update') {

        }
        // Else send error
        else {
            return res.status(401).json({success: false, err: 'No requestType specified'});
        }
    },
    // Unsuccessful Authentication
    (err, req, res) => {
        return res.status(401).json({err, auth: req.isAuthenticated()});
    }
)
// DELETE INDIVIDUAL POST
router.delete('/:id', (req, res, next) => {
    res.json(`Delete Post ${req.params.id}`)
})

module.exports = router;
